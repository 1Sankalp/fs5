import { NextResponse, NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { EmailExtractor } from '@/lib/emailExtractor';
import type { Job } from '@/lib/types';

// Corrected: Adjusting the function signature for Next.js API routes
export async function POST(
  request: NextRequest,
  context: { params: { id: string } } // Corrected context type here!
) {
  try {
    const jobId = context.params.id;

    // Get job from Supabase
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (jobError) {
      console.error('Error fetching job:', jobError);
      return NextResponse.json({ error: jobError.message }, { status: 500 });
    }
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    // Only process pending jobs
    if (job.status !== 'pending') {
      return NextResponse.json(
        { error: 'Job is already processing or completed' },
        { status: 400 }
      );
    }

    // Update job status to processing
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
        last_processed_timestamp: new Date().toISOString()
      })
      .eq('id', jobId);
    
    if (updateError) {
      console.error('Error updating job status:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Start processing in the background (in real production, this would be a background job)
    processJob(job);

    return NextResponse.json({ 
      message: 'Job processing started',
      jobId
    });
  } catch (error: any) {
    console.error('Error in POST /api/jobs/[id]/process:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process job' },
      { status: 500 }
    );
  }
}

async function processJob(job: Job) {
  const emails = new Set<string>();
  
  try {
    // Process URLs in batches of 5
    const BATCH_SIZE = 5;
    const totalBatches = Math.ceil(job.urls.length / BATCH_SIZE);
    
    for (let batch = 0; batch < totalBatches; batch++) {
      const startIdx = batch * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, job.urls.length);
      const batchUrls = job.urls.slice(startIdx, endIdx);
      
      const batchEmails: string[] = [];
      
      // Process each URL in the batch
      for (const url of batchUrls) {
        try {
          // Use the email extractor
          const extractor = new EmailExtractor(url);
          const extractedEmails = await extractor.extractEmails();
          batchEmails.push(...extractedEmails);
          
          // Update processed URLs count
          const { error: progressError } = await supabase
            .from('jobs')
            .update({ 
              processed_urls: job.processed_urls + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id);
            
          if (progressError) {
            console.error(`Error updating progress for job ${job.id}:`, progressError);
          }
        } catch (urlError) {
          console.error(`Error processing URL ${url} in job ${job.id}:`, urlError);
          // Continue with next URL even if one fails
        }
      }
      
      // Add unique emails to the set
      batchEmails.forEach(email => emails.add(email));
      
      // Update the job with new emails
      const { error: updateError } = await supabase
        .from('jobs')
        .update({
          emails: Array.from(emails),
          current_batch: batch + 1,
          last_processed_timestamp: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);
        
      if (updateError) {
        console.error(`Error updating emails for job ${job.id}:`, updateError);
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Mark job as completed
    const { error: completionError } = await supabase
      .from('jobs')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);
      
    if (completionError) {
      console.error(`Error marking job ${job.id} as completed:`, completionError);
    }
  } catch (error) {
    console.error(`Error processing job ${job.id}:`, error);
    
    // Mark job as failed
    const { error: failError } = await supabase
      .from('jobs')
      .update({
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);
      
    if (failError) {
      console.error(`Error marking job ${job.id} as failed:`, failError);
    }
  }
}