import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// TikTok OAuth Credentials - USE DIRECT VALUES INSTEAD OF CONSTANTS
// The constants might be cached by the browser or have scope issues

// Removed dynamic backend URL import
const BACKEND_URL = "https://emmanueltech.store/";

// Generate a random string for PKCE code_verifier
const generateCodeVerifier = (): string => {
  return uuidv4() + uuidv4().replace(/-/g, '');
};

// Create a code challenge from the code verifier
const generateCodeChallenge = async (codeVerifier: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

// Generate a random state parameter to prevent CSRF attacks
const generateRandomState = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

// Generate the authorization URL for the "Sign in with TikTok" flow
export const getAuthorizationUrl = async (): Promise<{ url: string, codeVerifier: string }> => {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomState();

  // Use fixed redirect URI for backend
  const redirectUri = `${BACKEND_URL}api/tiktok/callback/`;
  console.log(`Using fixed redirect URI: ${redirectUri}`);

  const url = `https://www.tiktok.com/v2/auth/authorize/` +
    `?client_key=sbawk31qvbdug7ikco` +
    `&response_type=code` +
    `&scope=user.info.basic` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}` +
    `&code_challenge=${codeChallenge}` +
    `&code_challenge_method=S256`;

  console.log("FULL AUTH URL:", url);
  
  return { url, codeVerifier };
};

// Types for TikTok responses
export interface TikTokTokenResponse {
  access_token: string;
  expires_in: number;
  open_id: string;
  refresh_token: string;
  refresh_expires_in: number;
  scope: string;
  token_type: string;
}

export interface TikTokUserInfo {
  open_id: string;
  union_id: string;
  avatar_url: string;
  avatar_url_100: string;
  avatar_url_200: string;
  display_name: string;
  profile_deep_link: string;
}

// Handle immediate retry for expired codes
export const handleExpiredCode = async (): Promise<void> => {
  // Clear all oauth-related data
  localStorage.removeItem('tiktok_token');
  localStorage.removeItem('tiktok_user');
  localStorage.removeItem('tiktok_error_details');
  localStorage.removeItem('tiktok_code_verifier_backup');
  localStorage.removeItem('tiktok_last_auth_attempt');

  sessionStorage.removeItem('tiktok_code_verifier');

  // Log the action
  console.log('Authorization code expired, re-initiating login flow immediately');

  try {
    const { url, codeVerifier } = await getAuthorizationUrl();
    // Store the code verifier in both session and as backup
    sessionStorage.setItem('tiktok_code_verifier', codeVerifier);
    localStorage.setItem('tiktok_code_verifier_backup', codeVerifier);
    // Immediately redirect to the generated authorization URL
    window.location.href = url;
  } catch (error) {
    console.error('Failed to re-initiate login flow', error);
    // Optionally, fallback to home
    window.location.href = window.location.origin + '/';
  }
};

// Exchange authorization code for access token
export const exchangeCodeForToken = async (code: string, code_verifier: string): Promise<TikTokTokenResponse> => {
  try {
    const tokenEndpoint = `${BACKEND_URL}api/tiktok/token/`;
    console.log(`Exchanging code for token at: ${tokenEndpoint}`);
    console.log(`Using code_verifier: ${code_verifier.substring(0, 10)}...`);
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      }
    };
    const response = await axios.post(tokenEndpoint, { code, code_verifier }, config);

    // Process response
    const tokenInfo = response.data;
    
    if (!tokenInfo.access_token) {
      throw new Error('Failed to obtain access token');
    }
    
    return tokenInfo;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    
    throw error;
  }
};

// Get user information
export const getUserInfo = async (accessToken: string, openId: string): Promise<TikTokUserInfo> => {
  try {
    const userInfoEndpoint = `${BACKEND_URL}api/tiktok/user-info/?access_token=${accessToken}&open_id=${openId}`;
    console.log(`Fetching user info from: ${userInfoEndpoint}`);
    const response = await axios.get(userInfoEndpoint);
    const userInfo = response.data;
    if (!userInfo || !userInfo.open_id) {
      throw new Error("Failed to obtain user information");
    }
    return userInfo;
  } catch (error) {
    console.error("Error fetching user information:", error);
    throw error;
  }
};

// New function to handle TikTok callback with fallback on network/CORS errors
export const handleTikTokCallback = async (code: string): Promise<{ tokenInfo: TikTokTokenResponse, userInfo: TikTokUserInfo }> => {
  try {
    // Retrieve the code verifier from sessionStorage or localStorage backup
    let codeVerifier = sessionStorage.getItem('tiktok_code_verifier') || localStorage.getItem('tiktok_code_verifier_backup');
    if (!codeVerifier) {
      throw new Error('Missing code verifier. Please try signing in again.');
    }

    // Attempt to exchange the authorization code for an access token
    const tokenInfo = await exchangeCodeForToken(code, codeVerifier);
    
    // Use the access token and open_id to fetch user information
    const userInfo = await getUserInfo(tokenInfo.access_token, tokenInfo.open_id);
    
    return { tokenInfo, userInfo };
  } catch (error) {
    throw error;
  }
};