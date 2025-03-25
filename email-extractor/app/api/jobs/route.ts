import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';

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

// GET /api/jobs - Get all jobs for the current user
export async function GET() {
  try {
    // Get user from cookie (using your existing auth)
    const cookieStore = cookies();
    const userCookie = cookieStore.get('user');
    
    if (!userCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let user;
    try {
      user = JSON.parse(userCookie.value);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    // Get jobs from Supabase
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id || user.username) // Support both Supabase auth and cookie auth
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching jobs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ jobs: data || [] });
  } catch (error) {
    console.error('Error in GET /api/jobs:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// POST /api/jobs - Create a new job
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { name, urls } = body;
    
    // Validate required fields
    if (!name || !urls || !Array.isArray(urls)) {
      return NextResponse.json({ 
        error: 'Invalid request - name and urls array are required' 
      }, { status: 400 });
    }
    
    // Get user from cookie
    const cookieStore = cookies();
    const userCookie = cookieStore.get('user');
    
    if (!userCookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let user;
    try {
      user = JSON.parse(userCookie.value);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    // Create job in Supabase
    const { data, error } = await supabase
      .from('jobs')
      .insert({
        name,
        urls,
        user_id: user.id || user.username, // Support both Supabase auth and cookie auth
        status: 'pending',
        total_urls: urls.length,
        processed_urls: 0,
        current_batch: 0,
        emails: [],
        last_processed_timestamp: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();
    
    if (error) {
      console.error('Error creating job:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      job: data?.[0],
      message: 'Job created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/jobs:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 