import { NextResponse } from 'next/server';
import axios from 'axios';

// Extract spreadsheet ID from URL
function getSpreadsheetId(url: string) {
  try {
    const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!matches) throw new Error('Invalid Google Sheet URL');
    return matches[1];
  } catch (error) {
    throw new Error('Invalid Google Sheet URL');
  }
}

export async function POST(request: Request) {
  try {
    const { sheetUrl } = await request.json();
    
    if (!sheetUrl) {
      return NextResponse.json(
        { error: 'Sheet URL is required' },
        { status: 400 }
      );
    }

    const spreadsheetId = getSpreadsheetId(sheetUrl);
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
    
    // Fetch the sheet data
    const response = await axios.get(csvUrl);
    const firstRow = response.data.split('\n')[0];
    const columns = firstRow.split(',').map((col: string) => col.trim().replace(/^"|"$/g, ''));

    return NextResponse.json({ columns });
  } catch (error: any) {
    console.error('Error fetching columns:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch columns' },
      { status: 500 }
    );
  }
} 