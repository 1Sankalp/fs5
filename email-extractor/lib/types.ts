export interface Job {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  total_urls: number;
  processed_urls: number;
  urls: string[];
  emails: string[];
  current_batch: number;
  last_processed_timestamp: string;
  user_id: string;
}

export interface User {
  id: string;
  username: string;
}

export interface Database {
  public: {
    Tables: {
      jobs: {
        Row: Job;
        Insert: Omit<Job, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Job, 'id' | 'created_at'>>;
      };
    };
  };
} 