import re

with open("src/renderer.js", "r") as f:
    content = f.read()

# 1. Replace newBtn listener
new_btn_listener = """    if (newBtn) {
        newBtn.addEventListener('click', async () => {
            newBtn.disabled = true;
            const result = await window.electronAPI.uploadFile();
            if (result.success && result.tasks) {
                result.tasks.forEach(task => addUploadTask(task));
            } else if (!result.canceled && result.error) {
                alert(`Upload error: ${result.error}`);
            }
            newBtn.disabled = false;
        });
    }"""

content = re.sub(r'    if \(newBtn\) \{[\s\S]*?    \}', new_btn_listener, content, count=1)

# 2. Replace drop listener
drop_listener = """        window.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropOverlay.style.display = 'none';
            for (const file of e.dataTransfer.files) {
                const result = await window.electronAPI.uploadFileByPath(file.path);
                if (result.success && result.tasks) {
                    result.tasks.forEach(task => addUploadTask(task));
                }
            }
        });"""

content = re.sub(r'        window.addEventListener\(\'drop\', async \(e\) => \{[\s\S]*?        \}\);', drop_listener, content, count=1)

# 3. Remove old progress listener and add init functions
old_prog = r"""    // Listen for upload progress
    if \(window.electronAPI.onUploadProgress\) \{
        window.electronAPI.onUploadProgress\(\(event, data\) => \{
            const newBtn = document.querySelector\('.new-btn'\);
            if \(newBtn && newBtn.innerHTML.includes\('Upload'\)\) \{
                newBtn.innerHTML = `<span class="material-symbols-outlined">hourglass_empty</span> \$\{data.progress\}% Uploaded`;
            \}
        \}\);
    \}"""

init_functions = """    function initUploadManager() {
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
"""

content = re.sub(old_prog, init_functions, content)

with open("src/renderer.js", "w") as f:
    f.write(content)

