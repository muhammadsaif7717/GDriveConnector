const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { getOAuth2Client } = require('./auth');

// Helper to get all accounts
async function getAccounts() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM accounts", (err, rows) => {
            if (err) return reject(err);
            resolve(rows || []);
        });
    });
}

async function getAccountWithSpace(fileSize) {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM accounts ORDER BY id ASC", (err, rows) => {
            if (err) return reject(err);
            for (const account of rows) {
                const freeSpace = (account.total_space || 15 * 1024 * 1024 * 1024) - (account.used_space || 0);
                if (freeSpace > fileSize) {
                    return resolve(account);
                }
            }
            reject(new Error("Not enough storage across all connected accounts."));
        });
    });
}

async function ensureAppFolder(drive) {
    const query = "name='G Drive Converter' and mimeType='application/vnd.google-apps.folder' and trashed=false";
    const response = await drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive'
    });
    if (response.data.files.length > 0) {
        return response.data.files[0].id;
    } else {
        const folderMetadata = {
            name: 'G Drive Converter',
            mimeType: 'application/vnd.google-apps.folder'
        };
        const folder = await drive.files.create({
            requestBody: folderMetadata,
            fields: 'id'
        });
        return folder.data.id;
    }
}

// Helper to find a file across all accounts
async function findFileInAccounts(fileId) {
    const accounts = await getAccounts();
    for (const account of accounts) {
        var oauth2Client = await getOAuth2Client();
        oauth2Client.setCredentials({
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expiry_date: account.expiry_date
        });
        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        try {
            const response = await drive.files.get({
                fileId: fileId,
                fields: 'id, name, size'
            });
            return { account, file: response.data };
        } catch (e) {
            // File not found in this account, try next
        }
    }
    return { account: null, file: null };
}

async function uploadFile(filePath, onProgress, abortSignal, parentId = 'root') {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const fileName = path.basename(filePath);

    let account;
    let folderId;

    if (parentId === 'root') {
        account = await getAccountWithSpace(fileSize);
        var oauth2Client = await getOAuth2Client();
        oauth2Client.setCredentials({
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expiry_date: account.expiry_date
        });
        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        folderId = await ensureAppFolder(drive);
    } else {
        const { account: parentAccount } = await findFileInAccounts(parentId);
        if (!parentAccount) throw new Error("Parent folder not found");
        account = parentAccount;
        folderId = parentId;
    }

    var oauth2Client = await getOAuth2Client();
    oauth2Client.setCredentials({
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expiry_date: account.expiry_date
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const fileMetadata = {
        name: fileName,
        parents: [folderId]
    };
    const media = {
        body: fs.createReadStream(filePath)
    };

    try {
        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, mimeType, size, thumbnailLink, createdTime'
        }, {
            signal: abortSignal,
            onUploadProgress: evt => {
                if (onProgress) {
                    const progress = (evt.bytesRead / fileSize) * 100;
                    onProgress(Math.round(progress));
                }
            }
        });

        const driveFile = response.data;
        
        await new Promise((resolve) => {
            db.run(`UPDATE accounts SET used_space = used_space + ? WHERE id = ?`, [fileSize, account.id], resolve);
        });

        return {
            id: driveFile.id,
            name: driveFile.name,
            mimeType: driveFile.mimeType,
            size: driveFile.size || fileSize,
            thumbnail_link: driveFile.thumbnailLink || '',
            created_at: new Date(driveFile.createdTime || Date.now()).getTime(),
            account_id: account.id
        };
    } catch (error) {
        console.error("Error uploading to Google Drive", error);
        throw error;
    }
}

async function getFiles(trashed = 0, parentId = 'root') {
    const accounts = await getAccounts();
    const allFiles = [];

    for (const account of accounts) {
        var oauth2Client = await getOAuth2Client();
        oauth2Client.setCredentials({
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expiry_date: account.expiry_date
        });
        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        
        let q = trashed === 1 ? 'trashed = true' : 'trashed = false';
        if (trashed === -1) {
            q = ''; 
        }

        if (parentId === 'root') {
            const appFolderId = await ensureAppFolder(drive);
            q = q ? `${q} and '${appFolderId}' in parents` : `'${appFolderId}' in parents`;
        } else {
            q = q ? `${q} and '${parentId}' in parents` : `'${parentId}' in parents`;
        }

        try {
            const response = await drive.files.list({
                q: q,
                fields: 'files(id, name, mimeType, size, thumbnailLink, createdTime, trashed)',
                spaces: 'drive',
                pageSize: 1000
            });

            if (response.data.files) {
                for (const file of response.data.files) {
                    allFiles.push({
                        id: file.id,
                        name: file.name,
                        mimeType: file.mimeType,
                        size: parseInt(file.size || 0, 10),
                        thumbnail_link: file.thumbnailLink || '',
                        created_at: file.createdTime ? new Date(file.createdTime).getTime() : Date.now(),
                        trashed: file.trashed ? 1 : 0,
                        account_id: account.id
                    });
                }
            }
        } catch (err) {
            console.error(`Failed to fetch files for account ${account.email}:`, err);
        }
    }
    
    return allFiles;
}

