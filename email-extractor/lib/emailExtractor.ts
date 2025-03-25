import axios from 'axios';
import * as cheerio from 'cheerio';

// Common email domains to look for
const COMMON_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'aol.com',
  'icloud.com',
  'protonmail.com',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'gmx.com',
];

// Domains to ignore when extracting emails
const IGNORE_DOMAINS = [
  'wix.com', 
  'domain.com', 
  'example.com', 
  'sentry.io', 
  'wixpress.com', 
  'squarespace.com', 
  'wordpress.com', 
  'shopify.com'
];

// Common paths for contact pages
const CONTACT_PAGES = [
  '/contact', 
  '/contact-us', 
  '/contact.html', 
  '/contact-us.html', 
  '/about', 
  '/about-us',
  '/about.html', 
  '/about-us.html', 
  '/get-in-touch', 
  '/reach-us', 
  '/connect', 
  '/reach-out',
  '/our-team', 
  '/team', 
  '/support', 
  '/help', 
  '/info'
];

// Function to validate and clean email addresses
function validateEmail(email: string): string | null {
  // Clean and validate the email format
  email = email.trim().toLowerCase();
  
  // Ignore image files and other non-email strings containing @ symbol
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico)/.test(email)) {
    return null;
  }
  
  // Remove any invalid start/end characters
  email = email.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9\.]+$/g, '');
  
  // Check if the email follows a valid pattern
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    // Ensure the email doesn't contain file extensions or other non-email patterns
    const parts = email.split('@');
    if (parts.length === 2 && parts[1].includes('.')) {
      const domainPart = parts[1];
      // Check if the domain part looks valid (not an image or file name)
      if (!(/\d+x\d+/.test(domainPart))) {  // Pattern often found in image dimensions
        return email;
      }
    }
  }
  return null;
}

// Extract domain from URL
function getDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostParts = urlObj.hostname.split('.');
    const domain = hostParts.length >= 2 ? 
      `${hostParts[hostParts.length - 2]}.${hostParts[hostParts.length - 1]}` : 
      urlObj.hostname;
    return domain;
  } catch {
    return null;
  }
}

// Function to clean and deduplicate emails
function cleanAndDeduplicateEmails(emailsList: string[]): string[] {
  if (!emailsList || emailsList.length === 0) {
    return [];
  }
  
  // First round of cleaning and deduplication
  const cleanEmails = new Set<string>();
  for (const email of emailsList) {
    const validEmail = validateEmail(email);
    if (validEmail) {
      // Skip emails from the ignore domains
      if (!IGNORE_DOMAINS.some(ignoreDomain => validEmail.includes(ignoreDomain))) {
        cleanEmails.add(validEmail);
      }
    }
  }
  
  // Handle cases where one email is contained within another or has extra characters
  // (like "892-0300info@digitalbytes.tv" vs "info@digitalbytes.tv")
  const emailsToRemove = new Set<string>();
  const finalEmails = Array.from(cleanEmails);
  
  for (let i = 0; i < finalEmails.length; i++) {
    for (let j = 0; j < finalEmails.length; j++) {
      if (i !== j && finalEmails[i] !== finalEmails[j]) {
        // Split emails into username and domain parts
        const email1Parts = finalEmails[i].split('@');
        const email2Parts = finalEmails[j].split('@');
        
        // Check if they have the same domain
        if (email1Parts.length === 2 && email2Parts.length === 2 && email1Parts[1] === email2Parts[1]) {
          const username1 = email1Parts[0];
          const username2 = email2Parts[0];
          
          // When one email appears inside another with extra characters (like digits before/after)
          if (finalEmails[i].includes(finalEmails[j])) {
            // Keep the shorter, cleaner one (contained inside)
            emailsToRemove.add(finalEmails[i]);
          } else if (finalEmails[j].includes(finalEmails[i])) {
            // Keep the shorter, cleaner one (contained inside)
            emailsToRemove.add(finalEmails[j]);
          }
          // Special cases for common prefixes like project.info@ vs info@
          else if (username1.endsWith(username2)) {
            // Check if username1 has a prefix pattern like "something.username2"
            const prefix = username1.substring(0, username1.length - username2.length);
            if (prefix.endsWith('.') || prefix.endsWith('-') || prefix.endsWith('_')) {
              emailsToRemove.add(finalEmails[i]);
            }
          } else if (username2.endsWith(username1)) {
            // Check if username2 has a prefix pattern like "something.username1"
            const prefix = username2.substring(0, username2.length - username1.length);
            if (prefix.endsWith('.') || prefix.endsWith('-') || prefix.endsWith('_')) {
              emailsToRemove.add(finalEmails[j]);
            }
          }
          // Handle cases with numbers or other characters inserted or appended
          else if (containsNumbersOrSpecialChars(username1) && !containsNumbersOrSpecialChars(username2)) {
            // If username1 has numbers/special chars but username2 doesn't, prefer username2
            emailsToRemove.add(finalEmails[i]);
          } else if (containsNumbersOrSpecialChars(username2) && !containsNumbersOrSpecialChars(username1)) {
            // If username2 has numbers/special chars but username1 doesn't, prefer username1
            emailsToRemove.add(finalEmails[j]);
          }
        }
      }
    }
  }
  
  // Remove emails flagged for removal
  const finalCleaned = finalEmails.filter(email => !emailsToRemove.has(email));
  
  return finalCleaned;
}

