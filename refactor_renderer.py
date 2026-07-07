import re

with open("src/renderer.js", "r") as f:
    js = f.read()

# 1. Update loadFiles HTML to include rename, download and checkboxes
old_html = """            card.innerHTML = `
                <div class="card-action-menu">
                    <span class="material-symbols-outlined more-vert-btn">more_vert</span>
                    <div class="menu-dropdown" style="display: none;">
                        <div class="${actionClass}" data-id="${file.id}" style="color: ${actionColor};">${actionText}</div>
                    </div>
                </div>
                <div class="file-icon ${iconInfo.color}">
                    <span class="material-symbols-outlined">${iconInfo.icon}</span>
                </div>
                <div class="file-name" title="${file.name}">${file.name}</div>
            `;"""

new_html = """            card.innerHTML = `
                <div class="card-checkbox" style="position: absolute; top: 8px; left: 8px; z-index: 10;">
                    <input type="checkbox" class="file-select-cb" data-id="${file.id}" ${selectedFiles.has(file.id) ? 'checked' : ''} style="cursor:pointer; width: 16px; height: 16px;" />
                </div>
                <div class="card-action-menu">
                    <span class="material-symbols-outlined more-vert-btn">more_vert</span>
                    <div class="menu-dropdown" style="display: none;">
                        <div class="${actionClass}" data-id="${file.id}" style="color: ${actionColor}; padding: 8px; cursor: pointer;">${actionText}</div>
                        ${!trashed ? `<div class="rename-file-btn" data-id="${file.id}" style="color: var(--text-primary); padding: 8px; cursor: pointer;">Rename</div>
                        <div class="download-file-btn" data-id="${file.id}" style="color: var(--text-primary); padding: 8px; cursor: pointer;">Download</div>` : ''}
                    </div>
                </div>
                <div class="file-icon ${iconInfo.color}">
                    <span class="material-symbols-outlined">${iconInfo.icon}</span>
                </div>
                <div class="file-name" title="${file.name}">${file.name}</div>
            `;"""
js = js.replace(old_html, new_html)

# 2. Add event listeners for the new UI elements inside DOMContentLoaded
event_listeners = """
    // New Dropdown Logic
    const newBtn = document.querySelector('.new-btn');
    const newDropdown = document.querySelector('.new-dropdown');
    if (newBtn && newDropdown) {
        newBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            newDropdown.style.display = newDropdown.style.display === 'block' ? 'none' : 'block';
        });
        document.querySelector('.new-folder-option').addEventListener('click', async (e) => {
            e.stopPropagation();
            newDropdown.style.display = 'none';
            const name = prompt('Enter folder name:');
            if (name) {
                const res = await window.electronAPI.createFolder(name, window.currentFolderId);
                if (res.success) {
                    loadFiles(0, 'home-files-grid');
                } else {
                    alert('Error creating folder: ' + res.error);
                }
            }
        });
        document.querySelector('.upload-file-option').addEventListener('click', async (e) => {
            e.stopPropagation();
            newDropdown.style.display = 'none';
            const result = await window.electronAPI.uploadFile(window.currentFolderId);
            if (result.success) {
                addUploadTask({ id: result.fileId, name: result.name });
            } else if (!result.canceled) {
                alert('Upload failed: ' + result.error);
            }
        });
    }

    // Refresh Buttons
    const refreshHomeBtn = document.querySelector('.refresh-home-btn');
    if (refreshHomeBtn) {
        refreshHomeBtn.addEventListener('click', () => {
            loadFiles(0, 'home-files-grid');
        });
    }
    const refreshTrashBtn = document.querySelector('.refresh-trash-btn');
    if (refreshTrashBtn) {
        refreshTrashBtn.addEventListener('click', () => {
            loadFiles(1, 'trash-files-grid');
        });
    }

    // Bulk Actions
    const bulkDownloadBtn = document.querySelector('.bulk-download-btn');
    if (bulkDownloadBtn) {
        bulkDownloadBtn.addEventListener('click', async () => {
            for (let id of selectedFiles) {
                await window.electronAPI.downloadFile(id);
            }
            selectedFiles.clear();
            updateSelectionUI();
        });
    }
    const bulkTrashBtn = document.querySelector('.bulk-trash-btn');
    if (bulkTrashBtn) {
        bulkTrashBtn.addEventListener('click', async () => {
            if (confirm(`Move ${selectedFiles.size} items to trash?`)) {
                for (let id of selectedFiles) {
                    await window.electronAPI.moveToTrash(id);
                }
                selectedFiles.clear();
                updateSelectionUI();
                loadFiles(0, 'home-files-grid');
            }
        });
    }
"""

