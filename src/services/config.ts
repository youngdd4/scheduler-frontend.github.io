// Configuration utility for the TikTok integration app
import axios from 'axios';

// Determine if the app is running in production (on Render.com)
export const isProd = window.location.hostname !== 'localhost' && 
                      !window.location.hostname.includes('127.0.0.1');

// Default development backend URL (local)
const DEV_BACKEND_URL = 'http://localhost:8000';

// Production backend URL
const RENDER_BACKEND_URL = 'https://emmanueltech.store';

// Alternative production URLs to try
const ALTERNATIVE_URLS = [
  'https://emmanueltech.store',
  'https://api.emmanueltech.store'
];

// Get the configured backend URL or use default based on environment
export const getBackendUrl = (): string => {
  // First check if there's a saved backend URL in localStorage
  const savedBackendUrl = localStorage.getItem('render_backend_url');
  if (savedBackendUrl) {
    return savedBackendUrl;
  }
  
  // No saved URL, use default based on environment
  const defaultUrl = isProd ? RENDER_BACKEND_URL : DEV_BACKEND_URL;
  return defaultUrl;
};

// Get a list of API endpoints to try (primary and alternatives)
export const getAlternativeBackendUrls = (): string[] => {
  const mainUrl = getBackendUrl();
  
  // If using one of our known production URLs, also return the alternative
  if (mainUrl === 'https://emmanueltech.store') {
    return ['https://emmanueltech.store', 'https://api.emmanueltech.store'];
  }
  
  if (mainUrl === 'https://api.emmanueltech.store') {
    return ['https://api.emmanueltech.store', 'https://emmanueltech.store'];
  }
  
  // For custom URLs, try prepending/removing "api." from domain
  if (mainUrl.includes('://')) {
    const urlObj = new URL(mainUrl);
    if (urlObj.hostname.startsWith('api.')) {
      // If URL starts with api, create version without it
      const altHostname = urlObj.hostname.replace(/^api\./, '');
      const altUrl = mainUrl.replace(urlObj.hostname, altHostname);
      return [mainUrl, altUrl];
    } else {
      // If URL doesn't start with api, create version with it
      const altHostname = 'api.' + urlObj.hostname;
      const altUrl = mainUrl.replace(urlObj.hostname, altHostname);
      return [mainUrl, altUrl];
    }
  }
  
  // For any other case, just return the main URL
  return [mainUrl];
};

// Save a custom backend URL (for development testing)
export const saveBackendUrl = (url: string): void => {
  if (!url) {
    localStorage.removeItem('render_backend_url');
    return;
  }
  
  // Make sure the URL has the right format (no trailing slash for consistency)
  let formattedUrl = url;
  if (formattedUrl.endsWith('/')) {
    formattedUrl = formattedUrl.slice(0, -1);
  }
  
  localStorage.setItem('render_backend_url', formattedUrl);
};

// Check if the backend server is reachable
export const checkBackendHealth = async (timeout = 5000): Promise<boolean> => {
  try {
    let baseUrl = getBackendUrl();
    console.log(`Checking backend health at: ${baseUrl}`);
    
    // Get both primary and alternative URLs
    const allUrls = getAlternativeBackendUrls();
    console.log(`Will try these backend URLs: ${allUrls.join(', ')}`);
    
    // Create alternative URLs to try both http and https versions
    let urlsToTry: string[] = [];
    
    // Add both http/https versions of each URL
    allUrls.forEach(url => {
      urlsToTry.push(url);
      urlsToTry.push(url.replace('http://', 'https://'));
      urlsToTry.push(url.replace('https://', 'http://'));
    });
    
    // Remove duplicates
    urlsToTry = urlsToTry.filter((url, index, self) => self.indexOf(url) === index);
    
    // Try different base URLs (alternatives and http vs https)
    for (const url of urlsToTry) {
      console.log(`Trying base URL: ${url}`);
      
      // Try multiple potential health endpoints for each base URL
      const healthEndpoints = [
        `${url}/api/health/`,
        `${url}/api/healthcheck/`,
        `${url}/health/`,
        `${url}/healthcheck/`,
        `${url}/api/tiktok/health/`,
        `${url}/api/tiktok/callback/health/`,
        `${url}/api/status/`,
        `${url}/`  // Last resort - just try root path
      ];
      
      // Try each endpoint until one works
      for (const endpoint of healthEndpoints) {
        try {
          console.log(`Trying health endpoint: ${endpoint}`);
          
          // Set up options to handle CORS issues
          const options = {
            timeout,
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'Cache-Control': 'no-cache'
            }
          };
          
          const response = await axios.get(endpoint, options);
          console.log(`Health check succeeded at ${endpoint}:`, response.status);
          
          // If success, update the saved backend URL to the working one
          if (url !== baseUrl) {
            console.log(`Updating saved backend URL from ${baseUrl} to ${url}`);
            saveBackendUrl(url);
          }
          
          return true;
        } catch (endpointError) {
          console.log(`Health check failed at ${endpoint}:`, endpointError.message);
          
          // If there's a CORS error, try a different approach
          if (endpointError.message && endpointError.message.includes('CORS')) {
            try {
              console.log('Detected CORS issue, trying alternate method...');
              // Try a simple HEAD request which might bypass CORS for simple checks
              const headResponse = await fetch(endpoint, { 
                method: 'HEAD',
                mode: 'no-cors',
                cache: 'no-cache'
              });
              
              console.log('HEAD request completed');
              // If we get here without an error, the server might be available
              return true;
            } catch (fetchError) {
              console.log('Alternate HEAD request failed:', fetchError);
            }
          }
        }
      }
    }
    
    // If we get here, all endpoints and protocols failed
    console.error(`All backend health checks failed for all protocols`);
    return false;
  } catch (error) {
    console.error('Backend health check failed with an unexpected error:', error);
    return false;
  }
};

// Clear all saved configuration
export const clearConfig = (): void => {
  localStorage.removeItem('render_backend_url');
}; 