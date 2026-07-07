import re

with open("src/fileOps.js", "r") as f:
    content = f.read()

# Add downloadFile and renameFile before module.exports
new_ops = """
async function downloadFile(id, destPath, onProgress, abortSignal) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM files WHERE id = ?", [id], (err, file) => {
            if (err) return reject(err);
            if (!file) return reject(new Error("File not found"));
            
            db.get("SELECT * FROM accounts WHERE id = ?", [file.account_id], async (err, account) => {
                if (err) return reject(err);
                
                try {
                    oauth2Client.setCredentials({
                        access_token: account.access_token,
                        refresh_token: account.refresh_token
                    });
                    const drive = google.drive({ version: 'v3', auth: oauth2Client });
                    
                    const response = await drive.files.get({
                        fileId: file.file_id,
                        alt: 'media'
                    }, {
                        responseType: 'stream',
                        signal: abortSignal
                    });

                    const dest = fs.createWriteStream(destPath);
                    let downloaded = 0;
                    const totalSize = file.size;

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
                } catch (error) {
                    reject(error);
                }
            });
        });
    });
}

async function renameFile(id, newName) {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM files WHERE id = ?", [id], (err, file) => {
            if (err) return reject(err);
            if (!file) return reject(new Error("File not found"));
            
            db.get("SELECT * FROM accounts WHERE id = ?", [file.account_id], async (err, account) => {
                if (err) return reject(err);
                
                try {
                    oauth2Client.setCredentials({
                        access_token: account.access_token,
                        refresh_token: account.refresh_token
                    });
                    const drive = google.drive({ version: 'v3', auth: oauth2Client });
                    
                    await drive.files.update({
                        fileId: file.file_id,
                        requestBody: { name: newName }
                    });
                    
                    db.run("UPDATE files SET name = ? WHERE id = ?", [newName, id], (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                } catch (error) {
                    reject(error);
                }
            });
        });
    });
}

"""

content = content.replace("module.exports = {", new_ops + "\nmodule.exports = {")

# Expose them
content = content.replace("module.exports = {", "module.exports = {\n    downloadFile,\n    renameFile,")

with open("src/fileOps.js", "w") as f:
    f.write(content)

