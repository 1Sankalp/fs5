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
    const { sheetUrl, column } = await request.json();
    
    if (!sheetUrl || !column) {
      return NextResponse.json(
        { error: 'Sheet URL and column are required' },
        { status: 400 }
      );
    }

    const spreadsheetId = getSpreadsheetId(sheetUrl);
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
    
    // Fetch the sheet data
    const response = await axios.get(csvUrl);
    const rows = response.data.split('\n');
    const headers = rows[0].split(',').map((col: string) => col.trim().replace(/^"|"$/g, ''));
    const columnIndex = headers.indexOf(column);
    
    if (columnIndex === -1) {
      throw new Error('Column not found');
    }

    // Count URLs
    const urlCount = rows.slice(1)
      .map((row: string) => {
        const cells = row.split(',');
        const cell = cells[columnIndex]?.toLowerCase() || '';
        return cell.includes('http') || cell.includes('www.') ? 1 : 0;
      })
      .reduce((a: number, b: number) => a + b, 0);

    return NextResponse.json({ count: urlCount });
  } catch (error: any) {
    console.error('Error counting URLs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to count URLs' },
      { status: 500 }
    );
  }
} 