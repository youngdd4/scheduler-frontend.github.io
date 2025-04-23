import React, { useState, useEffect } from 'react';
import { getAuthorizationUrl } from '../services/tiktok';
import { getBackendUrl, isProd, checkBackendHealth, saveBackendUrl, getAlternativeBackendUrls } from '../services/config';
import axios from 'axios';
import './SignInWithTikTok.css';

const SignInWithTikTok: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [currentBackend, setCurrentBackend] = useState<string>(getBackendUrl());
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<'success' | 'failure' | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<string | null>(null);
  const [alternativeUrls, setAlternativeUrls] = useState<string[]>([]);

  // Update the current backend display whenever it changes
  useEffect(() => {
    setCurrentBackend(getBackendUrl());
    setAlternativeUrls(getAlternativeBackendUrls());
  }, []);

  const testDirectConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    setConnectionDetails(null);
    
    try {
      // Try a direct connection to the backend
      const url = `${currentBackend}/`;
      console.log(`Testing direct connection to: ${url}`);
      
      const startTime = Date.now();
      const response = await axios.get(url, { 
        timeout: 10000,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      const status = response.status;
      const statusText = response.statusText;
      
      console.log(`Connection test successful: ${status} ${statusText} (${responseTime}ms)`);
      setConnectionTestResult('success');
      setConnectionDetails(`Connected successfully: Status ${status} ${statusText} (${responseTime}ms)`);
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionTestResult('failure');
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          setConnectionDetails('Connection timed out. The server is not responding.');
        } else if (!error.response) {
          setConnectionDetails(`Network error: ${error.message}. Server might be unreachable.`);
        } else {
          setConnectionDetails(`HTTP error: ${error.response.status} ${error.response.statusText}`);
        }
      } else {
        setConnectionDetails(`Unknown error: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      setIsTestingConnection(false);
    }
  };

  const switchToProductionBackend = () => {
    saveBackendUrl('https://emmanueltech.store');
    setCurrentBackend('https://emmanueltech.store');
    setServerError(null); // Clear any previous error
    setConnectionTestResult(null);
    setConnectionDetails(null);
  };

  const switchToLocalBackend = () => {
    saveBackendUrl('http://localhost:8000');
    setCurrentBackend('http://localhost:8000');
    setServerError(null); // Clear any previous error
    setConnectionTestResult(null);
    setConnectionDetails(null);
  };

  const clearCustomBackend = () => {
    saveBackendUrl('');
    setCurrentBackend(getBackendUrl());
    setServerError(null); // Clear any previous error
    setConnectionTestResult(null);
    setConnectionDetails(null);
  };

  const clearAllBrowserData = () => {
    // This is the most aggressive approach we can take
    
    // Clear all cookies
    document.cookie.split(";").forEach(function(c) {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    // Clear all session storage
    sessionStorage.clear();
    
    // Clear TikTok-related localStorage items
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.toLowerCase().includes('tiktok') || key.toLowerCase().includes('token'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  };

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setServerError(null);

      // Removed backend health check to allow sign in even if health check fails
      // Previously:
      // const isServerHealthy = await checkBackendHealth();
      // if (!isServerHealthy) {
      //   setServerError("Cannot connect to the server. Please check your internet connection or try again later.");
      //   setIsLoading(false);
      //   return;
      // }

      // First clear any existing TikTok-related data
      localStorage.removeItem('tiktok_token');
      localStorage.removeItem('tiktok_user');
      localStorage.removeItem('tiktok_error_details');
      localStorage.removeItem('tiktok_code_verifier_backup');
      localStorage.removeItem('tiktok_last_auth_attempt');
      
      // Clear the session storage code verifier for a clean start
      sessionStorage.removeItem('tiktok_code_verifier');
      
      // Now generate a fresh authorization URL
      const { url, codeVerifier } = await getAuthorizationUrl();
      
      // Store the code verifier in both sessionStorage (primary) and localStorage (backup)
      sessionStorage.setItem('tiktok_code_verifier', codeVerifier);
      localStorage.setItem('tiktok_code_verifier_backup', codeVerifier);
      
      // Record the time when authorization was initiated to track expiration
      localStorage.setItem('tiktok_auth_initiated', Date.now().toString());
      
      // Log for debugging
      console.log('Generated code verifier:', codeVerifier.substring(0, 10) + '...');
      console.log('Stored in sessionStorage and localStorage backup');
      
      // Add cache-busting parameter and record the full URL for troubleshooting
      const finalUrl = url + '&_nocache=' + new Date().getTime();
      localStorage.setItem('tiktok_last_auth_url', finalUrl);
      
      // Redirect to TikTok's authorization page
      window.location.href = finalUrl;
    } catch (error) {
      console.error('Failed to generate TikTok authorization URL:', error);
      
      if (error instanceof Error) {
        setServerError(error.message);
      } else {
        setServerError('Login initialization failed. Please try again.');
      }
      
      setIsLoading(false);
      
      // Log the error details
      localStorage.setItem('tiktok_init_error', JSON.stringify({
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }));
    }
  };

  const switchToApiSubdomain = () => {
    if (currentBackend.includes('://')) {
      try {
        const urlObj = new URL(currentBackend);
        if (!urlObj.hostname.startsWith('api.')) {
          const apiUrl = currentBackend.replace(urlObj.hostname, 'api.' + urlObj.hostname);
          saveBackendUrl(apiUrl);
          setCurrentBackend(apiUrl);
          setServerError(null);
          setConnectionTestResult(null);
          setConnectionDetails(null);
          console.log(`Switched to API subdomain: ${apiUrl}`);
          return;
        }
      } catch (error) {
        console.error('Failed to parse URL:', error);
      }
    }
    
    // Fallback - direct to api.emmanueltech.store
    saveBackendUrl('https://api.emmanueltech.store');
    setCurrentBackend('https://api.emmanueltech.store');
    setServerError(null);
    setConnectionTestResult(null);
    setConnectionDetails(null);
  };

  return (
    <div>
      <button 
        onClick={handleSignIn} 
        className="tiktok-signin-button"
        disabled={isLoading}
      >
        {isLoading ? 'Initializing...' : 'Sign in with TikTok'}
      </button>
    </div>
  );
};

export default SignInWithTikTok;