// Helper function to check if a string contains numbers or special characters
function containsNumbersOrSpecialChars(str: string): boolean {
  return /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,<>\/?]+/.test(str);
}

// Function to extract emails from a website
export async function extractEmails(baseUrl: string): Promise<string[]> {
  const emailsSet = new Set<string>();
  const domain = getDomain(baseUrl);
  
  // Process a single URL and extract emails
  const processUrl = async (url: string, isContactPage = false): Promise<Set<string>> => {
    const localEmails = new Set<string>();
    try {
      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      };
      const response = await axios.get(url, { headers, timeout: 15000 });
      const htmlContent = response.data;
      const $ = cheerio.load(htmlContent);
      
      // Method 1: Extract emails from visible text
      const textContent = $('body').text();
      const textEmails = textContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
      
      // Method 2: Extract emails from mailto links
      const allATags = $('a');
      const mailtoEmails: string[] = [];
      allATags.each((_, element) => {
        // Check href attribute
        const href = $(element).attr('href') || '';
        if (href.includes('mailto:')) {
          const email = href.replace('mailto:', '').split('?')[0].trim();
          mailtoEmails.push(decodeURIComponent(email));
        }
        
        // Also check other attributes for emails
        const attrs = $(element).attr();
        if (attrs) {
          Object.keys(attrs).forEach(attrName => {
            const attrValue = attrs[attrName];
            if (typeof attrValue === 'string' && attrValue.includes('@')) {
              const potentialEmails = attrValue.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
              if (potentialEmails) mailtoEmails.push(...potentialEmails);
            }
          });
        }
      });
      
      // Method 3: Check for elements with email-related classes or IDs
      const emailClasses = ["email", "mail", "e-mail", "contact", "email-address", "mail-link", "mini-contacts", 
                         "footer-contact", "header-contact", "contact-info", "contact-details", "contact-email",
                         "footer-email", "header-email", "info"];
      const classEmails: string[] = [];
      
      emailClasses.forEach(className => {
        const elements = $(`[class*=${className}]`);
        elements.each((_, element) => {
          // Extract email from text content
          const elementText = $(element).text();
          const foundEmails = elementText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
          if (foundEmails) classEmails.push(...foundEmails);
          
          // Also check attributes
          const attrs = $(element).attr();
          if (attrs) {
            Object.keys(attrs).forEach(attrName => {
              const attrValue = attrs[attrName];
              if (typeof attrValue === 'string' && attrValue.includes('@')) {
                const potentialEmails = attrValue.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
                if (potentialEmails) classEmails.push(...potentialEmails);
              }
            });
          }
        });
      });
      
      // Method 4: Extract from all tags and attributes (comprehensive scan)
      const allTagsEmails: string[] = [];
      $('*').each((_, tag) => {
        // Check tag content
        if ($(tag).text().includes('@')) {
          const foundEmails = $(tag).text().match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
          if (foundEmails) allTagsEmails.push(...foundEmails);
        }
        
        // Check all attributes
        const attrs = $(tag).attr();
        if (attrs) {
          Object.keys(attrs).forEach(attrName => {
            const attrValue = attrs[attrName];
            if (typeof attrValue === 'string' && attrValue.includes('@')) {
              const foundEmails = attrValue.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
              if (foundEmails) allTagsEmails.push(...foundEmails);
            }
          });
        }
      });
      
      // Method 5: Extract from script tags
      const scriptEmails: string[] = [];
      const scriptTags = $('script');
      scriptTags.each((_, script) => {
        const scriptContent = $(script).html();
        if (scriptContent) {
          // Look for explicit email field in JSON
          const emailPatterns = [
            /"email"\s*:\s*"([^"]+@[^"]+\.[^"]+)"/,       // "email": "example@domain.com"
            /"emailAddress"\s*:\s*"([^"]+@[^"]+\.[^"]+)"/, // "emailAddress": "example@domain.com"
            /"mail"\s*:\s*"([^"]+@[^"]+\.[^"]+)"/,         // "mail": "example@domain.com"
            /"e-mail"\s*:\s*"([^"]+@[^"]+\.[^"]+)"/,       // "e-mail": "example@domain.com"
            /"contactEmail"\s*:\s*"([^"]+@[^"]+\.[^"]+)"/, // "contactEmail": "example@domain.com"
            /"support_email"\s*:\s*"([^"]+@[^"]+\.[^"]+)"/ // "support_email": "example@domain.com"
          ];
          
          emailPatterns.forEach(pattern => {
            const matches = scriptContent.match(pattern);
            if (matches && matches.length > 1) {
              scriptEmails.push(matches[1]);
            }
          });
          
          // Also extract general email pattern
          const generalEmails = scriptContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
          if (generalEmails) scriptEmails.push(...generalEmails);
          
          // Try to parse JSON data
          try {
            // Extract any JSON-like structures from the script
            const jsonMatches = scriptContent.match(/\{[^{}]*\}/g);
            if (jsonMatches) {
              jsonMatches.forEach(jsonStr => {
                try {
                  const data = JSON.parse(jsonStr);
                  
                  // Recursively search for email keys in the JSON
                  const extractJsonEmails = (obj: any): string[] => {
                    const found: string[] = [];
                    
                    if (typeof obj === 'object' && obj !== null) {
                      if (Array.isArray(obj)) {
                        obj.forEach(item => {
                          found.push(...extractJsonEmails(item));
                        });
                      } else {
                        for (const key in obj) {
                          if (typeof obj[key] === 'string' && 
                              (key.toLowerCase().includes('email') || 
                               key.toLowerCase().includes('mail') || 
                               key.toLowerCase().includes('contact'))) {
                            const value = obj[key];
                            if (value.includes('@') && value.includes('.')) {
                              found.push(value);
                            }
                          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                            found.push(...extractJsonEmails(obj[key]));
                          }
                        }
                      }
                    }
                    
                    return found;
                  };
                  
                  const jsonEmails = extractJsonEmails(data);
                  scriptEmails.push(...jsonEmails);
                } catch {
                  // Ignore JSON parse errors
                }
              });
            }
          } catch {
            // Ignore JSON extraction errors
          }
        }
      });
      
      // Method 6: Extract from meta tags
      const metaEmails: string[] = [];
      const metaTags = $('meta');
      metaTags.each((_, meta) => {
        const content = $(meta).attr('content') || '';
        if (content.includes('@')) {
          const foundEmails = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
          if (foundEmails) metaEmails.push(...foundEmails);
        }
      });
      
      // Method 7: Look specifically for common email domains in the entire HTML content
      const domainBasedEmails: string[] = [];
      COMMON_EMAIL_DOMAINS.forEach(emailDomain => {
        // Find all text containing common email domains
        const domainPattern = new RegExp(`[a-zA-Z0-9._%+-]+@${emailDomain.replace('.', '\\.')}`, 'g');
        const foundDomainEmails = htmlContent.match(domainPattern);
        if (foundDomainEmails) domainBasedEmails.push(...foundDomainEmails);
      });
      
      // Method 8: Look for obfuscated emails (especially on contact pages)
      if (isContactPage) {
        // Look for JavaScript email obfuscation
        scriptTags.each((_, script) => {
          const scriptContent = $(script).html() || '';
          if (scriptContent.toLowerCase().includes('email') || 
              scriptContent.toLowerCase().includes('mail') || 
              scriptContent.toLowerCase().includes('contact')) {
            
            // Check for string concatenation
            const concatPatterns = [
              /['"]\s*\+\s*['"]/,  // "+" patterns like 'user' + '@' + 'domain.com'
              /\.join\(/,           // Array.join() method
              /\.reverse\(/,        // String or array reverse()
              /String\.fromCharCode/ // Character code conversion
            ];
            
            const hasObfuscation = concatPatterns.some(pattern => pattern.test(scriptContent));
            
            if (hasObfuscation) {
              // Extract anything that looks like it could be part of email when concatenated
              const parts = scriptContent.match(/['"]([a-zA-Z0-9._%+-@]+)['"]/g);
              if (parts && parts.join('').includes('@')) {
                // Try simple reconstruction for common patterns
                const reconstructed = parts.join('').replace(/['"]/g, '');
                const potentialEmails = reconstructed.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
                if (potentialEmails) domainBasedEmails.push(...potentialEmails);
              }
            }
          }
        });
        
        // Look for emails in contact form HTML structure
        const contactForms = $('form');
        contactForms.each((_, form) => {
          // Check for hidden email fields
          const hiddenFields = $('input[type="hidden"]', form);
          hiddenFields.each((_, field) => {
            const value = $(field).attr('value') || '';
            if (value.includes('@')) {
              const foundEmails = value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
              if (foundEmails) domainBasedEmails.push(...foundEmails);
            }
          });
        });
      }
      
      // Combine all emails
      const allExtractedEmails = [
        ...textEmails,
        ...mailtoEmails,
        ...classEmails,
        ...allTagsEmails,
        ...scriptEmails, 
        ...metaEmails,
        ...domainBasedEmails
      ];
      
      // Clean and add valid emails to the local set
      allExtractedEmails.forEach(email => {
        const validEmail = validateEmail(email);
        if (validEmail && !IGNORE_DOMAINS.some(ignoreDomain => validEmail.includes(ignoreDomain))) {
          localEmails.add(validEmail);
        }
      });
      
    } catch (error) {
      console.error(`Error processing URL ${url}:`, error);
    }
    
    return localEmails;
  };
  
  // First process the main URL
  const mainPageEmails = await processUrl(baseUrl);
  mainPageEmails.forEach(email => emailsSet.add(email));
  
  // Then process contact pages regardless of how many emails we found
  // (to ensure we get the most accurate contact emails)
  for (const contactPath of CONTACT_PAGES) {
    const contactUrl = new URL(contactPath, baseUrl).toString();
    if (contactUrl !== baseUrl) {  // Avoid processing the same URL twice
      try {
        const contactPageEmails = await processUrl(contactUrl, true);
        contactPageEmails.forEach(email => emailsSet.add(email));
      } catch {
        continue;
      }
    }
  }
  
  // Clean and deduplicate emails
  const allEmails = cleanAndDeduplicateEmails(Array.from(emailsSet));
  
  // Prioritize emails with domain matching the website
  const domainEmails = allEmails.filter(email => domain && email.includes(domain));
  const otherEmails = allEmails.filter(email => !domainEmails.includes(email));
  
  // Sort emails with domain emails first
  const sortedEmails = [...domainEmails.sort(), ...otherEmails.sort()];
  
  return sortedEmails;
}

export class EmailExtractor {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async extractEmails(): Promise<string[]> {
    try {
      return await extractEmails(this.baseUrl);
    } catch (error) {
      console.error('Error extracting emails:', error);
      return [];
    }
  }
}

export async function extractEmailsFromSpreadsheet(
  spreadsheetUrl: string,
  urlColumn: string
): Promise<{ url: string; emails: string[] }[]> {
  try {
    // Convert Google Sheets URL to CSV export URL
    const csvUrl = spreadsheetUrl.replace(/\/edit.*$/, '/export?format=csv');
    
    // Fetch the CSV content
    const response = await axios.get(csvUrl);
    const csvContent = response.data;
    
    // Parse CSV content
    const rows = csvContent.split('\n').map((row: string) => row.split(',').map(cell => cell.trim()));
    const headers = rows[0];
    const urlColumnIndex = headers.indexOf(urlColumn);
    
    if (urlColumnIndex === -1) {
      throw new Error(`Column "${urlColumn}" not found in spreadsheet`);
    }

    const results: { url: string; emails: string[] }[] = [];
    
    // Process each row (skip header row)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length <= urlColumnIndex) continue;
      
      const url = row[urlColumnIndex].replace(/^"|"$/g, ''); // Remove quotes if present
      if (!url) continue;

      try {
        // Make sure URL has proper protocol
        const properUrl = url.startsWith('http') ? url : `https://${url}`;
        const emails = await extractEmails(properUrl);
        results.push({ url: properUrl, emails });
      } catch (error) {
        console.error(`Error processing ${url}:`, error);
        results.push({ url, emails: [] });
      }
    }

    return results;
  } catch (error) {
    console.error('Error processing spreadsheet:', error);
    throw new Error('Failed to process spreadsheet');
  }
} 