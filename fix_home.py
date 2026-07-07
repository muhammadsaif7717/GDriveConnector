import re

# Fix index.html
with open("src/index.html", "r") as f:
    content = f.read()

new_breadcrumbs = """<div class="breadcrumb-container" id="breadcrumbs" style="font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                        <span class="breadcrumb-item" data-id="root" style="cursor:pointer; color:var(--accent-color);">Home</span>
                    </div>"""
content = content.replace("<h2>Home</h2>", new_breadcrumbs)

with open("src/index.html", "w") as f:
    f.write(content)

# Fix main.js get-files handler
with open("main.js", "r") as f:
    content = f.read()

old_get_files = """ipcMain.handle('get-files', async (event, trashed) => {
    try {
        const files = await getFiles(trashed);
        return files;
    } catch (err) {
        console.error("Error getting files:", err);
        return [];
    }
});"""

new_get_files = """ipcMain.handle('get-files', async (event, trashed, parentId = 'root') => {
    try {
        const files = await getFiles(trashed, parentId);
        return files;
    } catch (err) {
        console.error("Error getting files:", err);
        return [];
    }
});"""

content = content.replace(old_get_files, new_get_files)

with open("main.js", "w") as f:
    f.write(content)

