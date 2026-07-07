import re
import os

# Create a dummy icon if it doesn't exist
os.makedirs("assets", exist_ok=True)
if not os.path.exists("assets/icon.png"):
    with open("assets/icon.png", "w") as f:
        f.write("") # Just empty to avoid crash

with open("main.js", "r") as f:
    content = f.read()

drag_main = """
ipcMain.on('ondragstart', async (event, id, name) => {
    const tempDir = os.tmpdir();
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
"""
content = content.replace("const fs = require('fs');", drag_main + "\nconst fs = require('fs');")
with open("main.js", "w") as f:
    f.write(content)


with open("src/preload.js", "r") as f:
    content = f.read()
content = content.replace("});", "  startDrag: (id, name) => ipcRenderer.send('ondragstart', id, name)\n});")
with open("src/preload.js", "w") as f:
    f.write(content)


with open("src/renderer.js", "r") as f:
    content = f.read()
drag_render = """
            card.setAttribute('draggable', 'true');
            card.addEventListener('dragstart', (e) => {
                e.preventDefault();
                window.electronAPI.startDrag(file.id, file.name);
            });
"""
content = content.replace("            card.addEventListener('click', (e) => {", drag_render + "\n            card.addEventListener('click', (e) => {")
with open("src/renderer.js", "w") as f:
    f.write(content)

