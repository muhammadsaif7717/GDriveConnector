document.addEventListener('DOMContentLoaded', () => {
    let selectedFiles = new Set();
    let lastSelectedId = null;
    let currentFilesList = [];
    window.currentFolderId = 'root';

    window.showLoader = function(text = "Processing...") {
        const loader = document.getElementById('global-loader');
        const textEl = document.getElementById('global-loader-text');
        if (loader && textEl) {
            textEl.innerText = text;
            loader.classList.remove('hidden');
        }
    };

    window.hideLoader = function() {
        const loader = document.getElementById('global-loader');
        if (loader) loader.classList.add('hidden');
    };

    window.showToast = function(msg) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast-msg';
        toast.innerHTML = `<span>${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    let breadcrumbs = [{ id: "root", name: "Home" }];
    
    const newBtn = document.querySelector('.new-btn');
    if (newBtn) {
        newBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('ctx-empty-upload-file')?.click();
        
    // Help link from setup page
    const linkToHelp = document.getElementById("link-to-help");
    if (linkToHelp && navHelp) {
        linkToHelp.addEventListener("click", (e) => {
            e.preventDefault();
            navHelp.click();
        });
    }

});
    }

    const newFolderOption = document.querySelector('.new-folder-option');
    if (newFolderOption) {
        newFolderOption.addEventListener('click', () => {
            newDropdown.style.display = 'none';
            document.getElementById('ctx-empty-new-folder')?.click();
        
    // Help link from setup page
