import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { EmailExtractor } from '@/lib/emailExtractor';

// Process 5 URLs per batch to stay within serverless time limits
const BATCH_SIZE = 5;

export async function GET() {
  try {
    // Find jobs that need processing
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .in('status', ['pending', 'processing'])
      .order('last_processed_timestamp', { ascending: true })
      .limit(3); // Process 3 jobs concurrently
    
    if (error) {
      console.error('Error fetching jobs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: 'No jobs to process' });
    }
    
    const results = [];
    
    for (const job of jobs) {
      // Get the next batch of URLs
      const startIdx = job.current_batch * BATCH_SIZE;
      const batchUrls = job.urls.slice(startIdx, startIdx + BATCH_SIZE);
      
      if (batchUrls.length === 0) {
        // Job is completed
        const { error: updateError } = await supabase
          .from('jobs')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);
          
        if (updateError) {
          console.error(`Error updating job ${job.id} status:`, updateError);
        }
        
        results.push({ jobId: job.id, status: 'completed' });
        continue;
      }
      
      // Process this batch
      try {
        const allEmailsInBatch = [];
        
        for (const url of batchUrls) {
          try {
            // Use the email extraction logic with proper instantiation
            const extractor = new EmailExtractor(url);
            const extractedEmails = await extractor.extractEmails();
            allEmailsInBatch.push(...extractedEmails);
            
            // Update progress after each URL
            const { error: progressError } = await supabase
              .from('jobs')
              .update({ 
                processed_urls: job.processed_urls + 1,
                status: 'processing',
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
        
        // Save emails from this batch
        const { error: batchError } = await supabase
          .from('jobs')
          .update({
            emails: [...(job.emails || []), ...allEmailsInBatch],
            current_batch: job.current_batch + 1,
            last_processed_timestamp: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id);
          
        if (batchError) {
          console.error(`Error saving batch results for job ${job.id}:`, batchError);
        }
        
        results.push({ 
          jobId: job.id, 
          status: 'processing', 
          processedInBatch: batchUrls.length, 
          emailsFound: allEmailsInBatch.length 
        });
      } catch (jobError) {
        console.error(`Error processing job ${job.id}:`, jobError);
        
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
        
        results.push({ jobId: job.id, status: 'failed' });
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      processed: results.length,
      results 
    });
  } catch (error) {
    console.error('Batch processing error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 