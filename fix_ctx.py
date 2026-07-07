import re

with open("src/renderer.js", "r") as f:
    js = f.read()

ctx_open_old = """    document.getElementById('ctx-open').addEventListener('click', async () => {
        for (let id of selectedFiles) {
            const el = document.querySelector(`.click-to-open[data-id="${id}"]`);
            if (el) el.click();
        }
    });"""

ctx_open_new = """    document.getElementById('ctx-open').addEventListener('click', async () => {
        for (let id of selectedFiles) {
            await window.electronAPI.openFileLocally(id);
        }
    });"""

ctx_download_old = """    document.getElementById('ctx-download').addEventListener('click', async () => {
        for (let id of selectedFiles) {
            const el = document.querySelector(`.download-file[data-id="${id}"]`);
            if (el) el.click();
        }
    });"""

ctx_download_new = """    document.getElementById('ctx-download').addEventListener('click', async () => {
        for (let id of selectedFiles) {
            await window.electronAPI.downloadFile(id);
        }
    });"""

ctx_delete_old = """    document.getElementById('ctx-delete').addEventListener('click', async () => {
        if (confirm(`Delete ${selectedFiles.size} items?`)) {
            for (let id of selectedFiles) {
                const el = document.querySelector(`.delete-file[data-id="${id}"]`);
                if (el) el.click();
            }
        }
    });"""

ctx_delete_new = """    document.getElementById('ctx-delete').addEventListener('click', async () => {
        if (confirm(`Delete ${selectedFiles.size} items?`)) {
            for (let id of selectedFiles) {
                await window.electronAPI.moveToTrash(id);
            }
            loadFiles(0, 'home-files-grid');
        }
    });"""

ctx_rename_old = """    document.getElementById('ctx-rename').addEventListener('click', async () => {
        if (selectedFiles.size === 1) {
            const id = Array.from(selectedFiles)[0];
            const el = document.querySelector(`.rename-file[data-id="${id}"]`);
            if (el) el.click();
        } else {
            alert('Select only one file to rename.');
        }
    });"""

ctx_rename_new = """    document.getElementById('ctx-rename').addEventListener('click', async () => {
        if (selectedFiles.size === 1) {
            const id = Array.from(selectedFiles)[0];
            const name = prompt("Enter new name:");
            if (name) {
                await window.electronAPI.renameFile(id, name);
                loadFiles(0, 'home-files-grid');
            }
        } else {
            alert('Select only one file to rename.');
        }
    });"""

js = js.replace(ctx_open_old, ctx_open_new)
js = js.replace(ctx_download_old, ctx_download_new)
js = js.replace(ctx_delete_old, ctx_delete_new)
js = js.replace(ctx_rename_old, ctx_rename_new)

with open("src/renderer.js", "w") as f:
    f.write(js)
