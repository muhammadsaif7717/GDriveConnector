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
    if (err || !account) return console.log("No account found");

    oauth2Client.setCredentials({
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expiry_date: account.expiry_date
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    // Find one of the mp4 files
    db.get("SELECT * FROM files WHERE name LIKE 'xsueu%' OR name LIKE 'Yazhinii%' LIMIT 1", async (err, file) => {
        if (!file) return console.log("File not found");
        console.log("File ID:", file.file_id);
        try {
            const res = await drive.files.get({
                fileId: file.file_id,
                fields: 'id, name, thumbnailLink, hasThumbnail, webContentLink'
            });
            console.log("Drive API Response:", res.data);
        } catch (e) {
            console.error("Error", e);
        }
    });
});
