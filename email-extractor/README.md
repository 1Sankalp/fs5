# Email Extractor

A Next.js application that extracts email addresses from websites. This tool allows you to:

1. Upload a Google Sheet with website URLs
2. Select which column contains the URLs
3. Create extraction jobs to find email addresses
4. Monitor extraction progress in real-time
5. View and copy found email addresses

## Features

- **Authentication**: Simple username/password authentication
- **Dashboard**: View and manage extraction jobs
- **Email Extraction**: Advanced extraction techniques to find emails from:
  - Visible text
  - Mailto links
  - Contact pages
  - Script tags and JSON data
  - Meta tags
  - Obfuscated emails
- **Intelligent Deduplication**: Removes duplicate emails and prioritizes domain-specific addresses
- **Realtime Updates**: Monitoring of job progress and estimated completion time

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/email-extractor.git
cd email-extractor
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file with the following variables:

```
# No special environment variables required
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Usage

1. Log in using the default credentials:
   - Username: admin
   - Password: password

2. Click "New Job" to create a new extraction job
3. Enter the Google Sheet URL (must be accessible via link)
4. Select the column containing website URLs
5. Enter a name for the job and click "Create Job"
6. View job details and click "Start Processing" to begin extraction
7. Monitor progress and view results
8. Copy emails to clipboard when extraction is complete

## License

MIT 