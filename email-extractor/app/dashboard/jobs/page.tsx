'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Button from '@/app/components/Button';
import Card from '@/app/components/Card';
import { supabase } from '@/lib/supabase';

interface Job {
  id: string;
  name: string;
  status: string;
  total_urls: number;
  processed_urls: number;
  emails: string[];
  created_at: string;
  updated_at: string;
}

export default function JobsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New job form state
  const [showNewJobForm, setShowNewJobForm] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [totalUrls, setTotalUrls] = useState(0);
  const [jobName, setJobName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchJobs();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs');
      if (!response.ok) throw new Error('Failed to fetch jobs');
      
      const data = await response.json();
      // Sort jobs by creation date, newest first
      setJobs(data.jobs || []);
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSheetUrlSubmit = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/sheets/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl })
      });

      if (!response.ok) throw new Error('Failed to fetch sheet columns');
      const data = await response.json();
      setColumns(data.columns);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleColumnSelect = async (column: string) => {
    setIsCreating(true);
    setSelectedColumn(column);

    try {
      const response = await fetch('/api/sheets/urls-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl, column })
      });

      if (!response.ok) throw new Error('Failed to count URLs');
      const data = await response.json();
      setTotalUrls(data.count);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
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

      if (!response.ok) throw new Error('Failed to create job');
      
      // Reset form
      setShowNewJobForm(false);
      setSheetUrl('');
      setColumns([]);
      setSelectedColumn('');
      setTotalUrls(0);
      setJobName('');
      
      // Refresh jobs list
      await fetchJobs();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewDetails = (id: string) => {
    router.push(`/dashboard/jobs/${id}`);
  };

  const handleDeleteConfirm = (id: string) => {
    setJobToDelete(id);
  };

  const handleDeleteCancel = () => {
    setJobToDelete(null);
  };

  const handleDeleteJob = async () => {
    if (!jobToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobToDelete);
      
      if (error) throw new Error(error.message);
      
      // Refresh jobs list
      await fetchJobs();
      
      // Reset state
      setJobToDelete(null);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateNewJob = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Jobs</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">Welcome, {user?.username}!</span>
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* New Job Button */}
          {!showNewJobForm && (
            <div className="flex justify-end">
              <Button onClick={() => setShowNewJobForm(true)}>
                New Job
              </Button>
            </div>
          )}

          {/* New Job Form */}
          {showNewJobForm && (
            <Card className="mb-8">
              <div className="space-y-6">
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
                      required
                      className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      onBlur={handleSheetUrlSubmit}
                    />
                  </div>
                </div>

                {columns.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Select URL Column</h3>
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
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-md">
                      <p className="text-sm text-blue-700">
                        Found {totalUrls} websites in column &quot;{selectedColumn}&quot;
                      </p>
                    </div>
                    
                    <div>
                      <label htmlFor="job-name" className="block text-sm font-medium text-gray-700">
                        Job Name
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          id="job-name"
                          required
                          className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          placeholder="Enter a name for this extraction job"
                          value={jobName}
                          onChange={(e) => setJobName(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewJobForm(false);
                      setError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  {totalUrls > 0 && jobName && (
                    <Button
                      onClick={handleCreateJob}
                      isLoading={isCreating}
                    >
                      Create Job
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Jobs List */}
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Job Name
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Emails Found
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        Loading jobs...
                      </td>
                    </tr>
                  ) : jobs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        No jobs found. Create a new job to get started.
                      </td>
                    </tr>
                  ) : (
                    jobs.map((job) => (
                      <tr key={job.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {job.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            job.status === 'completed' ? 'bg-green-100 text-green-800' :
                            job.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-blue-600 h-2.5 rounded-full" 
                              style={{ width: `${job.total_urls ? (job.processed_urls / job.total_urls * 100) : 0}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 mt-1">
                            {job.total_urls ? (job.processed_urls / job.total_urls * 100).toFixed(2) : '0.00'}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {job.emails?.length || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(job.id)}
                            >
                              View Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteConfirm(job.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {jobToDelete && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete this job? This action cannot be undone, and any in-progress extraction will be stopped.
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                onClick={handleDeleteJob}
                isLoading={isDeleting}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 