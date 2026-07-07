const { google } = require('googleapis');
const { shell } = require('electron');
const http = require('http');
const db = require('./db');

const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

const SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/userinfo.email'
];

let currentAuthServer = null;

async function getSettings() {
    return new Promise((resolve, reject) => {
        db.get("SELECT client_id, client_secret FROM settings WHERE id = 1", (err, row) => {
            if (err) return reject(err);
            resolve(row || { client_id: '', client_secret: '' });
        });
    });
}

async function getOAuth2Client() {
    const settings = await getSettings();
    if (!settings.client_id || !settings.client_secret) {
        throw new Error("Google API credentials are not configured. Please go to Setup.");
    }
    return new google.auth.OAuth2(settings.client_id, settings.client_secret, REDIRECT_URI);
}

async function authenticate() {
    const oauth2Client = await getOAuth2Client();
    return new Promise((resolve, reject) => {
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
        });

        // Open in default browser
        shell.openExternal(authUrl);

        // Close any existing server to avoid EADDRINUSE
        if (currentAuthServer) {
            currentAuthServer.close();
        }

        // Start a local server to handle the redirect
        currentAuthServer = http.createServer(async (req, res) => {
            try {
                if (req.url.startsWith('/oauth2callback')) {
                    const urlObj = new URL(req.url, 'http://localhost:3000');
                    const code = urlObj.searchParams.get('code');
                    
                    if (code) {
                        res.end('Authentication successful! You can close this tab and return to the app.');
                        currentAuthServer.close();
                        currentAuthServer = null;

                        const { tokens } = await oauth2Client.getToken(code);
                        oauth2Client.setCredentials(tokens);
                        
                        // Fetch user email to store in DB
                        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
                        const userInfo = await oauth2.userinfo.get();
                        const email = userInfo.data.email;

                        // Store in DB
                        db.run(
                            `INSERT OR REPLACE INTO accounts (email, access_token, refresh_token, expiry_date) VALUES (?, ?, ?, ?)`,
                            [email, tokens.access_token, tokens.refresh_token, tokens.expiry_date],
                            function(err) {
                                if (err) {
                                    console.error(err);
                                    return reject(err);
                                }
                                resolve({ email, tokens });
                            }
                        );
                    } else {
                        res.end('Authentication failed. No code found.');
                        currentAuthServer.close();
                        currentAuthServer = null;
                        reject(new Error('No code found in redirect URL'));
                    }
                }
            } catch (err) {
                res.end('Error during authentication.');
                if (currentAuthServer) {
                    currentAuthServer.close();
                    currentAuthServer = null;
                }
                reject(err);
            }
        });

        currentAuthServer.on('error', (err) => {
            console.error("Server error:", err);
            reject(err);
            currentAuthServer = null;
        });

        currentAuthServer.listen(3000, () => {
            console.log('Listening on port 3000 for OAuth callback... ');
        });
    });
}

async function getStorageData() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM accounts", async (err, rows) => {
            if (err) return reject(err);
            
            let total = 0;
            let used = 0;

            if (rows.length === 0) {
                return resolve({ total: 15 * 1024 * 1024 * 1024, used: 0 });
            }

            for (const row of rows) {
                try {
                    const client = await getOAuth2Client();
                    client.setCredentials({
                        access_token: row.access_token,
                        refresh_token: row.refresh_token,
                        expiry_date: row.expiry_date
                    });
                    const drive = google.drive({ version: 'v3', auth: client });
                    const res = await drive.about.get({ fields: 'storageQuota' });
                    
                    const quota = res.data.storageQuota;
                    const accTotal = parseInt(quota.limit || (15 * 1024 * 1024 * 1024), 10);
                    const accUsed = parseInt(quota.usage || 0, 10);
                    
                    total += accTotal;
                    used += accUsed;

                    db.run("UPDATE accounts SET total_space = ?, used_space = ? WHERE id = ?", [accTotal, accUsed, row.id]);
                } catch (e) {
                    console.error("Failed to fetch quota for", row.email, e.message);
                    total += row.total_space || (15 * 1024 * 1024 * 1024);
                    used += row.used_space || 0;
                }
            }
            resolve({ total, used });
        });
    });
}

async function getAccounts() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM accounts", async (err, rows) => {
            if (err) return reject(err);
            
            const updatedRows = [];
            for (const row of rows) {
                try {
                    const client = await getOAuth2Client();
                    client.setCredentials({
                        access_token: row.access_token,
                        refresh_token: row.refresh_token,
                        expiry_date: row.expiry_date
                    });
                    const drive = google.drive({ version: 'v3', auth: client });
                    const res = await drive.about.get({ fields: 'storageQuota' });
                    
                    const quota = res.data.storageQuota;
                    row.total_space = parseInt(quota.limit || (15 * 1024 * 1024 * 1024), 10);
                    row.used_space = parseInt(quota.usage || 0, 10);

                    db.run("UPDATE accounts SET total_space = ?, used_space = ? WHERE id = ?", [row.total_space, row.used_space, row.id]);
                } catch (e) {
                    console.error("Failed to fetch quota for", row.email, e.message);
                }
                updatedRows.push({
                    id: row.id,
                    email: row.email,
                    total_space: row.total_space,
                    used_space: row.used_space
                });
            }
            resolve(updatedRows);
        });
    });
}

async function deleteAccount(id) {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM accounts WHERE id = ?", [id], function(err) {
            if (err) return reject(err);
            resolve(true);
        });
    });
}

module.exports = { authenticate, getStorageData, getAccounts, deleteAccount, getOAuth2Client, getSettings };
