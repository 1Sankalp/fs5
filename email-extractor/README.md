# Email Extractor

A web application that automatically extracts email addresses from a list of websites by uploading a Google Sheet. Built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

- Secure authentication for predefined users
- Public Google Sheet integration for website URL input
- Automated email extraction from multiple website pages
- Real-time job tracking and progress monitoring
- Support for major email domains
- Copy results to clipboard functionality

## Prerequisites

- Node.js 18 or later
- Supabase account
- Vercel account (for deployment)

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd email-extractor
```

2. Install dependencies:
```bash
npm install
```

3. Create a Supabase project and set up the database:
   - Create a new project in Supabase
   - Create a `jobs` table with the following schema:
     ```sql
     create table jobs (
       id uuid default uuid_generate_v4() primary key,
       created_at timestamp with time zone default timezone('utc'::text, now()) not null,
       name text not null,
       status text not null,
       progress integer default 0,
       total_urls integer default 0,
       processed_urls integer default 0,
       user_id uuid references auth.users not null,
       spreadsheet_url text not null,
       url_column text not null,
       results jsonb default '[]'::jsonb
     );
     ```

4. Set up environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Fill in your Supabase credentials

5. Run the development server:
```bash
npm run dev
```

## Usage

1. Access the application at `http://localhost:3000`
2. Log in with your predefined credentials
3. Create a new job by providing a public Google Sheet URL containing website URLs
   - Make sure your Google Sheet is set to "Anyone with the link can view"
   - The sheet should have a column containing website URLs
4. Monitor job progress in the dashboard
5. View and copy extracted email addresses when the job is complete

## Email Extraction Process

The application searches for email addresses in the following locations:
- Contact pages (`/contact`, `/contact-us`, etc.)
- About pages (`/about`, `/about-us`)
- Main page content
- Mailto links

Supported email domains:
- Gmail
- Yahoo
- Outlook
- Hotmail
- AOL
- iCloud
- ProtonMail
- Mail.com
- Zoho
- Yandex
- GMX

## Deployment

1. Push your code to a Git repository
2. Connect your repository to Vercel
3. Configure environment variables in Vercel
4. Deploy the application

## Security Considerations

- Rate limiting is implemented to prevent abuse
- Only predefined users can access the application
- Secure authentication through Supabase
- Protected API routes
- Input validation and sanitization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License 