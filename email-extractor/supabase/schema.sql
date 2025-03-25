-- Run this SQL in your Supabase SQL editor to set up the database schema

-- Create the jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_urls INTEGER NOT NULL DEFAULT 0,
  processed_urls INTEGER NOT NULL DEFAULT 0,
  urls TEXT[] NOT NULL DEFAULT '{}',
  emails JSONB DEFAULT '[]'::JSONB,
  current_batch INTEGER DEFAULT 0,
  last_processed_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id TEXT NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs (user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs (created_at);

-- Row Level Security (RLS) policies
-- Enable RLS on the jobs table
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to see only their own jobs
CREATE POLICY "Users can view their own jobs" ON jobs
  FOR SELECT USING (auth.uid()::TEXT = user_id OR user_id = CURRENT_USER);

-- Create policy for authenticated users to insert their own jobs
CREATE POLICY "Users can insert their own jobs" ON jobs
  FOR INSERT WITH CHECK (auth.uid()::TEXT = user_id OR user_id = CURRENT_USER);

-- Create policy for authenticated users to update their own jobs
CREATE POLICY "Users can update their own jobs" ON jobs
  FOR UPDATE USING (auth.uid()::TEXT = user_id OR user_id = CURRENT_USER);

-- Create policy for authenticated users to delete their own jobs
CREATE POLICY "Users can delete their own jobs" ON jobs
  FOR DELETE USING (auth.uid()::TEXT = user_id OR user_id = CURRENT_USER); 