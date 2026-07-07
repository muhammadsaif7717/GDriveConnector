import re

with open("src/renderer.js", "r") as f:
    content = f.read()

# Add Download and Rename to the 3-dot menu dropdown
menu_html_old = """                            <div class="dropdown-menu">
                                <ul>
                                    <li class="delete-file" data-id="${file.id}">
                                        <span class="material-symbols-outlined">delete</span> Delete
                                    </li>
                                </ul>
                            </div>"""

menu_html_new = """                            <div class="dropdown-menu">
                                <ul>
                                    <li class="download-file" data-id="${file.id}" data-name="${file.name}">
                                        <span class="material-symbols-outlined">download</span> Download
                                    </li>
                                    <li class="rename-file" data-id="${file.id}" data-name="${file.name}">
                                        <span class="material-symbols-outlined">edit</span> Rename
                                    </li>
                                    <li class="delete-file" data-id="${file.id}">
                                        <span class="material-symbols-outlined">delete</span> Delete
                                    </li>
                                </ul>
                            </div>"""

content = content.replace(menu_html_old, menu_html_new)

# Make the file card clickable to open locally
# Let's find where the file card is created
card_inner_old = """                <div class="file-icon">"""
card_inner_new = """                <div class="file-icon click-to-open" data-id="${file.id}" data-name="${file.name}" style="cursor: pointer;">"""
content = content.replace(card_inner_old, card_inner_new)

# Add event listeners for the new buttons
event_listeners_old = """        document.querySelectorAll('.delete-file').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const isTrash = gridId === 'trash-files-grid';
                if (isTrash) {
                    if (confirm('Permanently delete this file?')) {
                        await window.electronAPI.deletePermanently(id);
                        loadFiles(1, gridId);
                        updateStorage();
                    }
                } else {
                    await window.electronAPI.moveToTrash(id);
                    loadFiles(0, gridId);
                    updateStorage();
                }
            });
        });"""

event_listeners_new = event_listeners_old + """

        document.querySelectorAll('.download-file').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const name = e.currentTarget.getAttribute('data-name');
                const result = await window.electronAPI.downloadFile(id, name);
                if (result.success && result.tasks) {
                    result.tasks.forEach(task => addUploadTask(task));
                } else if (!result.canceled && result.error) {
                    alert(`Download failed: ${result.error}`);
                }
            });
        });

        document.querySelectorAll('.rename-file').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const oldName = e.currentTarget.getAttribute('data-name');
                const newName = prompt('Enter new name:', oldName);
                if (newName && newName !== oldName) {
                    const result = await window.electronAPI.renameFile(id, newName);
                    if (result.success) {
                        loadFiles(gridId === 'trash-files-grid' ? 1 : 0, gridId);
                    } else {
                        alert(`Rename failed: ${result.error}`);
                    }
                }
            });
        });

        document.querySelectorAll('.click-to-open').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const name = e.currentTarget.getAttribute('data-name');
                const result = await window.electronAPI.openFileLocally(id, name);
                if (result.success && result.tasks) {
                    result.tasks.forEach(task => addUploadTask(task));
                } else if (!result.canceled && result.error) {
                    alert(`Failed to open: ${result.error}`);
                }
            });
        });
"""

content = content.replace(event_listeners_old, event_listeners_new)

with open("src/renderer.js", "w") as f:
    f.write(content)
