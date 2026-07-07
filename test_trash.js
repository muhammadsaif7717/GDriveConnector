require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');
const { google } = require('googleapis');

const dbPath = path.join(os.homedir(), 'Library', 'Application Support', 'gdriveconnector', 'gdriveconnector.db');
const db = new sqlite3.Database(dbPath);

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
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
    
    // First, let's create a file, trash it, and then query it.
    try {
        const createRes = await drive.files.create({
            requestBody: { name: 'test_trash.txt' },
            media: { mimeType: 'text/plain', body: 'Hello' }
        });
        const fileId = createRes.data.id;
        console.log("Created file:", fileId);
        
        await drive.files.update({ fileId: fileId, requestBody: { trashed: true } });
        console.log("Trashed the file");
        
        const listRes = await drive.files.list({
            q: `id='${fileId}'`
        });
        console.log("list without trashed clause:", listRes.data.files.length);
        
        const listRes2 = await drive.files.list({
            q: `id='${fileId}' and (trashed=true or trashed=false)`
        });
        console.log("list with trashed clause:", listRes2.data.files.length);

        await drive.files.delete({ fileId: fileId });
        console.log("Cleaned up");
    } catch (e) {
        console.error(e);
    }
});
