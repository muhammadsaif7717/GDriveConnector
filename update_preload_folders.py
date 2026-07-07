import re

with open("src/preload.js", "r") as f:
    content = f.read()

# Update getFiles
get_old = """  getFiles: (trashed) => ipcRenderer.invoke('get-files', trashed),"""
get_new = """  getFiles: (trashed, parentId = 'root') => ipcRenderer.invoke('get-files', trashed, parentId),
  createFolder: (name, parentId = 'root') => ipcRenderer.invoke('create-folder', name, parentId),"""
content = content.replace(get_old, get_new)

# Update uploadFile
up_old = """  uploadFile: () => ipcRenderer.invoke('upload-file'),"""
up_new = """  uploadFile: (parentId = 'root') => ipcRenderer.invoke('upload-file', parentId),"""
content = content.replace(up_old, up_new)

# Update uploadFileByPath
up_path_old = """  uploadFileByPath: (filePath) => ipcRenderer.invoke('upload-file-by-path', filePath),"""
up_path_new = """  uploadFileByPath: (filePath, parentId = 'root') => ipcRenderer.invoke('upload-file-by-path', filePath, parentId),"""
content = content.replace(up_path_old, up_path_new)

with open("src/preload.js", "w") as f:
    f.write(content)

