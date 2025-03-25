import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data: job, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (error) {
      console.error('Error fetching job:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(job);
  } catch (error: any) {
    console.error('Error in GET /api/jobs/[id]:', error);
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
    const { error, count } = await supabase
      .from('jobs')
      .delete()
      .eq('id', params.id)
      .select('count');
    
    if (error) {
      console.error('Error deleting job:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (count === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      message: `Job successfully deleted`,
      id: params.id
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/jobs/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete job' },
      { status: 500 }
    );
  }
} 