js = js.replace("document.addEventListener('click', (e) => {", event_listeners + "\n    document.addEventListener('click', (e) => {", 1)

# 3. Update the global click handler to handle the new action buttons & checkboxes
click_handler_old = """    document.addEventListener('click', (e) => {
        const isMoreBtn = e.target.classList.contains('more-vert-btn');
        if (isMoreBtn) {
            const dropdown = e.target.nextElementSibling;
            const isVisible = dropdown.style.display === 'block';
            document.querySelectorAll('.menu-dropdown').forEach(d => d.style.display = 'none');
            if (!isVisible) dropdown.style.display = 'block';
        } else {
            // Close dropdowns if clicking outside
            document.querySelectorAll('.menu-dropdown').forEach(d => d.style.display = 'none');
        }
    });"""

click_handler_new = """    document.addEventListener('click', async (e) => {
        // Dropdown toggle
        const isMoreBtn = e.target.classList.contains('more-vert-btn');
        if (isMoreBtn) {
            const dropdown = e.target.nextElementSibling;
            const isVisible = dropdown.style.display === 'block';
            document.querySelectorAll('.menu-dropdown').forEach(d => d.style.display = 'none');
            if (!isVisible) dropdown.style.display = 'block';
        } else {
            document.querySelectorAll('.menu-dropdown').forEach(d => d.style.display = 'none');
            if (newDropdown && !e.target.closest('.new-btn-container')) {
                newDropdown.style.display = 'none';
            }
        }

        // Action menu buttons
        if (e.target.classList.contains('trash-btn')) {
            const id = e.target.dataset.id;
            await window.electronAPI.moveToTrash(id);
            loadFiles(0, 'home-files-grid');
        } else if (e.target.classList.contains('del-perm-btn')) {
            const id = e.target.dataset.id;
            await window.electronAPI.deletePermanently(id);
            loadFiles(1, 'trash-files-grid');
        } else if (e.target.classList.contains('rename-file-btn')) {
            const id = e.target.dataset.id;
            const name = prompt("Enter new name:");
            if (name) {
                await window.electronAPI.renameFile(id, name);
                loadFiles(0, 'home-files-grid');
            }
        } else if (e.target.classList.contains('download-file-btn')) {
            const id = e.target.dataset.id;
            await window.electronAPI.downloadFile(id);
        }

        // Checkboxes
        if (e.target.classList.contains('file-select-cb')) {
            const id = e.target.dataset.id;
            if (e.target.checked) {
                selectedFiles.add(id);
            } else {
                selectedFiles.delete(id);
            }
            updateSelectionUI();
        }
    });"""

js = js.replace(click_handler_old, click_handler_new)

# 4. Modify updateSelectionUI to show/hide the multi-select actions bar and sync checkboxes
update_selection_old = """    window.updateSelectionUI = function() {
        document.querySelectorAll('.file-card').forEach(card => {
            const id = card.querySelector('.trash-btn, .del-perm-btn')?.dataset.id;
            if (id && selectedFiles.has(id)) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    };"""

update_selection_new = """    window.updateSelectionUI = function() {
        document.querySelectorAll('.file-card').forEach(card => {
            const id = card.querySelector('.trash-btn, .del-perm-btn')?.dataset.id;
            const cb = card.querySelector('.file-select-cb');
            if (id && selectedFiles.has(id)) {
                card.classList.add('selected');
                if (cb) cb.checked = true;
            } else {
                card.classList.remove('selected');
                if (cb) cb.checked = false;
            }
        });
        const multiActions = document.querySelector('.multi-select-actions');
        if (multiActions) {
            multiActions.style.display = selectedFiles.size > 0 ? 'flex' : 'none';
        }
    };"""

js = js.replace(update_selection_old, update_selection_new)

with open("src/renderer.js", "w") as f:
    f.write(js)
