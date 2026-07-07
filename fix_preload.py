import re

with open("src/preload.js", "r") as f:
    content = f.read()

# Add parentId to getFiles
content = re.sub(
    r"getFiles: \(trashed = 0\) => ipcRenderer\.invoke\('get-files', trashed\),",
    r"getFiles: (trashed = 0, parentId = 'root') => ipcRenderer.invoke('get-files', trashed, parentId),",
    content
)

# Add createFolder
if "createFolder:" not in content:
    content = content.replace(
        "uploadFileByPath: (path) => ipcRenderer.invoke('upload-file-by-path', path),",
        "uploadFileByPath: (path, parentId = 'root') => ipcRenderer.invoke('upload-file-by-path', path, parentId),\n  createFolder: (name, parentId = 'root') => ipcRenderer.invoke('create-folder', name, parentId),"
    )

with open("src/preload.js", "w") as f:
    f.write(content)
