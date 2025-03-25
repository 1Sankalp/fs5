import { NextResponse } from 'next/server';
import { jobs, Job } from '../../route';
import fs from 'fs';
import path from 'path';
import { extractEmails } from '@/lib/emailExtractor';

// Storage file path
const storageFile = path.join(process.cwd(), 'data', 'jobs.json');

// Helper function to save jobs to storage
function saveJobs() {
  try {
    fs.writeFileSync(storageFile, JSON.stringify(jobs, null, 2));
  } catch (error) {
    console.error('Error saving jobs to storage:', error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if the jobs array is empty (server restarted)
    if (jobs.length === 0) {
      return NextResponse.json(
        { error: 'Cannot process job. Server has been restarted. Please create a new job.' },
        { status: 400 }
      );
    }

    const jobIndex = jobs.findIndex((job) => job.id === params.id);
    
    if (jobIndex === -1) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const job = jobs[jobIndex];
    
    // Only process pending jobs
    if (job.status !== 'pending') {
      return NextResponse.json(
        { error: 'Job is already processing or completed' },
        { status: 400 }
      );
    }

    // Update job status
    job.status = 'processing';
    job.progress = 0;
    job.emails = [];
    job.startTime = Date.now();
    job.estimatedCompletionTime = calculateEstimatedCompletionTime(job.totalUrls);
    
    // Save job status change to file
    saveJobs();

    // Start processing in the background
    processJob(job);

    return NextResponse.json({ message: 'Job processing started' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process job' },
      { status: 500 }
    );
  }
}

// Calculate estimated completion time based on number of URLs
function calculateEstimatedCompletionTime(totalUrls: number): number {
  // We add 1 second per URL + a small buffer (avg processing time)
  const processingTimePerUrl = 1000; // 1 second per URL
  const buffer = 5000; // 5 second buffer
  return Date.now() + (totalUrls * processingTimePerUrl) + buffer;
}

// Update estimated completion time based on current progress
function updateEstimatedCompletionTime(job: Job, processedUrls: number): void {
  // Use current time if startTime is undefined
  const startTime = job.startTime || Date.now();
  const elapsedTime = Date.now() - startTime;
  const remainingUrls = job.totalUrls - processedUrls;
  
  if (processedUrls > 0 && remainingUrls > 0) {
    // Calculate average time per URL based on current performance
    const avgTimePerUrl = elapsedTime / processedUrls;
    // Estimate remaining time
    const remainingTime = avgTimePerUrl * remainingUrls;
    // Update estimated completion time
    job.estimatedCompletionTime = Date.now() + remainingTime;
  }
}

async function processJob(job: Job) {
  const emails = new Set<string>();
  
  for (let i = 0; i < job.urls.length; i++) {
    try {
      const url = job.urls[i];
      // Use the improved email extractor
      const extractedEmails = await extractEmails(url);
      
      // Add unique emails to the set
      extractedEmails.forEach(email => emails.add(email));
      
      // Update job progress
      job.processedUrls = i + 1;
      job.progress = Math.round((job.processedUrls / job.totalUrls) * 100);
      job.emailsFound = emails.size;
      job.emails = Array.from(emails);
      
      // Update estimated completion time
      updateEstimatedCompletionTime(job, job.processedUrls);
      
      // Save job updates to file periodically (every 5 URLs)
      if (i % 5 === 0 || i === job.urls.length - 1) {
        saveJobs();
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error processing URL ${job.urls[i]}:`, error);
      // Continue with next URL
    }
  }
  
  // Mark job as completed
  job.status = 'completed';
  job.progress = 100;
  job.estimatedCompletionTime = Date.now(); // Set to current time since it's complete
  
  // Save final job state to file
  saveJobs();
} 