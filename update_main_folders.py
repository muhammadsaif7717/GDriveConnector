import re

with open("main.js", "r") as f:
    content = f.read()

get_files_old = """ipcMain.handle('get-files', async (event, trashed = 0) => {
    return await getFiles(trashed);
});"""
get_files_new = """ipcMain.handle('get-files', async (event, trashed = 0, parentId = 'root') => {
    return await getFiles(trashed, parentId);
});

ipcMain.handle('create-folder', async (event, name, parentId = 'root') => {
    try {
        const { createFolder } = require('./src/fileOps');
        const folder = await createFolder(name, parentId);
        return { success: true, folder };
    } catch (err) {
        return { success: false, error: err.message };
    }
});
"""
content = content.replace(get_files_old, get_files_new)

# Also update upload-file-by-path and upload-file IPC handlers to pass parentId
# upload-file-by-path:
up_path_old = """ipcMain.handle('upload-file-by-path', async (event, filePath) => {"""
up_path_new = """ipcMain.handle('upload-file-by-path', async (event, filePath, parentId = 'root') => {"""
content = content.replace(up_path_old, up_path_new)

up_path_call_old = """            const file = await uploadFile(filePath, (progress) => {
                event.sender.send('upload-progress', { id, filePath, progress });
            }, controller.signal);"""
up_path_call_new = """            const file = await uploadFile(filePath, (progress) => {
                event.sender.send('upload-progress', { id, filePath, progress });
            }, controller.signal, parentId);"""
content = content.replace(up_path_call_old, up_path_call_new)

# upload-file:
up_file_old = """ipcMain.handle('upload-file', async (event) => {"""
up_file_new = """ipcMain.handle('upload-file', async (event, parentId = 'root') => {"""
content = content.replace(up_file_old, up_file_new)

up_file_call_old = """                const file = await uploadFile(task.filePath, (progress) => {
                    event.sender.send('upload-progress', { id: task.id, filePath: task.filePath, progress });
                }, controller.signal);"""
up_file_call_new = """                const file = await uploadFile(task.filePath, (progress) => {
                    event.sender.send('upload-progress', { id: task.id, filePath: task.filePath, progress });
                }, controller.signal, parentId);"""
content = content.replace(up_file_call_old, up_file_call_new)

with open("main.js", "w") as f:
    f.write(content)