async function createFolder(name, parentId = 'root') {
    const accounts = await getAccounts();
    if (accounts.length === 0) throw new Error("No account linked");
    
    let account = accounts[0];
    let folderId = parentId;

    if (parentId === 'root') {
        var oauth2Client = await getOAuth2Client();
        oauth2Client.setCredentials({
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expiry_date: account.expiry_date
        });
        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        folderId = await ensureAppFolder(drive);
    } else {
        const found = await findFileInAccounts(parentId);
        if (!found.account) throw new Error("Parent folder not found");
        account = found.account;
    }

    var oauth2Client = await getOAuth2Client();
    oauth2Client.setCredentials({
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expiry_date: account.expiry_date
    });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const fileMetadata = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [folderId]
    };

    const res = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, name, mimeType'
    });

    const driveFile = res.data;
    return {
        id: driveFile.id,
        name: driveFile.name,
        mimeType: driveFile.mimeType,
        size: 0,
        account_id: account.id,
        thumbnail_link: '',
        created_at: Date.now()
    };
}

async function moveToTrash(id) {
    const { account } = await findFileInAccounts(id);
    if (!account) throw new Error("File not found");
    
    var oauth2Client = await getOAuth2Client();
    oauth2Client.setCredentials({
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expiry_date: account.expiry_date
    });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    await drive.files.update({
        fileId: id,
        requestBody: { trashed: true }
    });
    return { success: true };
}

async function restoreFromTrash(id) {
    const { account } = await findFileInAccounts(id);
    if (!account) throw new Error("File not found");
    
    var oauth2Client = await getOAuth2Client();
    oauth2Client.setCredentials({
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expiry_date: account.expiry_date
    });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    await drive.files.update({
        fileId: id,
        requestBody: { trashed: false }
    });
    return { success: true };
}

async function deletePermanently(id) {
    const { account, file } = await findFileInAccounts(id);
    if (!account) throw new Error("File not found");
    
    var oauth2Client = await getOAuth2Client();
    oauth2Client.setCredentials({
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expiry_date: account.expiry_date
    });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    await drive.files.delete({ fileId: id });
    
    if (file && file.size) {
        await new Promise((res) => {
            db.run("UPDATE accounts SET used_space = MAX(0, used_space - ?) WHERE id = ?", [file.size, account.id], res);
        });
    }
    
    return { success: true };
}

async function emptyTrash() {
    const accounts = await getAccounts();
    for (const account of accounts) {
        var oauth2Client = await getOAuth2Client();
        oauth2Client.setCredentials({
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expiry_date: account.expiry_date
        });
        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        try {
            const appFolderId = await ensureAppFolder(drive);
            const q = `trashed = true and '${appFolderId}' in parents`;
            const response = await drive.files.list({
                q: q,
                fields: 'files(id)',
                spaces: 'drive',
                pageSize: 1000
            });
            if (response.data.files) {
                for (const file of response.data.files) {
                    await drive.files.delete({ fileId: file.id });
                }
            }
        } catch (e) {
            console.error(`Failed to empty trash for account ${account.email}`, e);
        }
    }
    return { success: true };
}

async function downloadFile(id, destPath, onProgress, abortSignal) {
    const { account, file } = await findFileInAccounts(id);
    if (!account) throw new Error("File not found");
    
    var oauth2Client = await getOAuth2Client();
    oauth2Client.setCredentials({
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expiry_date: account.expiry_date
    });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    const response = await drive.files.get({
        fileId: id,
        alt: 'media'
    }, {
        responseType: 'stream',
        signal: abortSignal
    });

    return new Promise((resolve, reject) => {
        const dest = fs.createWriteStream(destPath);
        let downloaded = 0;
        const totalSize = parseInt(file.size || 0, 10);

        response.data.on('data', (chunk) => {
            downloaded += chunk.length;
            if (onProgress && totalSize) {
                onProgress(Math.round((downloaded / totalSize) * 100));
            }
        });

        response.data.on('end', () => resolve(destPath));
        response.data.on('error', (err) => {
            dest.close();
            fs.unlink(destPath, () => {});
            reject(err);
        });
        
        response.data.pipe(dest);
    });
}

async function getFileDownloadLink(id) {
    const { account } = await findFileInAccounts(id);
    if (!account) throw new Error("File not found");
    
    var oauth2Client = await getOAuth2Client();
    oauth2Client.setCredentials({
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expiry_date: account.expiry_date
    });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    const response = await drive.files.get({
        fileId: id,
        fields: 'webContentLink, webViewLink'
    });
    
    const link = response.data.webContentLink || response.data.webViewLink;
    if (!link) {
        throw new Error("No download link available for this file.");
    }
    return link;
}

async function renameFile(id, newName) {
    const { account } = await findFileInAccounts(id);
    if (!account) throw new Error("File not found");
    
    var oauth2Client = await getOAuth2Client();
    oauth2Client.setCredentials({
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expiry_date: account.expiry_date
    });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    await drive.files.update({
        fileId: id,
        requestBody: { name: newName }
    });
}

module.exports = {
    createFolder,
    downloadFile,
    getFileDownloadLink,
    restoreFromTrash,
    renameFile, 
    uploadFile, 
    getFiles, 
    moveToTrash, 
    deletePermanently, 
    emptyTrash 
};
