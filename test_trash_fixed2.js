require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');
const { google } = require('googleapis');

const dbPath = path.join(os.homedir(), 'Library', 'Application Support', 'gdriveconnector', 'gdriveconnector.db');
const db = new sqlite3.Database(dbPath);

const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

db.get("SELECT * FROM accounts LIMIT 1", async (err, account) => {
    if (err || !account) return console.log("No account");

    oauth2Client.setCredentials({
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expiry_date: account.expiry_date
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    try {
        const createRes = await drive.files.create({
            requestBody: { name: 'test_trash.txt' },
            media: { mimeType: 'text/plain', body: 'Hello' }
        });
        const fileId = createRes.data.id;
        console.log("Created file:", fileId);
        
        await drive.files.update({ fileId: fileId, requestBody: { trashed: true } });
        
        const qBase = `id='${fileId}'`;
        
        const res1 = await drive.files.list({ q: qBase });
        console.log("res1 (default):", res1.data.files.length);
        
        const res2 = await drive.files.list({ q: `(${qBase}) and trashed=true` });
        console.log("res2 (trashed=true):", res2.data.files.length);

        await drive.files.delete({ fileId: fileId });
        console.log("Cleaned up");
    } catch (e) {
        console.error(e);
    }
});
