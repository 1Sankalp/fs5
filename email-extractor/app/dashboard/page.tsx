'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/app/components/Button';
import Card from '@/app/components/Card';

export default function DashboardPage() {
  const router = useRouter();
  const [sheetUrl, setSheetUrl] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [totalUrls, setTotalUrls] = useState(0);
  const [jobName, setJobName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSheetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sheets/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch sheet columns');
      }

      const data = await response.json();
      setColumns(data.columns);
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
      const response = await fetch('/api/sheets/urls-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl, column })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to count URLs');
      }

      const data = await response.json();
      setTotalUrls(data.count);
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
          sheetUrl,
          column: selectedColumn
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
      setTotalUrls(0);
      setJobName('');

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

        {columns.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-medium text-gray-900">Select URL Column</h3>
            <p className="text-sm text-gray-500">
              Which column contains your website URLs?
            </p>
            <div className="grid gap-3">
              {columns.map((column) => (
                <button
                  key={column}
                  onClick={() => handleColumnSelect(column)}
                  className={`text-left px-4 py-3 border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    selectedColumn === column ? 'bg-primary-50 border-primary-500' : ''
                  }`}
                >
                  {column}
                </button>
              ))}
            </div>
          </div>
        )}

        {totalUrls > 0 && (
          <div className="space-y-4 pt-4 border-t">
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

              <Button
                type="submit"
                isLoading={isLoading}
                className="w-full"
              >
                Start Job
              </Button>
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