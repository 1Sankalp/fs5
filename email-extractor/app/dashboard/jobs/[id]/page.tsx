'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import Button from '@/app/components/Button';
import Card from '@/app/components/Card';

interface Job {
  id: string;
  name: string;
  status: string;
  progress: number;
  totalUrls: number;
  processedUrls: number;
  emailsFound: number;
  createdAt: string;
  urls: string[];
  emails?: string[];
  startTime?: number;
  estimatedCompletionTime?: number;
}

// Helper function to format remaining time
function formatRemainingTime(estimatedCompletionTime: number): string {
  if (!estimatedCompletionTime) return 'Unknown';
  
  const remainingMs = estimatedCompletionTime - Date.now();
  if (remainingMs <= 0) return 'Almost done...';
  
  const seconds = Math.floor(remainingMs / 1000) % 60;
  const minutes = Math.floor(remainingMs / (1000 * 60)) % 60;
  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  
  if (hours > 0) {
    return `~${hours}h ${minutes}m remaining`;
  } else if (minutes > 0) {
    return `~${minutes}m ${seconds}s remaining`;
  } else {
    return `~${seconds}s remaining`;
  }
}

export default function JobDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobDetails = useCallback(async () => {
    try {
      const response = await fetch(`/api/jobs/${id}`);
      
      if (response.status === 404) {
        setError('Job not found');
        setIsLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch job details');
      }
      
      const data = await response.json();
      setJob(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJobDetails();
    
    // Poll for updates every 3 seconds
    const interval = setInterval(fetchJobDetails, 3000);
    return () => clearInterval(interval);
  }, [id, fetchJobDetails]);

  const handleStartProcessing = async () => {
    if (!job) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/jobs/${id}/process`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start job processing');
      }
      
      // Refresh job details immediately
      fetchJobDetails();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoBack = () => {
    router.push('/dashboard/jobs');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">Loading job details...</div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-16">
            <h2 className="text-lg font-medium text-red-600">Error</h2>
            <p className="mt-2 text-gray-500">{error || 'Job not found'}</p>
            <div className="mt-6">
              <Button onClick={handleGoBack}>
                Back to Jobs
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Button
          variant="outline"
          className="mb-2"
          onClick={handleGoBack}
        >
          &larr; Back to Jobs
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">{job.name}</h1>
      </div>

      <div className="space-y-6">
        {/* Job Status Card */}
        <Card>
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Progress</h3>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {job.progress}%
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${job.progress}%` }}
                  ></div>
                </div>
                {job.status === 'processing' && job.estimatedCompletionTime && (
                  <p className="mt-2 text-sm text-gray-500">
                    {formatRemainingTime(job.estimatedCompletionTime)}
                  </p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">URLs Processed</h3>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {job.processedUrls} / {job.totalUrls}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Emails Found</h3>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {job.emailsFound}
                </p>
              </div>
            </div>

            {job.status === 'pending' && (
              <div className="mt-6">
                <Button 
                  onClick={handleStartProcessing} 
                  isLoading={isProcessing}
                  disabled={isProcessing}
                >
                  Start Processing
                </Button>
              </div>
            )}
            
            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Emails Found */}
        {job.emails && job.emails.length > 0 && (
          <Card>
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Emails Found</h2>
              <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-96">
                <ul className="space-y-2">
                  {job.emails.map((email, index) => (
                    <li key={index} className="text-sm text-gray-800">{email}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-4">
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(job.emails?.join('\n') || '');
                  }}
                >
                  Copy All Emails
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* URLs List */}
        <Card>
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">URLs to Process</h2>
            <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-96">
              <ul className="space-y-2">
                {job.urls.slice(0, 20).map((url, index) => (
                  <li key={index} className="text-sm text-gray-800">{url}</li>
                ))}
                {job.urls.length > 20 && (
                  <li className="text-sm text-gray-500 italic">
                    ... and {job.urls.length - 20} more URLs
                  </li>
                )}
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 