import type { NextApiRequest, NextApiResponse } from 'next';
import { extractEmails } from '@/lib/emailExtractor';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    console.log(`Testing email extraction for: ${url}`);
    const emails = await extractEmails(url);
    
    return res.status(200).json({ 
      success: true, 
      url,
      emailsFound: emails.length,
      emails 
    });
  } catch (error: any) {
    console.error('Error in test extraction:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to extract emails',
      success: false
    });
  }
} 