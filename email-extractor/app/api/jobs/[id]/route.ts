import { NextResponse } from 'next/server';
import { jobs } from '../route';
import fs from 'fs';
import path from 'path';

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

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if the jobs array is empty (server restarted)
    if (jobs.length === 0) {
      // For demo purposes, create a mock job with the requested ID
      return NextResponse.json({
        id: params.id,
        name: "Job " + params.id,
        status: "pending",
        progress: 0,
        totalUrls: 30,
        processedUrls: 0,
        emailsFound: 0,
        createdAt: new Date().toISOString(),
        urls: ["https://example.com"],
        emails: []
      });
    }

    const job = jobs.find((job) => job.id === params.id);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(job);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const jobIndex = jobs.findIndex((job) => job.id === params.id);
    
    if (jobIndex === -1) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    // Remove the job from the array
    const removedJob = jobs.splice(jobIndex, 1)[0];
    
    // Save updated jobs to storage
    saveJobs();
    
    return NextResponse.json({ 
      message: `Job "${removedJob.name}" successfully deleted`,
      job: removedJob
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete job' },
      { status: 500 }
    );
  }
} 