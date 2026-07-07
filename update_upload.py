import re

with open("src/fileOps.js", "r") as f:
    content = f.read()

upload_old = """async function uploadFile(filePath, onProgress, abortSignal) {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const fileName = path.basename(filePath);

    // 1. Find an account with enough space
    const account = await getAccountWithSpace(fileSize);

    // 2. Set credentials for this specific account
    oauth2Client.setCredentials({
        access_token: account.access_token,
        refresh_token: account.refresh_token
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // 3. Ensure "G Drive Connector" folder exists
    const folderId = await ensureAppFolder(drive);

    // 4. Upload file to Google Drive inside the folder
    const fileMetadata = {
        name: fileName,
        parents: [folderId]
    };"""

upload_new = """async function uploadFile(filePath, onProgress, abortSignal, parentId = 'root') {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const fileName = path.basename(filePath);

    let account;
    let folderId;

    if (parentId === 'root') {
        account = await getAccountWithSpace(fileSize);
        oauth2Client.setCredentials({
            access_token: account.access_token,
            refresh_token: account.refresh_token
        });
        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        folderId = await ensureAppFolder(drive);
    } else {
        // Fetch parent folder and its account
        const parentFolder = await new Promise((res, rej) => {
            db.get("SELECT * FROM files WHERE id = ?", [parentId], (err, row) => {
                if (err) rej(err);
                if (!row) rej(new Error("Parent folder not found"));
                res(row);
            });
        });
        account = await new Promise((res, rej) => {
            db.get("SELECT * FROM accounts WHERE id = ?", [parentFolder.account_id], (err, row) => {
                if (err) rej(err);
                res(row);
            });
        });
        folderId = parentFolder.file_id;
    }

    oauth2Client.setCredentials({
        access_token: account.access_token,
        refresh_token: account.refresh_token
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const fileMetadata = {
        name: fileName,
        parents: [folderId]
    };"""

content = content.replace(upload_old, upload_new)

# Also update the INSERT statement in uploadFile
insert_old = """                `INSERT INTO files (file_id, name, mime_type, size, account_id) VALUES (?, ?, ?, ?, ?)`,
                [driveFile.id, driveFile.name, driveFile.mimeType, driveFile.size || fileSize, account.id],"""
insert_new = """                `INSERT INTO files (file_id, name, mime_type, size, parent_id, account_id) VALUES (?, ?, ?, ?, ?, ?)`,
                [driveFile.id, driveFile.name, driveFile.mimeType, driveFile.size || fileSize, parentId, account.id],"""

content = content.replace(insert_old, insert_new)

with open("src/fileOps.js", "w") as f:
    f.write(content)
