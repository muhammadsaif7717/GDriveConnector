import re

with open("src/preload.js", "r") as f:
    content = f.read()

new_preload = """
  renameFile: (id, newName) => ipcRenderer.invoke('rename-file', id, newName),
  downloadFile: (id, defaultName) => ipcRenderer.invoke('download-file', id, defaultName),
  openFileLocally: (id, fileName) => ipcRenderer.invoke('open-file-locally', id, fileName),
});
"""

content = content.replace("});", new_preload)

with open("src/preload.js", "w") as f:
    f.write(content)
