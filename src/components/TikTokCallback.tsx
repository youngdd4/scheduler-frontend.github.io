import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { handleTikTokCallback, handleExpiredCode, TikTokTokenResponse, TikTokUserInfo } from '../services/tiktok';
import { checkBackendHealth, saveBackendUrl, getBackendUrl } from '../services/config';
import './TikTokCallback.css';

interface TikTokCallbackProps {
  onSuccess?: (data: { tokenInfo: TikTokTokenResponse; userInfo: TikTokUserInfo }) => void;
  onError?: (error: Error) => void;
}

const TikTokCallback: React.FC<TikTokCallbackProps> = ({ onSuccess, onError }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<TikTokUserInfo | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TikTokTokenResponse | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [currentBackend, setCurrentBackend] = useState<string>(getBackendUrl());

  // Function to check if backend server is reachable
  const checkServerStatus = async () => {
    try {
      setServerStatus('checking');
      const isHealthy = await checkBackendHealth();
      setServerStatus(isHealthy ? 'online' : 'offline');
    } catch (error) {
      console.error('Server health check failed:', error);
      setServerStatus('offline');
    }
  };

  // Switch to production backend
  const switchToProductionBackend = () => {
    saveBackendUrl('https://emmanueltech.store');
    setCurrentBackend('https://emmanueltech.store');
    // Check the status with the new backend
    setTimeout(() => {
      checkServerStatus();
    }, 500);
  };

  useEffect(() => {
    const processCallback = async () => {
      try {
        setLoading(true);
        
        // Parse URL search params
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        
        if (!code) {
          throw new Error("No authorization code found in the URL");
        }
        
        console.log(`Processing TikTok callback with code: ${code.substring(0, 10)}...`);
        
        // Process the callback
        const result = await handleTikTokCallback(code);
        
        // Store user and token info in state
        setUserInfo(result.userInfo);
        setTokenInfo(result.tokenInfo);
        
        // Call the success callback if provided
        if (onSuccess) {
          onSuccess(result);
        }
        
        setLoading(false);
      } catch (err) {
        const axiosError = err as any;
        const errorData = axiosError.response && axiosError.response.data ? axiosError.response.data : null;
        const fullErrorMessage = errorData ? (typeof errorData === "string" ? errorData : JSON.stringify(errorData)) : axiosError.message;

        console.error("Failed to process TikTok callback:", fullErrorMessage);

        // Set the error state
        setError(fullErrorMessage);

        // Check server status if it's a network error
        if (fullErrorMessage.toLowerCase().includes('network error')) {
          checkServerStatus();
        }

        // Call the error callback if provided
        if (onError) {
          onError(err);
        }

        // If the error indicates an expired code, trigger the retry flow
        if (fullErrorMessage.toLowerCase().includes('expired')) {
          handleExpiredCode();
        }

        setLoading(false);
      }
    };
    
    processCallback();
  }, [location.search, onSuccess, onError]);
  
  // Navigate back to home page
  const handleGoHome = () => {
    navigate('/');
  };

  // Retry the connection check
  const handleRetryConnection = async () => {
    await checkServerStatus();
    
    // If the server is online, offer to reload the page
    if (serverStatus === 'online') {
      if (window.confirm('Server appears to be online now. Would you like to reload the page and try again?')) {
        window.location.reload();
      }
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Processing your login...</p>
      </div>
    );
  }
  
  // Render error state with no buttons
  if (error) {
    return (
      <div className="error-container">
        <h3>Login Error</h3>
        <p>{error}</p>
      </div>
    );
  }
  
  // Render success state with user info
  return (
    <div className="success-container">
      <div className="success-header">
        <h2>Welcome, {userInfo?.display_name || 'TikTok User'}!</h2>
        <p>You've successfully connected your TikTok account</p>
      </div>
      
      <div className="user-profile-card">
        {userInfo?.avatar_url_100 && (
          <img 
            src={userInfo.avatar_url_100} 
            alt="Profile" 
            className="profile-avatar" 
          />
        )}
        
        <div className="profile-details">
          <p className="user-id">
            <span className="detail-label">User ID:</span> 
            <span>{userInfo?.open_id?.substring(0, 8)}...</span>
          </p>
          
          {userInfo?.profile_deep_link && (
            <p>
              <span className="detail-label">Profile:</span>
              <a 
                href={userInfo.profile_deep_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="profile-link"
              >
                Open TikTok Profile
              </a>
            </p>
          )}
        </div>
      </div>
      
      {/* Action buttons removed as per requirement */}
    </div>
  );
};

export default TikTokCallback; 