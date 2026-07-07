import re

with open("src/renderer.js", "r") as f:
    content = f.read()

load_files_start = """    async function loadFiles(trashed = 0, containerId = 'home-files-grid') {
        const grid = document.getElementById(containerId);
        if(!grid) return;
        grid.innerHTML = '<p>Loading...</p>';
        const files = await window.electronAPI.getFiles(trashed, containerId === 'home-files-grid' ? currentFolderId : 'root');"""

load_files_start_new = """    async function loadFiles(trashed = 0, containerId = 'home-files-grid') {
        const grid = document.getElementById(containerId);
        if(!grid) return;
        grid.innerHTML = '<p>Loading...</p>';
        let files;
        try {
            files = await window.electronAPI.getFiles(trashed, containerId === 'home-files-grid' ? currentFolderId : 'root');
        } catch (e) {
            grid.innerHTML = `<p style="color:red">Error loading files: ${e.message}</p>`;
            return;
        }"""

content = content.replace(load_files_start, load_files_start_new)

with open("src/renderer.js", "w") as f:
    f.write(content)
