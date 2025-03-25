# Email Extractor

A Next.js application for extracting email addresses from websites using batch processing. This application is designed to process jobs even when users are not actively using the application.

## Features

- Extract emails from websites in batches
- Process websites in the background with cron jobs
- Modern UI with Tailwind CSS
- Jobs persist even when you close the application
- Dashboard for tracking job progress
- Export found emails to CSV

## Setup Instructions

### 1. Set Up Supabase

1. Create a free account at [Supabase](https://supabase.com)
2. Create a new project
3. Navigate to the SQL Editor in your Supabase dashboard
4. Copy and paste the SQL from `supabase/schema.sql` and execute it
5. Go to the API settings and copy your URL and anon key
6. Add these to your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Set Up the Application

1. Install dependencies:
```
npm install
```

2. Start the development server:
```
npm run dev
```

3. Navigate to http://localhost:3000 in your browser

### 3. Set Up Cron Job

For persistent background processing, set up a free account at [cron-job.org](https://cron-job.org):

1. Sign up for a cron-job.org account
2. Add a new cronjob with the following settings:
   - Title: `Email Extractor Job Processor`
   - URL: `https://your-vercel-app.vercel.app/api/jobs/process-batch` (or `http://localhost:3000/api/jobs/process-batch` for local testing)
   - Execution schedule: Every 5 minutes
   - Timezone: Your preferred timezone
   - Notifications: On failure (optional)

### 4. Deploy to Vercel (Optional)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy
5. Update your cron-job.org URL to point to your Vercel deployment

## How It Works

1. **Job Creation**:
   - Users input a Google Sheet URL containing website URLs
   - The app allows selection of which column contains the URLs
   - A job is created and stored in Supabase

2. **Background Processing**:
   - The cron job calls the `/api/jobs/process-batch` endpoint every 5 minutes
   - Each call processes a small batch of URLs (5 at a time)
   - Progress is stored in Supabase

3. **Email Extraction**:
   - The app scrapes each website looking for email addresses
   - Emails are found in HTML content, mailto links, and contact pages
   - Results are stored in Supabase

## Architecture

- **Frontend**: Next.js with Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: Supabase (PostgreSQL)
- **Background Processing**: cron-job.org

## Troubleshooting

- **Job doesn't start**: Verify your cron job is properly set up and pointing to the correct URL
- **No emails found**: Check that the websites have publicly accessible emails and aren't behind login pages
- **Processing stops**: Verify your Supabase connection is active and your free tier limits haven't been exceeded

## License

MIT 