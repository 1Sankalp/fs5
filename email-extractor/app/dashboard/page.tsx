'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/app/components/Button';
import Card from '@/app/components/Card';

export default function DashboardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [sheetUrl, setSheetUrl] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [urls, setUrls] = useState<string[]>([]);
  const [totalUrls, setTotalUrls] = useState(0);
  const [jobName, setJobName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSheetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Public Google Sheets export as CSV
      let url = sheetUrl;
      
      // Convert Google Sheets edit URL to CSV export URL
      if (url.includes('spreadsheets/d/')) {
        const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (matches && matches[1]) {
          const spreadsheetId = matches[1];
          // Use the public CSV export URL
          url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
        }
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Could not access the spreadsheet. Make sure it\'s accessible via public link.');
      }
      
      const csvContent = await response.text();
      const rows = csvContent.split('\n').map(row => row.split(',').map(cell => cell.trim()));
      
      if (rows.length > 0) {
        // Extract column headers
        const headers = rows[0];
        setColumns(headers);
        setStep(2);
      } else {
        throw new Error('Spreadsheet appears to be empty or has invalid format');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleColumnSelect = async (column: string) => {
    setIsLoading(true);
    setSelectedColumn(column);

    try {
      // Get column index
      const columnIndex = columns.findIndex(col => col === column);
      
      if (columnIndex === -1) {
        throw new Error('Selected column not found');
      }
      
      // Public Google Sheets export as CSV
      let url = sheetUrl;
      
      // Convert Google Sheets edit URL to CSV export URL
      if (url.includes('spreadsheets/d/')) {
        const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (matches && matches[1]) {
          const spreadsheetId = matches[1];
          // Use the public CSV export URL
          url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
        }
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Could not access the spreadsheet');
      }
      
      const csvContent = await response.text();
      const rows = csvContent.split('\n').map(row => row.split(',').map(cell => cell.trim()));
      
      // Extract URLs from the selected column (skip header row)
      const extractedUrls = rows.slice(1)
        .map(row => {
          if (row.length <= columnIndex) return null;
          
          let url = row[columnIndex].replace(/^"|"$/g, '').trim(); // Remove quotes
          if (!url) return null;
          
          // Ensure URL has http:// or https:// prefix
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
          }
          
          return url;
        })
        .filter(Boolean) as string[];
      
      setUrls(extractedUrls);
      setTotalUrls(extractedUrls.length);
      setStep(3);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: jobName,
          urls
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create job');
      }

      // Reset form
      setSheetUrl('');
      setColumns([]);
      setSelectedColumn('');
      setUrls([]);
      setTotalUrls(0);
      setJobName('');
      setStep(1);

      // Redirect to jobs page
      router.push('/dashboard/jobs');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Create Job</h1>

      <Card className="max-w-2xl mx-auto space-y-8">
        {step === 1 && (
          <form onSubmit={handleSheetSubmit} className="space-y-4">
            <div>
              <label htmlFor="sheet-url" className="block text-sm font-medium text-gray-700">
                Google Sheet URL
              </label>
              <p className="mt-1 text-sm text-gray-500">
                Paste the URL of your Google Sheet. Make sure it&apos;s accessible to anyone with the link.
              </p>
              <div className="mt-1">
                <input
                  type="url"
                  id="sheet-url"
                  name="sheet-url"
                  required
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full"
            >
              Load Columns
            </Button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Select URL Column</h3>
            <p className="text-sm text-gray-500">
              Which column contains your website URLs?
            </p>
            <div className="grid gap-3">
              {columns.map((column) => (
                <button
                  key={column}
                  onClick={() => handleColumnSelect(column)}
                  className={`text-left px-4 py-3 border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500`}
                >
                  {column}
                </button>
              ))}
            </div>
            <Button
              onClick={() => setStep(1)}
              variant="secondary"
              className="mt-4"
            >
              Back
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-md">
              <p className="text-sm text-blue-700">
                Found {totalUrls} websites in column &quot;{selectedColumn}&quot;
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="job-name" className="block text-sm font-medium text-gray-700">
                  Job Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="job-name"
                    id="job-name"
                    required
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Enter a name for this extraction job"
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setStep(2)}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  isLoading={isLoading}
                  className="flex-1"
                >
                  Create Job
                </Button>
              </div>
            </form>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </Card>
    </div>
  );
} 