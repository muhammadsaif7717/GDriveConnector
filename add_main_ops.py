import re

with open("main.js", "r") as f:
    content = f.read()

# Update import
content = content.replace("const { uploadFile, getFiles, moveToTrash, deletePermanently, emptyTrash }", "const { uploadFile, downloadFile, renameFile, getFiles, moveToTrash, deletePermanently, emptyTrash }")

# Add IPC handlers
new_ipc = """
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

ipcMain.handle('download-file', async (event, id, defaultName) => {
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Download File',
        defaultPath: defaultName
    });

    if (canceled || !filePath) return { success: false, canceled: true };

    const taskId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const task = { id: taskId, name: defaultName };

    setTimeout(async () => {
        const controller = new AbortController();
        activeUploads.set(taskId, controller);
        try {
            await downloadFile(id, filePath, (progress) => {
                event.sender.send('upload-progress', { id: taskId, progress });
            }, controller.signal);
            activeUploads.delete(taskId);
            event.sender.send('upload-complete', { id: taskId });
            // Optionally, open the folder where it was downloaded
            // shell.showItemInFolder(filePath);
        } catch (err) {
            activeUploads.delete(taskId);
            event.sender.send('upload-error', { id: taskId, error: err.message });
        }
    }, 0);

    return { success: true, tasks: [task] };
});

ipcMain.handle('open-file-locally', async (event, id, fileName) => {
    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, fileName);

    const taskId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const task = { id: taskId, name: "Opening: " + fileName };

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
"""

content = content.replace("const fs = require('fs');", new_ipc + "\nconst fs = require('fs');")

with open("main.js", "w") as f:
    f.write(content)
