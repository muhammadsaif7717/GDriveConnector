import re

with open("src/renderer.js", "r") as f:
    js = f.read()

functions_to_inject = """
    async function loadFiles(trashed = 0, containerId = 'home-files-grid') {
        const files = await window.electronAPI.getFiles(window.currentFolderId, trashed);
        const grid = document.getElementById(containerId);
        if(!grid) return;
        grid.innerHTML = '';
        currentFilesList = files;
        
        if (trashed === 0) renderBreadcrumbs();

        files.forEach(file => {
            const card = document.createElement('div');
            card.className = 'file-card';
            card.dataset.id = file.id;
            card.dataset.name = file.name ? file.name.toLowerCase() : '';
            
            let iconInfo = { icon: 'insert_drive_file', color: 'file' };
            if (file.mimeType === 'application/vnd.google-apps.folder') {
                iconInfo = { icon: 'folder', color: 'folder' };
            } else if (file.mimeType && file.mimeType.includes('image')) {
                iconInfo = { icon: 'image', color: 'image' };
            } else if (file.mimeType && file.mimeType.includes('pdf')) {
                iconInfo = { icon: 'picture_as_pdf', color: 'pdf' };
            } else if (file.mimeType && file.mimeType.includes('document')) {
                iconInfo = { icon: 'description', color: 'doc' };
            } else if (file.mimeType && file.mimeType.includes('spreadsheet')) {
                iconInfo = { icon: 'table_chart', color: 'sheet' };
            }

            card.innerHTML = `
                <div class="card-action-menu"></div>
                <div class="file-icon ${iconInfo.color}">
                    <span class="material-symbols-outlined">${iconInfo.icon}</span>
                </div>
                <div class="file-name" title="${file.name}">${file.name}</div>
            `;
            
            card.addEventListener('dblclick', () => {
                if (file.mimeType === 'application/vnd.google-apps.folder') {
                    window.currentFolderId = file.id;
                    breadcrumbs.push({ id: file.id, name: file.name });
                    loadFiles(0, containerId);
                }
            });

            grid.appendChild(card);
        });
        
        updateSelectionUI();
    }

    function renderBreadcrumbs() {
        const bcContainer = document.getElementById('breadcrumbs');
        if (!bcContainer) return;
        bcContainer.innerHTML = '';
        breadcrumbs.forEach((bc, index) => {
            const span = document.createElement('span');
            span.textContent = bc.name;
            span.style.cursor = 'pointer';
            if (index < breadcrumbs.length - 1) {
                span.style.color = 'var(--accent-color)';
                const separator = document.createElement('span');
                separator.textContent = ' > ';
                separator.style.margin = '0 8px';
                span.addEventListener('click', () => {
                    breadcrumbs = breadcrumbs.slice(0, index + 1);
                    window.currentFolderId = bc.id;
                    loadFiles(0, 'home-files-grid');
                });
                bcContainer.appendChild(span);
                bcContainer.appendChild(separator);
            } else {
                span.style.color = 'var(--text-primary)';
                span.style.fontWeight = '500';
                bcContainer.appendChild(span);
            }
        });
    }

    window.updateSelectionUI = function() {
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
                document.getElementById('action-rename').style.display = selectedFiles.size === 1 ? 'flex' : 'none';
            } else {
                actionBar.style.display = 'none';
            }
        }
    };
"""

js = js.replace("document.addEventListener('click', async (e) => {", functions_to_inject + "\n    document.addEventListener('click', async (e) => {", 1)

with open("src/renderer.js", "w") as f:
    f.write(js)
