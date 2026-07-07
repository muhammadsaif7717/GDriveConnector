
document.getElementById = function(id) {
    let el = dom.window.document.getElementById(id);
    if (!el) {
        el = dom.window.document.createElement('div');
        el.id = id;
        dom.window.document.body.appendChild(el);
    }
    return el;
};
document.querySelector = function(sel) {
    let el = dom.window.document.querySelector(sel);
    if (!el) {
        el = dom.window.document.createElement('div');
        dom.window.document.body.appendChild(el);
    }
    return el;
};

    let selectedFiles = new Set();
    let currentFolderId = 'root';
    let breadcrumbs = [{ id: 'root', name: 'Home' }];

    // Theme logic
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            themeToggle.checked = true;
        }

        themeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.add('dark-theme');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.remove('dark-theme');
                localStorage.setItem('theme', 'light');
            }
        });
    }

    function updateStorage() {
        window.electronAPI.getStorageInfo().then(info => {
            const percentage = (info.used / info.total) * 100;
            const progress = document.querySelector('.progress');
            if(progress) progress.style.width = `${percentage}%`;
            
            const usedGB = (info.used / (1024 * 1024 * 1024)).toFixed(2);
            const totalGB = (info.total / (1024 * 1024 * 1024)).toFixed(2);
            const storageText = document.getElementById('storage-text');
            if(storageText) storageText.innerText = `${usedGB} GB of ${totalGB} GB used`;
        });
    }

    // Toggle dropdowns globally
    document.addEventListener('click', (e) => {
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
    });

    function getFileIcon(mimeType) {
        if (!mimeType) return { icon: 'insert_drive_file', color: 'default' };
        if (mimeType === 'application/vnd.google-apps.folder') return { icon: 'folder', color: 'folder' };
        if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return { icon: 'folder_zip', color: 'zip' };
        if (mimeType.includes('pdf')) return { icon: 'picture_as_pdf', color: 'pdf' };
        if (mimeType.includes('image/')) return { icon: 'image', color: 'image' };
        if (mimeType.includes('video/')) return { icon: 'movie', color: 'video' };
        if (mimeType.includes('audio/')) return { icon: 'audio_file', color: 'audio' };
        if (mimeType.includes('wordprocessingml') || mimeType.includes('msword')) return { icon: 'description', color: 'word' };
        if (mimeType.includes('spreadsheetml') || mimeType.includes('excel')) return { icon: 'table_view', color: 'excel' };
        if (mimeType.includes('presentationml') || mimeType.includes('powerpoint')) return { icon: 'slideshow', color: 'powerpoint' };
        return { icon: 'insert_drive_file', color: 'default' };
    }

    async function loadFiles(trashed = 0, containerId = 'home-files-grid') {
        const grid = document.getElementById(containerId);
        if(!grid) return;
        grid.innerHTML = '<p>Loading...</p>';
        let files;
        try {
            files = await window.electronAPI.getFiles(trashed, containerId === 'home-files-grid' ? currentFolderId : 'root');
        } catch (e) {
            grid.innerHTML = `<p style="color:red">Error loading files: ${e.message}</p>`;
            return;
        }
        
        grid.innerHTML = '';
        if (files.length === 0) {
            grid.innerHTML = '<div class="nothing-found" style="width: 100%; text-align: center; color: #5f6368; padding: 40px;"><span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.5;">inventory_2</span><p style="margin-top: 10px;">No files found.</p></div>';
            return;
        }

        files.forEach(file => {
            const iconInfo = getFileIcon(file.mime_type);
            
            const card = document.createElement('div');
            card.className = 'file-card';
            card.dataset.name = file.name ? file.name.toLowerCase() : '';
            card.style.position = 'relative';
            
            const actionText = trashed ? 'Delete Forever' : 'Move to Trash';
            const actionClass = trashed ? 'del-perm-btn' : 'trash-btn';
            const actionColor = trashed ? '#ea4335' : '#1a73e8';

            card.innerHTML = `
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
            `;


            card.setAttribute('draggable', 'true');
            card.addEventListener('dragstart', (e) => {
                e.preventDefault();
                window.electronAPI.startDrag(file.id, file.name);
            });

            card.addEventListener('click', (e) => {
                if (e.target.closest('.dropdown-menu') || e.target.closest('.menu-dots')) return;
                const id = file.id;
                if (e.ctrlKey || e.metaKey) {
                    if (selectedFiles.has(id)) selectedFiles.delete(id);
                    else selectedFiles.add(id);
                } else {
                    selectedFiles.clear();
                    selectedFiles.add(id);
                }
                updateSelectionUI();
            });

            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (!selectedFiles.has(file.id)) {
                    selectedFiles.clear();
                    selectedFiles.add(file.id);
                    updateSelectionUI();
                }
                const menu = document.getElementById('custom-context-menu');
                menu.style.left = `${e.pageX}px`;
                menu.style.top = `${e.pageY}px`;
                menu.classList.remove('hidden');
            });

            
            if (file.mime_type === 'application/vnd.google-apps.folder') {
                card.addEventListener('dblclick', () => {
                    currentFolderId = file.id;
                    breadcrumbs.push({ id: file.id, name: file.name });
                    renderBreadcrumbs();
                    renderBreadcrumbs();
    loadFiles(0, 'home-files-grid');
                });
            }

            grid.appendChild(card);
        });

        // Note: document click listener moved outside
        if (trashed) {
            document.querySelectorAll('.del-perm-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    if(confirm("Are you sure you want to delete this permanently?")) {
                        await window.electronAPI.deletePermanently(id);
                        loadFiles(1, 'trash-files-grid');
                        updateStorage();
                    }
                });
            });
        } else {
            document.querySelectorAll('.trash-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    await window.electronAPI.moveToTrash(id);
                    renderBreadcrumbs();
    loadFiles(0, 'home-files-grid');
                });
            });
        }
    }

    
    const newFolderBtn = document.querySelector('.new-folder-btn');
    if (newFolderBtn) {
        newFolderBtn.addEventListener('click', async () => {
            const name = prompt('Folder name:');
            if (name) {
                const res = await window.electronAPI.createFolder(name, currentFolderId);
                if (res.success) {
                    renderBreadcrumbs();
    loadFiles(0, 'home-files-grid');
                } else {
                    alert('Error creating folder: ' + res.error);
                }
            }
        });
    }

    const newBtn = document.querySelector('.new-btn');
    if (newBtn) {
        newBtn.addEventListener('click', async () => {
            newBtn.disabled = true;
            const result = await window.electronAPI.uploadFile(currentFolderId);
            if (result.success && result.tasks) {
                result.tasks.forEach(task => addUploadTask(task));
            } else if (!result.canceled && result.error) {
                alert(`Upload error: ${result.error}`);
            }
            newBtn.disabled = false;
        });
    }

    // Drag and Drop
    const dropOverlay = document.getElementById('drop-overlay');
    if(dropOverlay) {
        window.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropOverlay.style.display = 'flex';
        });
        window.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (e.relatedTarget === null) {
                dropOverlay.style.display = 'none';
            }
        });
        window.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropOverlay.style.display = 'none';
            for (const file of e.dataTransfer.files) {
                const result = await window.electronAPI.uploadFileByPath(file.path, currentFolderId);
                if (result.success && result.tasks) {
                    result.tasks.forEach(task => addUploadTask(task));
                }
            }
        });
    }


    // Context Menu Logic
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#custom-context-menu')) {
            const menu = document.getElementById('custom-context-menu');
            if (menu) menu.classList.add('hidden');
        }
    });

    window.updateSelectionUI = function() {
        document.querySelectorAll('.file-card, .file-list-item').forEach(card => {
            const id = card.getAttribute('data-id');
            if (selectedFiles.has(id)) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    };

    document.getElementById('ctx-open').addEventListener('click', async () => {
        for (let id of selectedFiles) {
            const el = document.querySelector(`.click-to-open[data-id="${id}"]`);
            if (el) el.click();
        }
    });
    
    document.getElementById('ctx-download').addEventListener('click', async () => {
        for (let id of selectedFiles) {
            const el = document.querySelector(`.download-file[data-id="${id}"]`);
            if (el) el.click();
        }
    });

    document.getElementById('ctx-delete').addEventListener('click', async () => {
        if (confirm(`Delete ${selectedFiles.size} items?`)) {
            for (let id of selectedFiles) {
                const el = document.querySelector(`.delete-file[data-id="${id}"]`);
                if (el) el.click();
            }
        }
    });
    
    document.getElementById('ctx-rename').addEventListener('click', async () => {
        if (selectedFiles.size === 1) {
            const id = Array.from(selectedFiles)[0];
            const el = document.querySelector(`.rename-file[data-id="${id}"]`);
            if (el) el.click();
        } else {
            alert('Select only one file to rename.');
        }
    });

    // Search
    const searchInput = document.getElementById('search-input');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const grid = document.getElementById('home-files-grid');
            const cards = grid.querySelectorAll('.file-card');
            let hasVisible = false;

            // Remove existing nothing found if any
            const existingNothing = grid.querySelector('.search-nothing-found');
            if(existingNothing) existingNothing.remove();

            cards.forEach(card => {
                if (card.dataset.name && card.dataset.name.includes(query)) {
                    card.style.display = 'flex';
                    hasVisible = true;
                } else {
                    card.style.display = 'none';
                }
            });

            if (!hasVisible && cards.length > 0) {
                const noFound = document.createElement('div');
                noFound.className = 'search-nothing-found';
                noFound.style.width = '100%';
                noFound.style.textAlign = 'center';
                noFound.style.color = '#5f6368';
                noFound.style.padding = '40px';
                noFound.style.gridColumn = '1 / -1';
                noFound.innerHTML = '<span class="material-symbols-outlined" style="font-size: 48px; opacity: 0.5;">search_off</span><p style="margin-top: 10px;">Nothing found for "'+e.target.value+'"</p>';
                grid.appendChild(noFound);
            }
        });
    }

    // View Switching
    const homeNav = document.getElementById('nav-home');
    const dashboardNav = document.getElementById('nav-dashboard');
    const trashNav = document.getElementById('nav-trash');
    const homeView = document.getElementById('home-view');
    const dashboardView = document.getElementById('dashboard-view');
    const trashView = document.getElementById('trash-view');

    function switchView(nav, view, callback) {
        [homeNav, dashboardNav, trashNav].forEach(n => {
            if(n) n.classList.remove('active');
        });
        [homeView, dashboardView, trashView].forEach(v => {
            if(v) v.style.display = 'none';
        });
        if(nav) nav.classList.add('active');
        if(view) view.style.display = 'block';

        if (callback) callback();
    }

    // View Toggle
    let isListView = false;
    const viewToggleBtn = document.getElementById('view-toggle-btn');
    if (viewToggleBtn) {
        viewToggleBtn.addEventListener('click', () => {
            isListView = !isListView;
            viewToggleBtn.textContent = isListView ? 'grid_view' : 'view_list';
            viewToggleBtn.title = isListView ? 'Toggle Grid View' : 'Toggle List View';
            
            const homeGrid = document.getElementById('home-files-grid');
            if (homeGrid) {
                if (isListView) homeGrid.classList.add('files-list-view');
                else homeGrid.classList.remove('files-list-view');
            }
        });
    }

    if(homeNav) homeNav.addEventListener('click', () => switchView(homeNav, homeView, () => loadFiles(0, 'home-files-grid')));
    if(dashboardNav) dashboardNav.addEventListener('click', () => switchView(dashboardNav, dashboardView, loadAccounts));
    if(trashNav) trashNav.addEventListener('click', () => switchView(trashNav, trashView, () => loadFiles(1, 'trash-files-grid')));

    function initUploadManager() {
        const manager = document.getElementById('uploadManager');
        const header = document.getElementById('uploadManagerHeader');
        const toggle = document.getElementById('uploadManagerToggle');
        const close = document.getElementById('uploadManagerClose');
        const list = document.getElementById('uploadList');
        
        if(!manager) return;

        header.addEventListener('click', (e) => {
            if(e.target.id === 'uploadManagerClose' || e.target.id === 'uploadManagerToggle') return;
            manager.classList.toggle('collapsed');
            toggle.innerText = manager.classList.contains('collapsed') ? 'expand_less' : 'expand_more';
        });

        toggle.addEventListener('click', () => {
            manager.classList.toggle('collapsed');
            toggle.innerText = manager.classList.contains('collapsed') ? 'expand_less' : 'expand_more';
        });

        close.addEventListener('click', () => {
            manager.classList.add('hidden');
            list.innerHTML = '';
        });

        if (window.electronAPI.onUploadProgress) {
            window.electronAPI.onUploadProgress((event, data) => {
                const fill = document.getElementById(`progress-fill-${data.id}`);
                if (fill) fill.style.width = `${data.progress}%`;
            });
            window.electronAPI.onUploadComplete((event, data) => {
                const action = document.getElementById(`action-${data.id}`);
                if (action) {
                    action.innerText = 'check_circle';
                    action.className = 'material-symbols-outlined upload-item-action success';
                }
                updateStorage();
                renderBreadcrumbs();
    loadFiles(0, 'home-files-grid');
            });
            window.electronAPI.onUploadError((event, data) => {
                const action = document.getElementById(`action-${data.id}`);
                if (action) {
                    action.innerText = 'error';
                    action.className = 'material-symbols-outlined upload-item-action error';
                    action.title = data.error;
                }
            });
        }
    }

    function addUploadTask(task) {
        const manager = document.getElementById('uploadManager');
        const list = document.getElementById('uploadList');
        manager.classList.remove('hidden');
        manager.classList.remove('collapsed');
        document.getElementById('uploadManagerToggle').innerText = 'expand_more';
        document.getElementById('uploadManagerClose').style.display = 'inline-block';

        const li = document.createElement('li');
        li.className = 'upload-item';
        li.id = `task-${task.id}`;
        li.innerHTML = `
            <span class="material-symbols-outlined upload-item-icon">insert_drive_file</span>
            <div class="upload-item-details">
                <div class="upload-item-name">${task.name}</div>
                <div class="upload-progress-bar">
                    <div class="upload-progress-fill" id="progress-fill-${task.id}"></div>
                </div>
            </div>
            <span class="material-symbols-outlined upload-item-action" id="action-${task.id}" title="Cancel">close</span>
        `;
        list.appendChild(li);

        li.querySelector('.upload-item-action').addEventListener('click', async (e) => {
            if (e.target.innerText === 'close') {
                const res = await window.electronAPI.cancelUpload(task.id);
                if (res.success) {
                    e.target.innerText = 'cancel';
                    e.target.className = 'material-symbols-outlined upload-item-action error';
                    e.target.title = 'Canceled';
                }
            }
        });
    }

    initUploadManager();


    // Dashboard features
    async function loadAccounts() {
        const accounts = await window.electronAPI.getAccounts();
        const countSpan = document.getElementById('total-accounts-count');
        if(countSpan) countSpan.innerText = accounts.length;
        
        const list = document.querySelector('.accounts-list');
        if(!list) return;
        list.innerHTML = '';
        
        accounts.forEach(acc => {
            const used = ((acc.used_space || 0) / (1024*1024*1024)).toFixed(2);
            const total = ((acc.total_space || 15*1024*1024*1024) / (1024*1024*1024)).toFixed(2);
            const div = document.createElement('div');
            div.style.padding = '12px 16px';
            div.style.background = '#f8fafd';
            div.style.borderRadius = '12px';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            div.innerHTML = `
                <div>
                    <strong>${acc.email}</strong><br/>
                    <small style="color:#5f6368">${used} GB / ${total} GB Used</small>
                </div>
                <button class="delete-acc-btn" data-id="${acc.id}" style="padding: 6px 12px; background: #ea4335; color: white; border: none; border-radius: 8px; cursor: pointer;">Delete</button>
            `;
            list.appendChild(div);
        });

        document.querySelectorAll('.delete-acc-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm('Are you sure you want to remove this account?')) {
                    await window.electronAPI.deleteAccount(id);
                    loadAccounts();
                    updateStorage();
                }
            });
        });
    }

    const addAccountBtnDash = document.querySelector('.add-account-btn-dash');
    if (addAccountBtnDash) {
        addAccountBtnDash.addEventListener('click', async () => {
            const result = await window.electronAPI.addAccount();
            if (result.success) {
                alert(`Account added successfully: ${result.email}`);
                loadAccounts();
                updateStorage();
            } else {
                alert(`Failed to add account: ${result.error}`);
            }
        });
    }

    const exportBtn = document.querySelector('.export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            const res = await window.electronAPI.exportData();
            if (res.success) alert('Exported to ' + res.path);
            else if (!res.canceled) alert('Export failed: ' + res.error);
        });
    }

    const importBtn = document.querySelector('.import-btn');
    if (importBtn) {
        importBtn.addEventListener('click', async () => {
            const res = await window.electronAPI.importData();
            if (res.success) {
                alert('Data imported successfully!');
                loadAccounts();
                updateStorage();
            } else if (!res.canceled) {
                alert('Import failed: ' + res.error);
            }
        });
    }

    const clearCacheBtn = document.querySelector('.clear-cache-btn');
    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', async () => {
            if (confirm("Are you sure you want to clear all app cache? This might log you out or require re-syncing.")) {
                const res = await window.electronAPI.clearCache();
                if (res.success) {
                    alert('Cache cleared successfully!');
                } else {
                    alert('Failed to clear cache: ' + res.error);
                }
            }
        });
    }

    const emptyTrashBtn = document.querySelector('.empty-trash-btn');
    if (emptyTrashBtn) {
        emptyTrashBtn.addEventListener('click', async () => {
            if (confirm("Are you sure you want to empty the trash permanently?")) {
                const res = await window.electronAPI.emptyTrash();
                if (res.success) {
                    loadFiles(1, 'trash-files-grid');
                    updateStorage();
                    alert("Trash emptied successfully.");
                } else {
                    alert("Failed to empty trash: " + res.error);
                }
            }
        });
    }

    updateStorage();
    renderBreadcrumbs();
    loadFiles(0, 'home-files-grid');
