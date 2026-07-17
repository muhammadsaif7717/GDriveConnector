import * as AuthSession from 'expo-auth-session';
import { getSettings, getDb } from './DatabaseService';

// Google OAuth Endpoints
const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// Scopes required for Google Drive
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

/**
 * Exchanges the authorization code for an access and refresh token.
 */
export const exchangeCodeForToken = async (code: string, redirectUri: string) => {
  const settings = await getSettings();
  if (!settings || !settings.client_id || !settings.client_secret) {
    throw new Error('Client ID or Secret is missing in settings.');
  }

  const response = await fetch(discovery.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: settings.client_id,
      client_secret: settings.client_secret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Failed to exchange token');
  }

  return data; // { access_token, refresh_token, expires_in, ... }
};

/**
 * Refreshes the access token using the refresh token.
 */
export const refreshAccessToken = async (refreshToken: string) => {
  const settings = await getSettings();
  if (!settings || !settings.client_id || !settings.client_secret) {
    throw new Error('Client ID or Secret is missing in settings.');
  }

  const response = await fetch(discovery.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: settings.client_id,
      client_secret: settings.client_secret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Failed to refresh token');
  }

  return data; // { access_token, expires_in, ... }
};

/**
 * Fetches user profile to get the email address.
 */
export const fetchUserInfo = async (accessToken: string) => {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }
  
  return await response.json(); // { id, email, name, picture, ... }
};

/**
 * Saves or updates account information in the SQLite database.
 */
export const saveAccount = async (email: string, accessToken: string, refreshToken: string, expiresIn: number) => {
  const db = getDb();
  const expiryDate = Date.now() + expiresIn * 1000;
  
  const existingAccount = await db.getFirstAsync('SELECT * FROM accounts WHERE email = ?', [email]);
  
  if (existingAccount) {
    await db.runAsync(
      'UPDATE accounts SET access_token = ?, refresh_token = ?, expiry_date = ? WHERE email = ?',
      [accessToken, refreshToken || (existingAccount as any).refresh_token, expiryDate, email]
    );
  } else {
    await db.runAsync(
      'INSERT INTO accounts (email, access_token, refresh_token, expiry_date) VALUES (?, ?, ?, ?)',
      [email, accessToken, refreshToken, expiryDate]
    );
  }
};
