import { NextResponse } from 'next/server';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Extract spreadsheet ID from URL
function getSpreadsheetId(url: string) {
  try {
    const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!matches) throw new Error('Invalid Google Sheet URL');
    return matches[1];
  } catch (error) {
    throw new Error('Invalid Google Sheet URL');
  }
}

// Define the Job interface for type safety
export interface Job {
  id: string;
  name: string;
  sheetUrl: string;
  column: string;
  urls: string[];
  totalUrls: number;
  processedUrls: number;
  emailsFound: number;
  status: string;
  progress: number;
  createdAt: string;
  emails?: string[];
  startTime?: number;
  estimatedCompletionTime?: number;
}

// Storage file path
const storageDir = path.join(process.cwd(), 'data');
const storageFile = path.join(storageDir, 'jobs.json');

// Ensure storage directory exists
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

// Load jobs from storage or initialize empty array
let loadedJobs: Job[] = [];
try {
  if (fs.existsSync(storageFile)) {
    const data = fs.readFileSync(storageFile, 'utf8');
    loadedJobs = JSON.parse(data);
    console.log(`Loaded ${loadedJobs.length} jobs from storage`);
  }
} catch (error) {
  console.error('Error loading jobs from storage:', error);
}

// In-memory storage for jobs (initialized from file if available)
export const jobs: Job[] = loadedJobs;

// Helper function to save jobs to storage
function saveJobs() {
  try {
    fs.writeFileSync(storageFile, JSON.stringify(jobs, null, 2));
  } catch (error) {
    console.error('Error saving jobs to storage:', error);
  }
}

export async function GET() {
  try {
    return NextResponse.json(jobs);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name, sheetUrl, column } = await request.json();
    
    if (!name || !sheetUrl || !column) {
      return NextResponse.json(
        { error: 'Name, sheet URL and column are required' },
        { status: 400 }
      );
    }

    const spreadsheetId = getSpreadsheetId(sheetUrl);
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
    
    // Fetch the sheet data
    const response = await axios.get(csvUrl);
    const rows = response.data.split('\n');
    const headers = rows[0].split(',').map((col: string) => col.trim().replace(/^"|"$/g, ''));
    const columnIndex = headers.indexOf(column);
    
    if (columnIndex === -1) {
      throw new Error('Column not found');
    }

    // Extract URLs
    const urls = rows.slice(1)
      .map((row: string) => {
        const cells = row.split(',');
        const cell = cells[columnIndex]?.toLowerCase() || '';
        return cell.includes('http') || cell.includes('www.') ? cells[columnIndex] : null;
      })
      .filter(Boolean);

    // Create job
    const job: Job = {
      id: Date.now().toString(),
      name,
      sheetUrl,
      column,
      urls,
      totalUrls: urls.length,
      processedUrls: 0,
      emailsFound: 0,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString()
    };

    // Store job in memory
    jobs.push(job);
    
    // Save jobs to file
    saveJobs();

    return NextResponse.json(job);
  } catch (error: any) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create job' },
      { status: 500 }
    );
  }
} 