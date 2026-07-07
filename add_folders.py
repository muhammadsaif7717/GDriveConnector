import re

with open("src/fileOps.js", "r") as f:
    content = f.read()

get_files_old = """async function getFiles(trashed = 0) {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM files WHERE trashed = ?", [trashed ? 1 : 0], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}"""

get_files_new = """async function getFiles(trashed = 0, parentId = 'root') {
    return new Promise((resolve, reject) => {
        let query = "SELECT * FROM files WHERE trashed = ?";
        let params = [trashed ? 1 : 0];
        
        if (!trashed) {
            if (parentId === 'root') {
                query += " AND (parent_id = 'root' OR parent_id IS NULL)";
            } else {
                query += " AND parent_id = ?";
                params.push(parentId);
            }
        }
        
        db.all(query, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

async function createFolder(name, parentId = 'root') {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM accounts LIMIT 1", async (err, account) => {
            if (err || !account) return reject(new Error("No account linked"));
            
            try {
                oauth2Client.setCredentials({
                    access_token: account.access_token,
                    refresh_token: account.refresh_token
                });
                const drive = google.drive({ version: 'v3', auth: oauth2Client });
                
                const fileMetadata = {
                    name: name,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: parentId === 'root' ? [] : [parentId]
                };
                
                const res = await drive.files.create({
                    requestBody: fileMetadata,
                    fields: 'id, name, mimeType, size'
                });
                
                const driveFile = res.data;
                
                db.run(
                    "INSERT INTO files (file_id, name, mime_type, size, parent_id, account_id) VALUES (?, ?, ?, ?, ?, ?)",
                    [driveFile.id, driveFile.name, driveFile.mimeType, 0, parentId, account.id],
                    function(err) {
                        if (err) return reject(err);
                        driveFile.local_id = this.lastID;
                        resolve(driveFile);
                    }
                );
            } catch (error) {
                reject(error);
            }
        });
    });
}
"""

content = content.replace(get_files_old, get_files_new)
content = content.replace("module.exports = {", "module.exports = {\n    createFolder,")

with open("src/fileOps.js", "w") as f:
    f.write(content)
