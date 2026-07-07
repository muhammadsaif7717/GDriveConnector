import re

with open("src/renderer.js", "r") as f:
    content = f.read()

# Add global state
glob_old = "let selectedFiles = new Set();"
glob_new = "let selectedFiles = new Set();\nlet currentFolderId = 'root';\nlet breadcrumbs = [{ id: 'root', name: 'Home' }];"
content = content.replace(glob_old, glob_new)

# Add renderBreadcrumbs function
render_fn = """
    function renderBreadcrumbs() {
        const container = document.getElementById('breadcrumbs');
        if (!container) return;
        container.innerHTML = '';
        breadcrumbs.forEach((crumb, index) => {
            const span = document.createElement('span');
            span.className = 'breadcrumb-item';
            span.innerText = crumb.name;
            span.style.cursor = 'pointer';
            span.style.color = index === breadcrumbs.length - 1 ? 'var(--text-color)' : 'var(--accent-color)';
            
            if (index < breadcrumbs.length - 1) {
                const sep = document.createElement('span');
                sep.className = 'material-symbols-outlined';
                sep.innerText = 'chevron_right';
                sep.style.fontSize = '20px';
                sep.style.color = 'var(--text-color)';
                sep.style.opacity = '0.5';
                span.onclick = () => {
                    breadcrumbs = breadcrumbs.slice(0, index + 1);
                    currentFolderId = crumb.id;
                    renderBreadcrumbs();
                    loadFiles(0, 'home-files-grid');
                };
                container.appendChild(span);
                container.appendChild(sep);
            } else {
                container.appendChild(span);
            }
        });
    }
"""
content = content.replace("async function loadFiles(trashed = 0, gridId = 'home-files-grid') {", render_fn + "\n    async function loadFiles(trashed = 0, gridId = 'home-files-grid') {")

# Update getFiles call
content = content.replace("const files = await window.electronAPI.getFiles(trashed);", "const files = await window.electronAPI.getFiles(trashed, gridId === 'home-files-grid' ? currentFolderId : 'root');")

# Add folder double click navigation inside loadFiles
double_click = """
            if (file.mime_type === 'application/vnd.google-apps.folder') {
                card.addEventListener('dblclick', () => {
                    currentFolderId = file.id;
                    breadcrumbs.push({ id: file.id, name: file.name });
                    renderBreadcrumbs();
                    loadFiles(0, 'home-files-grid');
                });
            }
"""
# Find grid.appendChild(card) and inject before it
content = content.replace("grid.appendChild(card);", double_click + "\n            grid.appendChild(card);")


# Update upload calls
content = content.replace("const result = await window.electronAPI.uploadFile();", "const result = await window.electronAPI.uploadFile(currentFolderId);")
content = content.replace("const result = await window.electronAPI.uploadFileByPath(file.path);", "const result = await window.electronAPI.uploadFileByPath(file.path, currentFolderId);")

# Add Create Folder event listener
create_folder_js = """
    const newFolderBtn = document.querySelector('.new-folder-btn');
    if (newFolderBtn) {
        newFolderBtn.addEventListener('click', async () => {
            const name = prompt('Folder name:');
            if (name) {
                const res = await window.electronAPI.createFolder(name, currentFolderId);
                if (res.success) {
                    loadFiles(0, 'home-files-grid');
                } else {
                    alert('Error creating folder: ' + res.error);
                }
            }
        });
    }
"""

content = content.replace("const newBtn = document.querySelector('.new-btn');", create_folder_js + "\n    const newBtn = document.querySelector('.new-btn');")


# ensure renderBreadcrumbs is called initially
content = content.replace("loadFiles(0, 'home-files-grid');", "renderBreadcrumbs();\n    loadFiles(0, 'home-files-grid');")

with open("src/renderer.js", "w") as f:
    f.write(content)
