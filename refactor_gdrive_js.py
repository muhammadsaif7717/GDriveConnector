import re

with open("src/renderer.js", "r") as f:
    js = f.read()

# 1. Update loadFiles to remove checkbox and keep clean UI
card_html_old = """                <div class="card-checkbox" style="position: absolute; top: 8px; left: 8px; z-index: 10;">
                    <input type="checkbox" class="file-select-cb" data-id="${file.id}" ${selectedFiles.has(file.id) ? 'checked' : ''} style="cursor:pointer; width: 16px; height: 16px;" />
                </div>
                <div class="card-action-menu">
                    <span class="material-symbols-outlined more-vert-btn">more_vert</span>
                    <div class="menu-dropdown" style="display: none;">
                        <div class="${actionClass}" data-id="${file.id}" style="color: ${actionColor}; padding: 8px; cursor: pointer;">${actionText}</div>
                        ${!trashed ? `<div class="rename-file-btn" data-id="${file.id}" style="color: var(--text-primary); padding: 8px; cursor: pointer;">Rename</div>
                        <div class="download-file-btn" data-id="${file.id}" style="color: var(--text-primary); padding: 8px; cursor: pointer;">Download</div>` : ''}
                    </div>
                </div>"""

card_html_new = """                <div class="card-action-menu">
                    <!-- Right click handles options, no inline 3-dot needed for pure GD experience, but keeping it for touch support -->
                </div>"""

# Remove the inline 3-dot menu and checkboxes to make it perfectly native
js = js.replace(card_html_old, card_html_new)

# Add lastSelectedId
js = js.replace("let selectedFiles = new Set();", "let selectedFiles = new Set();\n    let lastSelectedId = null;\n    let currentFilesList = [];")

# Update loadFiles to save the list for Shift-Click
js = js.replace("grid.innerHTML = '';", "grid.innerHTML = '';\n        currentFilesList = files;")

# 2. Update Selection UI
update_ui_old = """    window.updateSelectionUI = function() {
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

update_ui_new = """    window.updateSelectionUI = function() {
        document.querySelectorAll('.file-card').forEach(card => {
            const id = card.dataset.id;
            if (id && selectedFiles.has(id)) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });

        const actionBar = document.getElementById('selection-action-bar');
        if (actionBar) {
            if (selectedFiles.size > 0) {
                actionBar.style.display = 'flex';
                document.getElementById('selection-count').innerText = `${selectedFiles.size} selected`;
                // Show/hide rename based on count
                document.getElementById('action-rename').style.display = selectedFiles.size === 1 ? 'flex' : 'none';
            } else {
                actionBar.style.display = 'none';
            }
        }
    };"""

js = js.replace(update_ui_old, update_ui_new)

# Fix file-card data-id
js = js.replace("card.dataset.name = file.name ? file.name.toLowerCase() : '';", "card.dataset.name = file.name ? file.name.toLowerCase() : '';\n            card.dataset.id = file.id;")


# 3. Replace the entire event listener block for clicks and contextmenu
# Find the start of document.addEventListener('click', async (e) => {
start_idx = js.find("document.addEventListener('click', async (e) => {")
end_idx = js.find("    document.getElementById('ctx-open').addEventListener('click', async () => {")

if start_idx != -1 and end_idx != -1:
    new_event_listeners = """
    document.addEventListener('click', async (e) => {
        // Hide context menus
        document.getElementById('custom-context-menu').classList.add('hidden');
        document.getElementById('empty-space-context-menu').classList.add('hidden');
        if (newDropdown && !e.target.closest('.new-btn-container')) {
            newDropdown.style.display = 'none';
        }

        const card = e.target.closest('.file-card');
        if (card) {
            const id = card.dataset.id;
            if (e.shiftKey && lastSelectedId) {
                const startIndex = currentFilesList.findIndex(f => f.id === lastSelectedId);
                const endIndex = currentFilesList.findIndex(f => f.id === id);
                if (startIndex !== -1 && endIndex !== -1) {
                    const start = Math.min(startIndex, endIndex);
                    const end = Math.max(startIndex, endIndex);
                    selectedFiles.clear();
                    for (let i = start; i <= end; i++) {
                        selectedFiles.add(currentFilesList[i].id);
                    }
                }
            } else if (e.ctrlKey || e.metaKey) {
                if (selectedFiles.has(id)) {
                    selectedFiles.delete(id);
                } else {
                    selectedFiles.add(id);
                }
                lastSelectedId = id;
            } else {
                selectedFiles.clear();
                selectedFiles.add(id);
                lastSelectedId = id;
            }
            updateSelectionUI();
        } else if (!e.target.closest('#selection-action-bar') && !e.target.closest('#custom-context-menu') && !e.target.closest('#empty-space-context-menu')) {
            // Clicked empty space
            selectedFiles.clear();
            lastSelectedId = null;
            updateSelectionUI();
        }
    });

    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        // Hide menus first
        const fileMenu = document.getElementById('custom-context-menu');
        const emptyMenu = document.getElementById('empty-space-context-menu');
        fileMenu.classList.add('hidden');
        emptyMenu.classList.add('hidden');

        const card = e.target.closest('.file-card');
        if (card) {
            const id = card.dataset.id;
            if (!selectedFiles.has(id)) {
                selectedFiles.clear();
                selectedFiles.add(id);
                lastSelectedId = id;
                updateSelectionUI();
            }
            fileMenu.style.left = `${e.pageX}px`;
            fileMenu.style.top = `${e.pageY}px`;
            fileMenu.classList.remove('hidden');
        } else if (e.target.closest('.files-grid')) {
            emptyMenu.style.left = `${e.pageX}px`;
            emptyMenu.style.top = `${e.pageY}px`;
            emptyMenu.classList.remove('hidden');
        }
    });

    // Action Bar Bindings
    document.getElementById('clear-selection-btn')?.addEventListener('click', () => {
        selectedFiles.clear();
        updateSelectionUI();
    });

    document.getElementById('action-download')?.addEventListener('click', async () => {
        for (let id of selectedFiles) {
            await window.electronAPI.downloadFile(id);
        }
        selectedFiles.clear();
        updateSelectionUI();
    });

    document.getElementById('action-trash')?.addEventListener('click', async () => {
        if (confirm(`Move ${selectedFiles.size} items to trash?`)) {
            for (let id of selectedFiles) {
                await window.electronAPI.moveToTrash(id);
            }
            selectedFiles.clear();
            updateSelectionUI();
            loadFiles(0, 'home-files-grid');
        }
    });

    document.getElementById('action-rename')?.addEventListener('click', async () => {
        if (selectedFiles.size === 1) {
            const id = Array.from(selectedFiles)[0];
            const name = prompt("Enter new name:");
            if (name) {
                await window.electronAPI.renameFile(id, name);
                loadFiles(0, 'home-files-grid');
            }
        }
    });

    // Empty Space Context Menu actions
    document.getElementById('ctx-empty-new-folder')?.addEventListener('click', async () => {
        document.getElementById('empty-space-context-menu').classList.add('hidden');
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

    document.getElementById('ctx-empty-upload-file')?.addEventListener('click', async () => {
        document.getElementById('empty-space-context-menu').classList.add('hidden');
        const result = await window.electronAPI.uploadFile(window.currentFolderId);
        if (result.success) {
            addUploadTask({ id: result.fileId, name: result.name });
        } else if (!result.canceled) {
            alert('Upload failed: ' + result.error);
        }
    });\n\n"""
    
    js = js[:start_idx] + new_event_listeners + js[end_idx:]

with open("src/renderer.js", "w") as f:
    f.write(js)
