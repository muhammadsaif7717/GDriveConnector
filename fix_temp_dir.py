import re

with open("main.js", "r") as f:
    content = f.read()

# Fix open-file-locally
old_open = """ipcMain.handle('open-file-locally', async (event, id, fileName) => {
    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, fileName);"""

new_open = """ipcMain.handle('open-file-locally', async (event, id, fileName) => {
    const tempDir = path.join(os.tmpdir(), 'gdriveconnector_cache');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, fileName);"""

content = content.replace(old_open, new_open)

# Fix ondragstart
old_drag = """ipcMain.on('ondragstart', async (event, id, name) => {
    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, name);"""

new_drag = """ipcMain.on('ondragstart', async (event, id, name) => {
    const tempDir = path.join(os.tmpdir(), 'gdriveconnector_cache');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, name);"""

content = content.replace(old_drag, new_drag)

# Fix clear-cache
old_clear = """ipcMain.handle('clear-cache', async () => {
    try {
        const { session } = require('electron');
        await session.defaultSession.clearCache();
        await session.defaultSession.clearStorageData();
        return { success: true };"""

new_clear = """ipcMain.handle('clear-cache', async () => {
    try {
        const { session } = require('electron');
        await session.defaultSession.clearCache();
        await session.defaultSession.clearStorageData();
        
        // Clear hidden temporary downloaded files
        const tempDir = path.join(os.tmpdir(), 'gdriveconnector_cache');
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        
        return { success: true };"""

content = content.replace(old_clear, new_clear)

with open("main.js", "w") as f:
    f.write(content)
