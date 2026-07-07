const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, 'src/assets/logo.png'));
  }
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "G Drive Connector",
    icon: path.join(__dirname, 'src/assets/logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

const { authenticate, getStorageData, getAccounts, deleteAccount } = require('./src/auth');
const { uploadFile, downloadFile, getFileDownloadLink, renameFile, restoreFromTrash, getFiles, moveToTrash, deletePermanently, emptyTrash } = require('./src/fileOps');
const { dialog } = require('electron');

// IPC communication handlers will go here
ipcMain.handle('get-storage-info', async () => {
    try {
        const data = await getStorageData();
        return data;
    } catch (err) {
        console.error(err);
        return { total: 0, used: 0 };
    }
});

ipcMain.handle('add-account', async (event) => {
    try {
        const result = await authenticate();
        return { success: true, email: result.email };
    } catch (err) {
        console.error("Auth error:", err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('get-files', async (event, trashed, parentId = 'root') => {
    try {
        const files = await getFiles(trashed, parentId);
        return { success: true, files };
    } catch (err) {
        console.error("Error getting files:", err);
        return { success: false, error: err.message };
    }
});

const https = require('https');
ipcMain.handle('get-thumbnail', async (event, url, accountId) => {
    return new Promise((resolve) => {
        db.get("SELECT access_token FROM accounts WHERE id = ?", [accountId], (err, row) => {
            if (err || !row || !row.access_token) return resolve({ success: false, error: 'Token not found' });
            
            https.get(url, { headers: { Authorization: `Bearer ${row.access_token}` } }, (res) => {
                if (res.statusCode !== 200) return resolve({ success: false, error: 'Status ' + res.statusCode });
                const chunks = [];
                res.on('data', d => chunks.push(d));
                res.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    const contentType = res.headers['content-type'] || 'image/jpeg';
                    resolve({ success: true, dataUrl: `data:${contentType};base64,${buffer.toString('base64')}` });
                });
            }).on('error', e => resolve({ success: false, error: e.message }));
        });
    });
});

ipcMain.handle('move-to-trash', async (event, id) => {
    try {
        await moveToTrash(id);
        return { success: true };
    } catch (err) {
        console.error(err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('restore-from-trash', async (event, id) => {
    try {
        await restoreFromTrash(id);
        return { success: true };
    } catch (err) {
        console.error(err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('delete-permanently', async (event, id) => {
    try {
        await deletePermanently(id);
        return { success: true };
    } catch (err) {
        console.error(err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('empty-trash', async () => {
    try {
        const res = await emptyTrash();
        return res;
    } catch (err) {
        console.error("Empty trash error:", err);
        return { success: false, error: err.message };
    }
});

const activeUploads = new Map();

ipcMain.handle('cancel-upload', async (event, id) => {
    if (activeUploads.has(id)) {
        activeUploads.get(id).abort();
        activeUploads.delete(id);
        return { success: true };
    }
    return { success: false, error: 'Upload not found' };
});

ipcMain.handle('upload-file-by-path', async (event, filePath, parentId = 'root') => {
    if (!filePath || typeof filePath !== 'string') {
        return { success: false, error: 'Invalid file path received. Please drop a valid local file.' };
    }
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const task = { id, filePath, name: path.basename(filePath) };
    
    event.sender.send('transfer-start', { id: task.id, name: task.name, type: 'upload' });

    // Process asynchronously
    setTimeout(async () => {
        const controller = new AbortController();
        activeUploads.set(id, controller);
        try {
            const file = await uploadFile(filePath, (progress) => {
                event.sender.send('upload-progress', { id, filePath, progress });
            }, controller.signal, parentId);
            activeUploads.delete(id);
            event.sender.send('upload-complete', { id, file });
        } catch (err) {
            activeUploads.delete(id);
            event.sender.send('upload-error', { id, error: err.message });
        }
    }, 0);
    
    return { success: true, tasks: [task] };
});

ipcMain.handle('upload-file', async (event, parentId = 'root') => {
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'multiSelections']
    });

    if (canceled || filePaths.length === 0) return { success: false, canceled: true };

    const tasks = filePaths.map(filePath => {
        return { id: Date.now().toString() + Math.random().toString(36).substr(2, 5), filePath, name: path.basename(filePath) };
    });

    tasks.forEach(task => {
        event.sender.send('transfer-start', { id: task.id, name: task.name, type: 'upload' });
    });

    // Start asynchronously
    setTimeout(async () => {
        for (const task of tasks) {
            const controller = new AbortController();
            activeUploads.set(task.id, controller);
            try {
                const file = await uploadFile(task.filePath, (progress) => {
                    event.sender.send('upload-progress', { id: task.id, filePath: task.filePath, progress });
                }, controller.signal, parentId);
                activeUploads.delete(task.id);
                event.sender.send('upload-complete', { id: task.id, file });
            } catch (err) {
                activeUploads.delete(task.id);
                event.sender.send('upload-error', { id: task.id, error: err.message });
            }
        }
    }, 0);

    return { success: true, tasks };
});


const os = require('os');
const { shell } = require('electron');

ipcMain.handle('rename-file', async (event, id, newName) => {
    try {
        await renameFile(id, newName);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('download-files', async (event, files) => {
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    
    let destDir = '';
    if (files.length === 1) {
        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Download File',
            defaultPath: files[0].name
        });
        if (canceled || !filePath) return { success: false, canceled: true };
        files[0].savePath = filePath;
    } else {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            title: 'Select Download Folder',
            properties: ['openDirectory']
        });
        if (canceled || filePaths.length === 0) return { success: false, canceled: true };
        destDir = filePaths[0];
        files.forEach(f => {
            f.savePath = path.join(destDir, f.name);
        });
    }

    const tasks = [];
    files.forEach(file => {
        const taskId = 'dl-' + Date.now().toString() + Math.random().toString(36).substr(2, 5);
        tasks.push({ id: taskId, name: file.name, type: 'download' });
        
        event.sender.send('transfer-start', { id: taskId, name: file.name, type: 'download' });

        setTimeout(async () => {
            const controller = new AbortController();
            activeUploads.set(taskId, controller);
            try {
                await downloadFile(file.id, file.savePath, (progress) => {
                    event.sender.send('upload-progress', { id: taskId, progress });
                }, controller.signal);
                activeUploads.delete(taskId);
                event.sender.send('upload-complete', { id: taskId });
            } catch (err) {
                activeUploads.delete(taskId);
                event.sender.send('upload-error', { id: taskId, error: err.message });
            }
        }, 0);
    });

    return { success: true, tasks };
});

ipcMain.handle('open-file-locally', async (event, id, fileName) => {
    const tempDir = path.join(os.tmpdir(), 'gdriveconnector_cache');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, fileName);

    const taskId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const task = { id: taskId, name: "Opening: " + fileName };

    event.sender.send('transfer-start', { id: taskId, name: task.name, type: 'download' });

    setTimeout(async () => {
        const controller = new AbortController();
        activeUploads.set(taskId, controller);
        try {
            await downloadFile(id, filePath, (progress) => {
                event.sender.send('upload-progress', { id: taskId, progress });
            }, controller.signal);
            activeUploads.delete(taskId);
            event.sender.send('upload-complete', { id: taskId });
            
            // Open the file with default system app
            shell.openPath(filePath);
        } catch (err) {
            activeUploads.delete(taskId);
            event.sender.send('upload-error', { id: taskId, error: err.message });
        }
    }, 0);

    return { success: true, tasks: [task] };
});


ipcMain.on('ondragstart', async (event, id, name) => {
    const tempDir = path.join(os.tmpdir(), 'gdriveconnector_cache');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, name);
    try {
        await downloadFile(id, filePath);
        event.sender.startDrag({
            file: filePath,
            icon: path.join(__dirname, 'assets/icon.png')
        });
    } catch(err) {
        console.error("Drag start error:", err);
    }
});

const fs = require('fs');
const db = require('./src/db');


ipcMain.handle('get-settings', async () => {
    return new Promise((resolve) => {
        db.get("SELECT client_id, client_secret FROM settings WHERE id = 1", (err, row) => {
            if (err) return resolve({ success: false, error: err.message });
            resolve({ success: true, settings: row || { client_id: '', client_secret: '' } });
        });
    });
});

ipcMain.handle('save-settings', async (event, settings) => {
    return new Promise((resolve) => {
        db.run(
            "INSERT OR REPLACE INTO settings (id, client_id, client_secret) VALUES (1, ?, ?)",
            [settings.client_id, settings.client_secret],
            function(err) {
                if (err) return resolve({ success: false, error: err.message });
                resolve({ success: true });
            }
        );
    });
});

ipcMain.handle('get-storage-breakdown', async () => {
    try {
        const files = await getFiles(-1); // Get all files to calculate total space
        const breakdown = {
            images: 0,
            videos: 0,
            documents: 0,
            others: 0
        };
        files.forEach(r => {
            if (r.trashed) return;
            const mime = r.mimeType || '';
            const size = r.size || 0;
            if (mime.includes('image')) breakdown.images += size;
            else if (mime.includes('video')) breakdown.videos += size;
            else if (mime.includes('document') || mime.includes('pdf') || mime.includes('spreadsheet') || mime.includes('presentation')) breakdown.documents += size;
            else breakdown.others += size;
        });
        return breakdown;
    } catch (err) {
        console.error(err);
        return { images: 0, videos: 0, documents: 0, others: 0 };
    }
});
ipcMain.handle('get-accounts', async () => {
    try {
        const accounts = await getAccounts();
        console.log("get-accounts returned:", accounts.length, "accounts");
        return accounts;
    } catch (err) {
        console.error("get-accounts error:", err);
        return [];
    }
});

ipcMain.handle('delete-account', async (event, id) => {
    try {
        await deleteAccount(id);
        return { success: true };
    } catch (err) {
        console.error(err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('export-data', async (event) => {
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Accounts Backup',
        defaultPath: 'gdrive_backup.json',
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    try {
        return new Promise((resolve) => {
            db.all("SELECT * FROM accounts", (err, accountsRows) => {
                if (err) return resolve({ success: false, error: err.message });
                db.get("SELECT client_id, client_secret FROM settings WHERE id = 1", (err, settingsRow) => {
                    if (err) return resolve({ success: false, error: err.message });
                    const backupData = {
                        accounts: accountsRows,
                        settings: settingsRow || { client_id: '', client_secret: '' }
                    };
                    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
                    resolve({ success: true, path: filePath });
                });
            });
        });
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('import-data', async (event) => {
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Import Accounts Backup',
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        properties: ['openFile']
    });

    if (canceled || filePaths.length === 0) return { success: false, canceled: true };

    try {
        const rawData = JSON.parse(fs.readFileSync(filePaths[0], 'utf-8'));
        
        let accounts = [];
        let settings = null;
        
        if (Array.isArray(rawData)) {
            accounts = rawData;
        } else if (rawData.accounts) {
            accounts = rawData.accounts;
            settings = rawData.settings;
        }
        
        return new Promise((resolve) => {
            db.serialize(() => {
                db.run("BEGIN TRANSACTION");
                
                if (settings) {
                    db.run(
                        "INSERT OR REPLACE INTO settings (id, client_id, client_secret) VALUES (1, ?, ?)",
                        [settings.client_id || '', settings.client_secret || '']
                    );
                }
                
                if (accounts && accounts.length > 0) {
                    db.run("DELETE FROM accounts");
                    const stmt = db.prepare(`INSERT OR REPLACE INTO accounts (id, email, access_token, refresh_token, expiry_date, total_space, used_space) VALUES (?, ?, ?, ?, ?, ?, ?)`);
                    for (const acc of accounts) {
                        stmt.run([acc.id, acc.email, acc.access_token, acc.refresh_token, acc.expiry_date, acc.total_space, acc.used_space]);
                    }
                    stmt.finalize();
                }
                
                db.run("COMMIT", (err) => {
                    if (err) resolve({ success: false, error: err.message });
                    else resolve({ success: true });
                });
            });
        });
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('open-external', async (event, url) => {
    require('electron').shell.openExternal(url);
});

ipcMain.handle('clear-cache', async () => {
    try {
        const { session } = require('electron');
        await session.defaultSession.clearCache();
        await session.defaultSession.clearStorageData();
        
        // Clear hidden temporary downloaded files
        const tempDir = path.join(os.tmpdir(), 'gdriveconnector_cache');
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        
        return { success: true };
    } catch (err) {
        console.error(err);
        return { success: false, error: err.message };
    }
});
