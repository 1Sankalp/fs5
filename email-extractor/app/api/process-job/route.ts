import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { extractEmailsFromSpreadsheet } from '@/lib/emailExtractor';

export async function POST(request: Request) {
  try {
    const { jobId } = await request.json();

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError) throw jobError;
    if (!job) throw new Error('Job not found');

    // Update job status to running
    await supabase
      .from('jobs')
      .update({ status: 'running' })
      .eq('id', jobId);

    // Process the spreadsheet
    const results = await extractEmailsFromSpreadsheet(
      job.spreadsheet_url,
      job.url_column
    );

    // Update job with results
    await supabase
      .from('jobs')
      .update({
        status: 'completed',
        progress: 100,
        processed_urls: results.length,
        total_urls: results.length,
        results,
      })
      .eq('id', jobId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error processing job:', error);

    // Update job status to failed
    if (jobId) {
      await supabase
        .from('jobs')
        .update({ status: 'failed' })
        .eq('id', jobId);
    }

    return NextResponse.json(
      { error: error.message || 'Failed to process job' },
      { status: 500 }
    );
  }
} 