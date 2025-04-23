import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SignInWithTikTok from './components/SignInWithTikTok';
import TikTokCallback from './components/TikTokCallback';
import PostScheduler from './components/PostScheduler';
import { TikTokTokenResponse, TikTokUserInfo } from './services/tiktok';
import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [tikTokUser, setTikTokUser] = useState<TikTokUserInfo | null>(null);
  const [tikTokToken, setTikTokToken] = useState<TikTokTokenResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const savedToken = localStorage.getItem('tiktok_token');
    const savedUser = localStorage.getItem('tiktok_user');
    
    if (savedToken && savedUser) {
      try {
        const parsedToken = JSON.parse(savedToken);
        const parsedUser = JSON.parse(savedUser);
        setTikTokToken(parsedToken);
        setTikTokUser(parsedUser);
      } catch (error) {
        console.error('Error parsing saved TikTok auth data:', error);
        // Clear invalid data
        localStorage.removeItem('tiktok_token');
        localStorage.removeItem('tiktok_user');
      }
    }
    
    // Check if we just came back from handling an expired code
    const handlingExpiredCode = localStorage.getItem('tiktok_handling_expired_code');
    if (handlingExpiredCode === 'true') {
      // Clear the flag
      localStorage.removeItem('tiktok_handling_expired_code');
      
      // Show a message about the expired code
      const expiredMessage = document.createElement('div');
      expiredMessage.style.backgroundColor = '#fff0f0';
      expiredMessage.style.color = '#c00';
      expiredMessage.style.padding = '8px';
      expiredMessage.style.marginBottom = '16px';
      expiredMessage.style.borderRadius = '4px';
      expiredMessage.style.fontSize = '14px';
      expiredMessage.textContent = 'Your previous authorization code expired. Please try signing in again.';
      
      // Add the message to the top of the app container
      setTimeout(() => {
        const appContainer = document.querySelector('.app-container');
        if (appContainer && appContainer.firstChild) {
          appContainer.insertBefore(expiredMessage, appContainer.firstChild);
          
          // Remove the message after a few seconds
          setTimeout(() => {
            if (expiredMessage.parentNode) {
              expiredMessage.parentNode.removeChild(expiredMessage);
            }
          }, 5000);
        }
      }, 500);
    }
    
    setLoading(false);
  }, []);

  const handleAuthSuccess = (data: { tokenInfo: TikTokTokenResponse; userInfo: TikTokUserInfo }) => {
    setTikTokToken(data.tokenInfo);
    setTikTokUser(data.userInfo);
    console.log('TikTok authentication successful!', data);
  };

  const handleAuthError = (error: Error) => {
    console.error('TikTok authentication error:', error);
  };

  const handleLogout = () => {
    localStorage.removeItem('tiktok_token');
    localStorage.removeItem('tiktok_user');
    setTikTokToken(null);
    setTikTokUser(null);
  };

  const clearAllSessions = () => {
    // Clear all TikTok related data
    localStorage.removeItem('tiktok_token');
    localStorage.removeItem('tiktok_user');
    sessionStorage.removeItem('tiktok_code_verifier');
    
    // Clear all TikTok related cookies
    document.cookie.split(";").forEach(function(c) {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    // Clear session and local storage completely
    sessionStorage.clear();
    
    // Only attempt to clear relevant localStorage items rather than everything
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('tiktok') || key.includes('TikTok'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Force reload from server, not from cache
    window.location.href = window.location.href.split("?")[0] + 
      "?nocache=" + new Date().getTime();
  };

  // Even more aggressive approach that completely resets browser state
  const hardReset = () => {
    // The most nuclear option - this clears all browser storage
    const confirmed = window.confirm(
      "This will clear ALL browser data for this site (cookies, localStorage, etc). " +
      "Continue?"
    );
    
    if (confirmed) {
      // Clear everything
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear all cookies
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      // Hard reload the page with cache busting to ensure we get a fresh state
      window.location.href = window.location.href.split("?")[0] + 
        "?reset=true&nocache=" + new Date().getTime();
    }
  };

  // Safe access for user profile fields with fallbacks
  const getUserDisplayName = () => {
    return tikTokUser?.display_name || 'TikTok User';
  };

  const getUserAvatar = () => {
    return tikTokUser?.avatar_url_100 || tikTokUser?.avatar_url || '/default-avatar.svg';
  };

  const getUserId = () => {
    if (!tikTokUser?.open_id) return 'Unknown ID';
    return tikTokUser.open_id.substring(0, 10) + '...';
  };

  return (
    <Router>
      <div className="app-container">
        <h1>TikTok Integration Demo</h1>
        
        <Routes>
          <Route
            path="/"
            element={
              loading ? (
                <div className="loading">Loading...</div>
              ) : tikTokUser ? (
                <div className="user-profile">
                  <div className="profile-header">
                    <img
                      src={getUserAvatar()}
                      alt="Profile"
                      className="profile-avatar"
                      onError={(e) => {
                        e.currentTarget.src = '/default-avatar.svg';
                      }}
                    />
                    <div className="profile-info">
                      <h2>Welcome, {getUserDisplayName()}!</h2>
                      <p className="user-id">TikTok ID: {getUserId()}</p>
                    </div>
                  </div>
                  
                  <div className="profile-details">
                    {tikTokUser.profile_deep_link && (
                      <div className="detail-row">
                        <span className="detail-label">Profile Link:</span>
                        <a
                          href={tikTokUser.profile_deep_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tiktok-link"
                        >
                          Open TikTok Profile
                        </a>
                      </div>
                    )}

                    {tikTokToken && (
                      <div className="token-info">
                        <h3>Access Token Info</h3>
                        <div className="detail-row">
                          <span className="detail-label">Token Type:</span>
                          <span>{tikTokToken.token_type || 'Bearer'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Expires In:</span>
                          <span>{tikTokToken.expires_in || 'Unknown'} seconds</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Scope:</span>
                          <span>{tikTokToken.scope || 'user.info.basic'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Post Scheduler Component */}
                  <div className="post-scheduler-container">
                    <PostScheduler />
                  </div>
                </div>
              ) : (
                <div className="login-section">
                  <p>Please sign in with your TikTok account:</p>
                  <SignInWithTikTok />
                </div>
              )
            }
          />
          <Route path="/tiktok-callback" element={
            <TikTokCallback 
              onSuccess={handleAuthSuccess} 
              onError={handleAuthError} 
            />
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
