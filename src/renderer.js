// renderer.js
// This file handles all UI interactions and renders data from the main process.

document.addEventListener('DOMContentLoaded', () => {
    // TEST REFRESH
    setTimeout(async () => {
        try {
            console.log('TEST REFRESH SETUP INPUTS');
            const settings = await window.electronAPI.getSettings();
            console.log('GET SETTINGS RETURNED:', JSON.stringify(settings));
            if (settings && settings.success && settings.settings) {
                const setupClientId = document.getElementById('setup-client-id');
                console.log('CLIENT ID INPUT ELEMENT:', setupClientId);
                console.log('CLIENT ID INPUT VALUE BEFORE:', setupClientId ? setupClientId.value : 'null');
                if (setupClientId && settings.settings.client_id) setupClientId.value = settings.settings.client_id;
                console.log('CLIENT ID INPUT VALUE AFTER:', setupClientId ? setupClientId.value : 'null');
            }
        } catch(e) {
            console.log('TEST REFRESH FAILED', e);
        }
    }, 4000);
    // END TEST REFRESH

    

    // --------------------------------------------------------
    // DOM Elements
    // --------------------------------------------------------

    // Navigation
    const navSetup = document.getElementById('nav-setup');
    const navHelp = document.getElementById('nav-help');
    const navHome = document.getElementById('nav-home');
    const navDashboard = document.getElementById('nav-dashboard');
    const navTrash = document.getElementById('nav-trash');
    const themeToggle = document.getElementById('theme-toggle');

    // Views
    const homeView = document.getElementById('home-view');
    const dashboardView = document.getElementById('dashboard-view');
    const trashView = document.getElementById('trash-view');
    const setupView = document.getElementById('setup-view');
    const helpView = document.getElementById('help-view');

    // Setup & Help
    const saveSetupBtn = document.getElementById('save-setup-btn');
    const setupClientId = document.getElementById('setup-client-id');
    const setupClientSecret = document.getElementById('setup-client-secret');
    const linkToHelp = document.getElementById('link-to-help');
    const linkToGcp = document.getElementById('link-to-gcp');

    // Global Loader
    const globalLoader = document.getElementById('global-loader');
    const globalLoaderText = document.getElementById('global-loader-text');

    // File Explorer (Home)
    const homeFilesGrid = document.getElementById('home-files-grid');
    const breadcrumbsContainer = document.getElementById('breadcrumbs');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const filterSelect = document.getElementById('filter-select');
    const refreshHomeBtn = document.querySelector('.refresh-home-btn');
    const viewToggleBtn = document.getElementById('view-toggle-btn');

    // File Explorer (Trash)
    const trashFilesGrid = document.getElementById('trash-files-grid');
    const sortSelectTrash = document.getElementById('sort-select-trash');
    const filterSelectTrash = document.getElementById('filter-select-trash');
    const refreshTrashBtn = document.querySelector('.refresh-trash-btn');
    const viewToggleBtnTrash = document.getElementById('view-toggle-btn-trash');
    const emptyTrashBtn = document.querySelector('.empty-trash-btn');

    // Selection Action Bar
    const selectionActionBar = document.getElementById('selection-action-bar');
    const clearSelectionBtn = document.getElementById('clear-selection-btn');
    const selectionCountText = document.getElementById('selection-count');
    const actionRename = document.getElementById('action-rename');
    const actionDownload = document.getElementById('action-download');
    const actionTrash = document.getElementById('action-trash');
    const actionRestore = document.getElementById('action-restore');
    const actionDeleteForever = document.getElementById('action-delete-forever');

    // Dashboard
    const totalAccountsCount = document.getElementById('total-accounts-count');
    const addAccountBtnDash = document.querySelector('.add-account-btn-dash');
    const exportBtn = document.querySelector('.export-btn');
    const importBtn = document.querySelector('.import-btn');
    const clearCacheBtnDash = document.querySelector('.clear-cache-btn');
    const accountsList = document.querySelector('.accounts-list');

    // Dashboard Storage Bars
    const barImages = document.getElementById('bar-images');
    const barVideos = document.getElementById('bar-videos');
    const barDocs = document.getElementById('bar-docs');
    const barOthers = document.getElementById('bar-others');
    const textImages = document.getElementById('text-images');
    const textVideos = document.getElementById('text-videos');
    const textDocs = document.getElementById('text-docs');
    const textOthers = document.getElementById('text-others');

    // Upload & Drag Drop
    const dropOverlay = document.getElementById('drop-overlay');
    const uploadManager = document.getElementById('uploadManager');
    const uploadList = document.getElementById('uploadList');

    // Sidebar Storage
    const sidebarStorageText = document.getElementById('storage-text');
    const sidebarProgressBar = document.querySelector('.progress');

    // Sidebar New Button
    const newBtn = document.querySelector('.new-btn');

    // --------------------------------------------------------
    // State
    // --------------------------------------------------------
    let currentView = 'setup'; // Default to setup, checked later
    let currentParentId = 'root';
    let breadcrumbPath = [{ id: 'root', name: 'Home' }];
    let selectedFiles = new Set();
    let isListView = false;
    let allFilesCache = [];
    let isTrashViewActive = false;

    // --------------------------------------------------------
    // Helper Functions
    // --------------------------------------------------------

    function showLoader(text = 'Processing...') {
        if (globalLoaderText) globalLoaderText.textContent = text;
        if (globalLoader) globalLoader.classList.remove('hidden');
    }

    function hideLoader() {
        if (globalLoader) globalLoader.classList.add('hidden');
    }

    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 B';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    function getFileIcon(mimeType) {
        if (mimeType === 'application/vnd.google-apps.folder') return 'folder';
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'movie';
        if (mimeType.startsWith('audio/')) return 'audio_file';
        if (mimeType.includes('pdf')) return 'picture_as_pdf';
        if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'table_chart';
        if (mimeType.includes('document') || mimeType.includes('word')) return 'description';
        if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'slideshow';
        return 'insert_drive_file';
    }

    function getFileIconColor(mimeType) {
        if (mimeType === 'application/vnd.google-apps.folder') return '#e8eaed';
        if (mimeType.startsWith('image/')) return '#f28b82';
        if (mimeType.startsWith('video/')) return '#d93025';
        if (mimeType.includes('pdf')) return '#ea4335';
        if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '#34a853';
        if (mimeType.includes('document') || mimeType.includes('word')) return '#4285f4';
        if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '#fbbc04';
        return '#9aa0a6';
    }

    // --------------------------------------------------------
    // Navigation Logic
    // --------------------------------------------------------

    function switchView(viewName) {
        currentView = viewName;
        // Hide all views
        if (homeView) homeView.style.display = 'none';
        if (dashboardView) dashboardView.style.display = 'none';
        if (trashView) trashView.style.display = 'none';
        if (setupView) setupView.style.display = 'none';
        if (helpView) helpView.style.display = 'none';

        // Remove active class from all nav items
        [navSetup, navHelp, navHome, navDashboard, navTrash].forEach(nav => {
            if (nav) nav.classList.remove('active');
        });

        // Clear selection when switching views
        clearSelection();

        isTrashViewActive = (viewName === 'trash');

        // Show requested view and set active nav
        if (viewName === 'home') {
            if (homeView) homeView.style.display = 'block';
            if (navHome) navHome.classList.add('active');
            loadFiles(0, currentParentId);
        } else if (viewName === 'dashboard') {
            if (dashboardView) dashboardView.style.display = 'block';
            if (navDashboard) navDashboard.classList.add('active');
            loadDashboard();
        } else if (viewName === 'trash') {
            if (trashView) trashView.style.display = 'block';
            if (navTrash) navTrash.classList.add('active');
            loadFiles(1, 'root');
        } else if (viewName === 'setup') {
            if (setupView) setupView.style.display = 'block';
            if (navSetup) navSetup.classList.add('active');
        } else if (viewName === 'help') {
            if (helpView) helpView.style.display = 'block';
            if (navHelp) navHelp.classList.add('active');
        }
    }

    if (navHome) navHome.addEventListener('click', (e) => { e.preventDefault(); switchView('home'); });
    if (navDashboard) navDashboard.addEventListener('click', (e) => { e.preventDefault(); switchView('dashboard'); });
    if (navTrash) navTrash.addEventListener('click', (e) => { e.preventDefault(); switchView('trash'); });
    if (navSetup) navSetup.addEventListener('click', (e) => { e.preventDefault(); switchView('setup'); });
    if (navHelp) navHelp.addEventListener('click', (e) => { e.preventDefault(); switchView('help'); });
    if (linkToHelp) linkToHelp.addEventListener('click', (e) => { e.preventDefault(); switchView('help'); });
    if (linkToGcp) linkToGcp.addEventListener('click', (e) => {
        e.preventDefault();
        window.electronAPI.openExternal('https://console.cloud.google.com/');
    });

    // --------------------------------------------------------
    // Initial Setup & Authentication Check
    // --------------------------------------------------------

    async function checkSetup() {
        showLoader('Loading settings...');
        try {
            const res = await window.electronAPI.getSettings();
            if (res && res.success && res.settings && res.settings.client_id && res.settings.client_secret) {
                if (setupClientId) setupClientId.value = res.settings.client_id;
                if (setupClientSecret) setupClientSecret.value = res.settings.client_secret;
                
                // If we have accounts, go to home, else dashboard
                const accounts = await window.electronAPI.getAccounts();
                if (accounts && accounts.length > 0) {
                    switchView('home');
                    updateSidebarStorage();
                } else {
                    switchView('dashboard');
                }
            } else {
                switchView('setup');
            }
        } catch (error) {
            console.error('Error checking setup:', error);
            switchView('setup');
        }
        hideLoader();
    }

    if (saveSetupBtn) {
        saveSetupBtn.addEventListener('click', async () => {
            const clientId = setupClientId.value.trim();
            const clientSecret = setupClientSecret.value.trim();
            
            if (!clientId || !clientSecret) {
                alert('Please enter both Client ID and Client Secret.');
                return;
            }

            showLoader('Saving settings...');
            try {
                const result = await window.electronAPI.saveSettings({ client_id: clientId, client_secret: clientSecret });
                if (result.success) {
                    alert('Settings saved successfully!');
                    switchView('dashboard'); // Redirect to dashboard to add account
                } else {
                    alert('Failed to save settings: ' + result.error);
                }
            } catch (error) {
                console.error('Error saving settings:', error);
                alert('An error occurred while saving settings.');
            }
            hideLoader();
        });
    }

    // --------------------------------------------------------
    // File Loading & Rendering
    // --------------------------------------------------------

    async function loadFiles(trashed = 0, parentId = 'root', silent = false) {
        const grid = trashed ? trashFilesGrid : homeFilesGrid;
        if (!grid) return;

        if (!silent) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">Loading files...</div>';
        }
        
        try {
            const response = await window.electronAPI.getFiles(trashed, parentId);
            if (!response.success) {
                grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ea4335;">Error loading files: ${response.error}</div>`;
                return;
            }

            allFilesCache = response.files || [];
            applySortAndFilter(trashed);
            updateBreadcrumbs();
            if (!silent) clearSelection();
        } catch (error) {
            console.error('Error loading files:', error);
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ea4335;">An unexpected error occurred.</div>';
        }
    }

    function renderFiles(files, gridElement) {
        gridElement.innerHTML = '';
        if (files.length === 0) {
            gridElement.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">No files found.</div>';
            return;
        }

        // Apply list view class if needed
        if (isListView) {
            gridElement.classList.add('list-view');
        } else {
            gridElement.classList.remove('list-view');
        }

        files.forEach(file => {
            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
            const icon = getFileIcon(file.mimeType);
            const iconColor = getFileIconColor(file.mimeType);
            const dateStr = file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'Unknown date';
            const sizeStr = isFolder ? '--' : formatBytes(file.size);

            const card = document.createElement('div');
            card.className = 'file-card';
            card.dataset.id = file.id;
            card.dataset.name = file.name;
            card.dataset.mime = file.mimeType;
            if (selectedFiles.has(file.id)) card.classList.add('selected');

            let thumbnailHtml = '';
            if (!isListView) {
                const thumb = file.thumbnail_link || file.thumbnailLink;
                if (thumb) {
                    const uniqueId = `thumb-${file.id}`;
                    thumbnailHtml = `
                    <div class="file-thumbnail" style="width: 100%; height: 140px; position: relative; background: var(--bg-secondary); border-bottom: 1px solid var(--border-color);">
                        <img id="${uniqueId}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.3s;">
                        <div id="${uniqueId}-fallback" style="display:flex; justify-content:center; align-items:center; width:100%; height:100%; position: absolute; top:0; left:0;">
                            <span class="material-symbols-outlined" style="font-size: 48px; color: ${iconColor}; animation: pulse 1.5s infinite alternate;">image</span>
                        </div>
                    </div>`;

                    // Asynchronously fetch and inject the authorized thumbnail image
                    if (window.electronAPI.getThumbnail) {
                        window.electronAPI.getThumbnail(thumb, file.account_id).then(res => {
                            const img = document.getElementById(uniqueId);
                            const fallback = document.getElementById(`${uniqueId}-fallback`);
                            if (img && res && res.success) {
                                img.src = res.dataUrl;
                                img.onload = () => {
                                    img.style.opacity = '1';
                                    if (fallback) fallback.style.display = 'none';
                                }
                            } else if (fallback) {
                                fallback.innerHTML = `<span class="material-symbols-outlined" style="font-size: 64px; color: ${iconColor};">${icon}</span>`;
                            }
                        }).catch(() => {
                            const fallback = document.getElementById(`${uniqueId}-fallback`);
                            if (fallback) fallback.innerHTML = `<span class="material-symbols-outlined" style="font-size: 64px; color: ${iconColor};">${icon}</span>`;
                        });
                    }
                } else {
                    thumbnailHtml = `<div class="file-thumbnail" style="display:flex; justify-content:center; align-items:center; width: 100%; height: 140px; background: var(--hover-bg); border-bottom: 1px solid var(--border-color);">
                        <span class="material-symbols-outlined" style="font-size: 64px; color: ${iconColor};">${icon}</span>
                    </div>`;
                }
            }

            if (isListView) {
                card.innerHTML = `
                    <div style="display:flex; align-items:center; width:100%;">
                        <span class="material-symbols-outlined" style="color:${iconColor}; margin-right:16px;">${icon}</span>
                        <div class="file-name" style="flex-grow:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${file.name}</div>
                        <div style="width:120px; color:var(--text-secondary); text-align:right;">${dateStr}</div>
                        <div style="width:100px; color:var(--text-secondary); text-align:right;">${sizeStr}</div>
                    </div>
                `;
            } else {
                card.innerHTML = `
                    ${thumbnailHtml}
                    <div class="file-info" style="padding: 12px 16px; display:flex; align-items:center; width: 100%; box-sizing: border-box;">
                        <span class="material-symbols-outlined" style="color:${iconColor}; margin-right:12px; font-size: 20px;">${icon}</span>
                        <div class="file-name" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex-grow:1; text-align:left; margin-top:0;">${file.name}</div>
                    </div>
                `;
            }

            // Click handling for selection
            card.addEventListener('click', (e) => {
                if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    if (selectedFiles.has(file.id)) {
                        selectedFiles.delete(file.id);
                        card.classList.remove('selected');
                    } else {
                        selectedFiles.add(file.id);
                        card.classList.add('selected');
                    }
                } else {
                    document.querySelectorAll('.file-card').forEach(c => c.classList.remove('selected'));
                    selectedFiles.clear();
                    selectedFiles.add(file.id);
                    card.classList.add('selected');
                }
                updateActionBar();
            });

            // Double click handling for folders
            card.addEventListener('dblclick', (e) => {
                if (isFolder) {
                    currentParentId = file.id;
                    breadcrumbPath.push({ id: file.id, name: file.name });
                    loadFiles(0, currentParentId);
                } else {
                    // Optionally open file or download
                    window.electronAPI.openExternal(`https://drive.google.com/file/d/${file.id}/view`);
                }
            });

            // Drag out handling
            card.draggable = true;
            card.addEventListener('dragstart', (e) => {
                e.preventDefault();
                window.electronAPI.startDrag(file.id, file.name);
            });

            gridElement.appendChild(card);
        });
    }

    function applySortAndFilter(trashed = 0) {
        const filterVal = trashed ? (filterSelectTrash ? filterSelectTrash.value : 'all') : (filterSelect ? filterSelect.value : 'all');
        const sortVal = trashed ? (sortSelectTrash ? sortSelectTrash.value : 'name_asc') : (sortSelect ? sortSelect.value : 'name_asc');
        const searchVal = searchInput && !trashed ? searchInput.value.toLowerCase() : '';

        let filtered = allFilesCache.filter(f => {
            // Filter by search
            if (searchVal && !f.name.toLowerCase().includes(searchVal)) return false;
            
            // Filter by type
            if (filterVal === 'folders') return f.mimeType === 'application/vnd.google-apps.folder';
            if (filterVal === 'images') return f.mimeType.startsWith('image/');
            if (filterVal === 'videos') return f.mimeType.startsWith('video/');
            if (filterVal === 'documents') return f.mimeType.includes('document') || f.mimeType.includes('pdf') || f.mimeType.includes('word');
            return true;
        });

        // Sort
        filtered.sort((a, b) => {
            const isAFolder = a.mimeType === 'application/vnd.google-apps.folder';
            const isBFolder = b.mimeType === 'application/vnd.google-apps.folder';
            
            // Folders always first
            if (isAFolder && !isBFolder) return -1;
            if (!isAFolder && isBFolder) return 1;

            switch (sortVal) {
                case 'name_asc': return a.name.localeCompare(b.name);
                case 'name_desc': return b.name.localeCompare(a.name);
                case 'size_desc': return (b.size || 0) - (a.size || 0);
                case 'size_asc': return (a.size || 0) - (b.size || 0);
                case 'date_desc': return new Date(b.modifiedTime || 0) - new Date(a.modifiedTime || 0);
                case 'date_asc': return new Date(a.modifiedTime || 0) - new Date(b.modifiedTime || 0);
                default: return 0;
            }
        });

        renderFiles(filtered, trashed ? trashFilesGrid : homeFilesGrid);
    }

    // Event listeners for sorting and filtering
    if (sortSelect) sortSelect.addEventListener('change', () => applySortAndFilter(0));
    if (filterSelect) filterSelect.addEventListener('change', () => applySortAndFilter(0));
    if (searchInput) searchInput.addEventListener('input', () => applySortAndFilter(0));
    if (refreshHomeBtn) refreshHomeBtn.addEventListener('click', () => loadFiles(0, currentParentId));
    if (viewToggleBtn) {
        viewToggleBtn.addEventListener('click', () => {
            isListView = !isListView;
            viewToggleBtn.textContent = isListView ? 'grid_view' : 'view_list';
            applySortAndFilter(0);
        });
    }

    if (sortSelectTrash) sortSelectTrash.addEventListener('change', () => applySortAndFilter(1));
    if (filterSelectTrash) filterSelectTrash.addEventListener('change', () => applySortAndFilter(1));
    if (refreshTrashBtn) refreshTrashBtn.addEventListener('click', () => loadFiles(1, 'root'));
    if (viewToggleBtnTrash) {
        viewToggleBtnTrash.addEventListener('click', () => {
            isListView = !isListView;
            viewToggleBtnTrash.textContent = isListView ? 'grid_view' : 'view_list';
            applySortAndFilter(1);
        });
    }

    // Breadcrumbs
    function updateBreadcrumbs() {
        if (!breadcrumbsContainer) return;
        breadcrumbsContainer.innerHTML = '';
        
        breadcrumbPath.forEach((crumb, index) => {
            const span = document.createElement('span');
            span.className = 'breadcrumb-item';
            span.dataset.id = crumb.id;
            span.textContent = crumb.name;
            span.style.cursor = 'pointer';
            if (index === breadcrumbPath.length - 1) {
                span.style.color = 'var(--text-primary)';
            } else {
                span.style.color = 'var(--accent-color)';
                span.addEventListener('click', () => {
                    // Navigate back to this crumb
                    currentParentId = crumb.id;
                    breadcrumbPath = breadcrumbPath.slice(0, index + 1);
                    loadFiles(0, currentParentId);
                });
            }
            
            breadcrumbsContainer.appendChild(span);
            
            if (index < breadcrumbPath.length - 1) {
                const separator = document.createElement('span');
                separator.className = 'material-symbols-outlined';
                separator.textContent = 'chevron_right';
                separator.style.fontSize = '18px';
                separator.style.color = 'var(--text-secondary)';
                breadcrumbsContainer.appendChild(separator);
            }
        });
    }

    // --------------------------------------------------------
    // Selection & Action Bar
    // --------------------------------------------------------

    function updateActionBar() {
        if (!selectionActionBar) return;

        if (selectedFiles.size > 0) {
            selectionActionBar.style.display = 'flex';
            if (selectionCountText) selectionCountText.textContent = `${selectedFiles.size} selected`;
            
            // Toggle buttons based on view
            if (isTrashViewActive) {
                if (actionRename) actionRename.style.display = 'none';
                if (actionDownload) actionDownload.style.display = 'none';
                if (actionTrash) actionTrash.style.display = 'none';
                if (actionRestore) actionRestore.style.display = 'inline-flex';
                if (actionDeleteForever) actionDeleteForever.style.display = 'inline-flex';
            } else {
                if (actionRename) actionRename.style.display = selectedFiles.size === 1 ? 'inline-flex' : 'none';
                if (actionDownload) actionDownload.style.display = 'inline-flex';
                if (actionTrash) actionTrash.style.display = 'inline-flex';
                if (actionRestore) actionRestore.style.display = 'none';
                if (actionDeleteForever) actionDeleteForever.style.display = 'none';
            }
        } else {
            selectionActionBar.style.display = 'none';
        }
    }

    function clearSelection() {
        selectedFiles.clear();
        document.querySelectorAll('.file-card.selected').forEach(c => c.classList.remove('selected'));
        updateActionBar();
    }

    if (clearSelectionBtn) clearSelectionBtn.addEventListener('click', clearSelection);

    // Action: Rename
    if (actionRename) {
        actionRename.addEventListener('click', async () => {
            if (selectedFiles.size !== 1) return;
            const fileId = Array.from(selectedFiles)[0];
            const fileObj = allFilesCache.find(f => f.id === fileId);
            if (!fileObj) return;

            const newName = prompt('Enter new name:', fileObj.name);
            if (newName && newName !== fileObj.name) {
                showLoader('Renaming file...');
                const res = await window.electronAPI.renameFile(fileId, newName);
                hideLoader();
                if (res.success) {
                    loadFiles(isTrashViewActive ? 1 : 0, currentParentId);
                } else {
                    alert('Error renaming file: ' + res.error);
                }
            }
        });
    }

    // Action: Download
    if (actionDownload) {
        actionDownload.addEventListener('click', async () => {
            if (selectedFiles.size === 0) return;
            const filesToDownload = Array.from(selectedFiles).map(id => {
                const f = allFilesCache.find(x => x.id === id);
                return { id: f.id, name: f.name, mimeType: f.mimeType };
            });

            showLoader('Initiating download...');
            const res = await window.electronAPI.downloadFiles(filesToDownload);
            hideLoader();
            if (res && res.success) {
                showUploadManager();
            } else if (res && !res.success) {
                alert('Error downloading files: ' + res.error);
            }
            clearSelection();
        });
    }

    // Action: Move to Trash
    if (actionTrash) {
        actionTrash.addEventListener('click', async () => {
            if (selectedFiles.size === 0) return;
            if (!confirm(`Are you sure you want to move ${selectedFiles.size} item(s) to trash?`)) return;

            showLoader('Moving to trash...');
            for (const id of selectedFiles) {
                await window.electronAPI.moveToTrash(id);
            }
            hideLoader();
            clearSelection();
            loadFiles(0, currentParentId);
            updateSidebarStorage();
        });
    }

    // Action: Restore
    if (actionRestore) {
        actionRestore.addEventListener('click', async () => {
            if (selectedFiles.size === 0) return;
            showLoader('Restoring files...');
            for (const id of selectedFiles) {
                await window.electronAPI.restoreFromTrash(id);
            }
            hideLoader();
            clearSelection();
            loadFiles(1, 'root');
            updateSidebarStorage();
        });
    }

    // Action: Delete Forever
    if (actionDeleteForever) {
        actionDeleteForever.addEventListener('click', async () => {
            if (selectedFiles.size === 0) return;
            if (!confirm(`Are you sure you want to permanently delete ${selectedFiles.size} item(s)? This cannot be undone.`)) return;
            
            showLoader('Deleting files...');
            for (const id of selectedFiles) {
                await window.electronAPI.deletePermanently(id);
            }
            hideLoader();
            clearSelection();
            loadFiles(1, 'root');
            updateSidebarStorage();
        });
    }

    // Empty Trash
    if (emptyTrashBtn) {
        emptyTrashBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to empty the trash? All items will be permanently deleted.')) return;
            showLoader('Emptying trash...');
            const res = await window.electronAPI.emptyTrash();
            hideLoader();
            if (res.success) {
                loadFiles(1, 'root');
                updateSidebarStorage();
            } else {
                alert('Error emptying trash: ' + res.error);
            }
        });
    }

    // --------------------------------------------------------
    // Drag and Drop Uploads
    // --------------------------------------------------------

    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
        e.preventDefault();
        if (currentView !== 'home') return;
        dragCounter++;
        if (dropOverlay) dropOverlay.style.display = 'flex';
    });

    window.addEventListener('dragleave', (e) => {
        e.preventDefault();
        if (currentView !== 'home') return;
        dragCounter--;
        if (dragCounter === 0) {
            if (dropOverlay) dropOverlay.style.display = 'none';
        }
    });

    window.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    window.addEventListener('drop', async (e) => {
        e.preventDefault();
        dragCounter = 0;
        if (dropOverlay) dropOverlay.style.display = 'none';
        if (currentView !== 'home') return;

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            for (const file of files) {
                const filePath = window.electronAPI.getPathForFile(file);
                if (filePath) {
                    window.electronAPI.uploadFileByPath(filePath, currentParentId);
                    showUploadManager();
                }
            }
        }
    });

    if (newBtn) {
        newBtn.addEventListener('click', async () => {
            const res = await window.electronAPI.uploadFile(currentParentId);
            if (res && res.success) {
                showUploadManager();
            }
        });
    }

    function showUploadManager() {
        if (uploadManager) {
            uploadManager.style.display = 'flex';
            uploadManager.classList.remove('hidden');
            uploadManager.classList.remove('collapsed');
            if (uploadManagerToggleBtn) uploadManagerToggleBtn.textContent = 'expand_more';
        }
    }

    // Upload IPC Listeners
    let activeUploadsSet = new Set();
    let completedUploadsSet = new Set();
    const transferMeta = new Map();
    const uploadManagerTitle = document.getElementById('uploadManagerTitle');
    const uploadManagerToggleBtn = document.getElementById('uploadManagerToggle');
    const uploadManagerCloseBtn = document.getElementById('uploadManagerClose');

    function updateUploadManagerUI() {
        if (!uploadManagerTitle) return;
        
        let uploadCount = 0, downloadCount = 0;
        let activeUploads = 0, activeDownloads = 0;

        activeUploadsSet.forEach(id => {
            const type = transferMeta.get(id)?.type || 'upload';
            if (type === 'download') activeDownloads++;
            else activeUploads++;
        });

        completedUploadsSet.forEach(id => {
            const type = transferMeta.get(id)?.type || 'upload';
            if (type === 'download') downloadCount++;
            else uploadCount++;
        });

        const active = activeUploads + activeDownloads;
        const completed = uploadCount + downloadCount;
        
        if (active > 0) {
            if (activeUploads > 0 && activeDownloads === 0) uploadManagerTitle.textContent = `Uploading ${active} item${active > 1 ? 's' : ''}`;
            else if (activeDownloads > 0 && activeUploads === 0) uploadManagerTitle.textContent = `Downloading ${active} item${active > 1 ? 's' : ''}`;
            else uploadManagerTitle.textContent = `Transferring ${active} item${active > 1 ? 's' : ''}`;
        } else if (completed > 0) {
            if (uploadCount > 0 && downloadCount === 0) uploadManagerTitle.textContent = `${completed} upload${completed > 1 ? 's' : ''} complete`;
            else if (downloadCount > 0 && uploadCount === 0) uploadManagerTitle.textContent = `${completed} download${completed > 1 ? 's' : ''} complete`;
            else uploadManagerTitle.textContent = `${completed} transfer${completed > 1 ? 's' : ''} complete`;
        }
        
        if (uploadManagerCloseBtn) {
            uploadManagerCloseBtn.style.display = (active === 0 && completed > 0) ? 'inline-block' : 'none';
        }
    }

    if (uploadManagerToggleBtn && uploadManager) {
        uploadManagerToggleBtn.addEventListener('click', () => {
            uploadManager.classList.toggle('collapsed');
            uploadManagerToggleBtn.textContent = uploadManager.classList.contains('collapsed') ? 'expand_less' : 'expand_more';
        });
    }

    if (uploadManagerCloseBtn && uploadManager) {
        uploadManagerCloseBtn.addEventListener('click', () => {
            uploadManager.classList.add('hidden');
            setTimeout(() => {
                uploadManager.style.display = 'none';
                if (uploadList) uploadList.innerHTML = '';
                activeUploadsSet.clear();
                completedUploadsSet.clear();
                transferMeta.clear();
            }, 300);
        });
    }

    function createOrUpdateTransferItem(data) {
        let item = document.getElementById(`upload-${data.id}`);
        if (!item && uploadList) {
            activeUploadsSet.add(data.id);
            updateUploadManagerUI();
            
            const name = data.name || (data.filePath ? data.filePath.split(/[\\/]/).pop() : 'Unknown File');
            const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
            let icon = 'insert_drive_file';
            let iconColor = 'var(--text-secondary)';
            if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'heic'].includes(ext)) { icon = 'image'; iconColor = '#ea4335'; }
            else if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) { icon = 'movie'; iconColor = '#ea4335'; }
            else if (['pdf'].includes(ext)) { icon = 'picture_as_pdf'; iconColor = '#ea4335'; }
            else if (['doc', 'docx', 'txt'].includes(ext)) { icon = 'description'; iconColor = '#4285f4'; }

            item = document.createElement('div');
            item.id = `upload-${data.id}`;
            item.style.padding = '10px 16px';
            item.style.borderBottom = '1px solid var(--border-color)';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '12px';
            item.innerHTML = `
                <span class="material-symbols-outlined" style="color: ${iconColor}; font-size: 24px; font-variation-settings: 'FILL' 1;">${icon}</span>
                <span style="flex-grow: 1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size: 14px; color: var(--text-primary);" class="upload-item-name-text">${name}</span>
                <div class="progress-container" style="width: 24px; height: 24px; position: relative; display: flex; align-items: center; justify-content: center;">
                    <svg class="progress-ring" width="24" height="24" style="position: absolute; top:0; left:0; pointer-events: none;">
                        <circle class="progress-ring__circle" stroke="var(--border-color)" stroke-width="3" fill="transparent" r="9" cx="12" cy="12"/>
                        <circle class="progress-ring__circle--progress" stroke="var(--accent-color)" stroke-width="3" fill="transparent" r="9" cx="12" cy="12" style="stroke-dasharray: 56.55; stroke-dashoffset: 56.55; transition: stroke-dashoffset 0.1s; transform: rotate(-90deg); transform-origin: 50% 50%;"/>
                    </svg>
                    <span class="material-symbols-outlined cancel-btn" style="font-size:16px; color: var(--text-secondary); cursor: pointer; position: relative; z-index: 1;" title="Cancel">close</span>
                </div>
            `;
            
            const cancelBtn = item.querySelector('.cancel-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    window.electronAPI.cancelUpload(data.id);
                });
            }

            uploadList.appendChild(item);
            showUploadManager();
        }
        return item;
    }

    if (window.electronAPI.onTransferStart) {
        window.electronAPI.onTransferStart((event, data) => {
            transferMeta.set(data.id, data);
            createOrUpdateTransferItem(data);
        });
    }

    if (window.electronAPI.onUploadProgress) {
        window.electronAPI.onUploadProgress((event, data) => {
            const meta = transferMeta.get(data.id) || {};
            const mergedData = { ...meta, ...data };
            let item = createOrUpdateTransferItem(mergedData);

            if (item) {
                const percent = data.progress || 0;
                const offset = 56.55 - (percent / 100) * 56.55;
                const circle = item.querySelector('.progress-ring__circle--progress');
                if (circle) circle.style.strokeDashoffset = offset;
            }
        });
    }

    if (window.electronAPI.onUploadComplete) {
        window.electronAPI.onUploadComplete((event, data) => {
            let item = document.getElementById(`upload-${data.id}`);
            if (item) {
                activeUploadsSet.delete(data.id);
                completedUploadsSet.add(data.id);
                updateUploadManagerUI();
                
                const progressContainer = item.querySelector('.progress-container');
                if (progressContainer) {
                    progressContainer.innerHTML = `<span class="material-symbols-outlined" style="color: #34a853; font-size: 24px; font-variation-settings: 'FILL' 1;">check_circle</span>`;
                }
            }
            if (currentView === 'home') {
                loadFiles(0, currentParentId);
                updateSidebarStorage();
            }
        });
    }

    if (window.electronAPI.onUploadError) {
        window.electronAPI.onUploadError((event, data) => {
            let item = document.getElementById(`upload-${data.id}`);
            if (item) {
                activeUploadsSet.delete(data.id);
                updateUploadManagerUI();
                
                const progressContainer = item.querySelector('.progress-container');
                if (progressContainer) {
                    if (data.error && data.error.includes('aborted')) {
                        progressContainer.innerHTML = `<span class="material-symbols-outlined" style="color: var(--text-secondary); font-size: 24px;">cancel</span>`;
                        progressContainer.title = "Canceled";
                    } else {
                        progressContainer.innerHTML = `<span class="material-symbols-outlined" style="color: #ea4335; font-size: 24px; font-variation-settings: 'FILL' 1;">error</span>`;
                        progressContainer.title = data.error;
                    }
                }
            }
        });
    }

    // --------------------------------------------------------
    // Dashboard & Accounts
    // --------------------------------------------------------

    
    async function refreshSetupInputs() {
        try {
            const res = await window.electronAPI.getSettings();
            if (res && res.success && res.settings) {
                if (setupClientId && res.settings.client_id) setupClientId.value = res.settings.client_id;
                if (setupClientSecret && res.settings.client_secret) setupClientSecret.value = res.settings.client_secret;
            }
        } catch (error) {
            console.error("Error refreshing setup:", error);
        }
    }

    async function loadDashboard() {
        if (!accountsList) return;
        accountsList.innerHTML = '<div style="padding: 20px; text-align: center;">Loading accounts...</div>';
        
        try {
            const accounts = await window.electronAPI.getAccounts();
            if (totalAccountsCount) totalAccountsCount.textContent = accounts.length;

            accountsList.innerHTML = '';
            if (accounts.length === 0) {
                accountsList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No accounts connected. Click "Add Account" to get started.</div>';
            } else {
                accounts.forEach(acc => {
                    const el = document.createElement('div');
                    el.style.display = 'flex';
                    el.style.justifyContent = 'space-between';
                    el.style.alignItems = 'center';
                    el.style.padding = '12px 16px';
                    el.style.background = 'var(--card-bg)';
                    el.style.border = '1px solid var(--border-color)';
                    el.style.borderRadius = '8px';
                    el.style.marginBottom = '8px';

                    el.innerHTML = `
                        <div style="display:flex; align-items:center; gap:12px;">
                            <span class="material-symbols-outlined" style="color:var(--text-secondary); font-size:24px;">account_circle</span>
                            <div>
                                <div style="font-weight:500;">${acc.email}</div>
                            </div>
                        </div>
                        <button class="remove-account-btn" data-id="${acc.id}" style="background:none; border:none; color:#ea4335; cursor:pointer; padding:4px;" title="Remove Account">
                            <span class="material-symbols-outlined">delete</span>
                        </button>
                    `;
                    
                    const removeBtn = el.querySelector('.remove-account-btn');
                    removeBtn.addEventListener('click', async () => {
                        if (confirm(`Remove account ${acc.email}?`)) {
                            showLoader('Removing account...');
                            await window.electronAPI.deleteAccount(acc.id);
                            hideLoader();
                            loadDashboard();
                            updateSidebarStorage();
                        }
                    });

                    accountsList.appendChild(el);
                });
            }

            // Load Storage Breakdown separately so errors don't clear accounts list
            try {
                const breakdown = await window.electronAPI.getStorageBreakdown();
                if (breakdown) {
                    const total = breakdown.total || 1; // prevent div by zero
                    const pImg = (breakdown.images / total) * 100;
                    const pVid = (breakdown.videos / total) * 100;
                    const pDoc = (breakdown.documents / total) * 100;
                    const pOth = (breakdown.others / total) * 100;

                    if (barImages) barImages.style.width = `${pImg}%`;
                    if (barVideos) barVideos.style.width = `${pVid}%`;
                    if (barDocs) barDocs.style.width = `${pDoc}%`;
                    if (barOthers) barOthers.style.width = `${pOth}%`;

                    if (textImages) textImages.textContent = formatBytes(breakdown.images);
                    if (textVideos) textVideos.textContent = formatBytes(breakdown.videos);
                    if (textDocs) textDocs.textContent = formatBytes(breakdown.documents);
                    if (textOthers) textOthers.textContent = formatBytes(breakdown.others);
                }
            } catch (breakdownError) {
                console.error('Error loading storage breakdown:', breakdownError);
            }

        } catch (error) {
            console.error('Error loading dashboard:', error);
            accountsList.innerHTML = '<div style="padding: 20px; text-align: center; color: #ea4335;">Failed to load accounts.</div>';
        }
    }

    async function updateSidebarStorage() {
        try {
            const info = await window.electronAPI.getStorageInfo();
            if (info && info.total) {
                const percent = (info.used / info.total) * 100;
                if (sidebarProgressBar) sidebarProgressBar.style.width = `${Math.min(percent, 100)}%`;
                if (sidebarStorageText) sidebarStorageText.textContent = `${formatBytes(info.used)} of ${formatBytes(info.total)} used`;
                
                if (percent > 90 && sidebarProgressBar) {
                    sidebarProgressBar.style.background = '#ea4335';
                } else if (sidebarProgressBar) {
                    sidebarProgressBar.style.background = 'var(--accent-color)';
                }
            } else {
                if (sidebarStorageText) sidebarStorageText.textContent = 'Storage info unavailable';
            }
        } catch (e) {
            console.error('Storage info error:', e);
            if (sidebarStorageText) sidebarStorageText.textContent = 'Error loading storage';
        }
    }

    if (addAccountBtnDash) {
        addAccountBtnDash.addEventListener('click', async () => {
            showLoader('Adding account...');
            const res = await window.electronAPI.addAccount();
            hideLoader();
            if (res.success) {
                loadDashboard();
                updateSidebarStorage();
            } else {
                alert('Failed to add account: ' + res.error);
            }
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            const res = await window.electronAPI.exportData();
            if (res && res.canceled) return;
            if (res && res.success) {
                alert('Data exported successfully!');
            } else {
                alert('Export failed: ' + (res ? res.error : 'Unknown error'));
            }
        });
    }

    if (importBtn) {
        importBtn.addEventListener('click', async () => {
            if (!confirm('Importing data will replace current accounts. Continue?')) return;
            const res = await window.electronAPI.importData();
            if (res && res.canceled) return;
            if (res && res.success) {
                alert('Data imported successfully!');
                loadDashboard();
                updateSidebarStorage();
                refreshSetupInputs();
            } else {
                alert('Import failed: ' + (res ? res.error : 'Unknown error'));
            }
        });
    }

    if (clearCacheBtnDash) {
        clearCacheBtnDash.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to clear the local file cache?')) return;
            showLoader('Clearing cache...');
            const res = await window.electronAPI.clearCache();
            hideLoader();
            if (res.success) {
                alert('Cache cleared!');
                if (currentView === 'home') loadFiles(0, currentParentId);
                else if (currentView === 'dashboard') loadDashboard();
            } else {
                alert('Failed to clear cache: ' + res.error);
            }
        });
    }

    // Theme Toggle Logic
    if (themeToggle) {
        // Load saved theme
        const isDark = localStorage.getItem('theme') === 'dark';
        themeToggle.checked = isDark;
        if (isDark) document.body.classList.add('dark-theme');

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

    // Initialize App
    checkSetup();

    // Auto-sync polling every 10 seconds
    setInterval(() => {
        if (currentView === 'home') {
            loadFiles(0, currentParentId, true);
        } else if (currentView === 'trash') {
            loadFiles(1, 'root', true);
        }
    }, 10000);
});
