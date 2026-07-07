import re
import os

with open("src/index.html", "r") as f:
    html = f.read()

# 1. Clean sidebar (remove new-folder-btn, replace new-btn with a container)
html = re.sub(
    r'<button class="new-folder-btn".*?</button>\s*<button class="new-btn">.*?New\s*</button>',
    '''<div class="new-btn-container" style="position:relative; margin: 0 16px 16px 16px;">
                    <button class="new-btn" style="width:100%; margin:0;">
                        <span class="material-symbols-outlined">add</span>
                        New
                    </button>
                    <div class="new-dropdown hidden" style="position:absolute; top:100%; left:0; width:100%; background:var(--card-bg); border:1px solid var(--border-color); border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.15); z-index:100; margin-top:4px; display:none;">
                        <div class="new-folder-option" style="padding:12px; cursor:pointer; display:flex; align-items:center; gap:8px;"><span class="material-symbols-outlined">create_new_folder</span> New Folder</div>
                        <div class="upload-file-option" style="padding:12px; cursor:pointer; display:flex; align-items:center; gap:8px;"><span class="material-symbols-outlined">upload_file</span> Upload File</div>
                    </div>
                </div>''',
    html,
    flags=re.DOTALL
)

# 2. Add refresh button and multi-select actions to home-view
home_header_replacement = '''<div class="view-options" style="display:flex; align-items:center; gap:12px;">
                        <div class="multi-select-actions hidden" style="display:none; align-items:center; gap:8px; margin-right: 12px; border-right: 1px solid var(--border-color); padding-right: 12px;">
                            <button class="bulk-download-btn" style="background:transparent; border:none; cursor:pointer; color:var(--text-secondary);" title="Download Selected"><span class="material-symbols-outlined">download</span></button>
                            <button class="bulk-trash-btn" style="background:transparent; border:none; cursor:pointer; color:#ea4335;" title="Trash Selected"><span class="material-symbols-outlined">delete</span></button>
                        </div>
                        <button class="refresh-home-btn" style="background:transparent; border:none; cursor:pointer; color:var(--text-secondary);" title="Refresh"><span class="material-symbols-outlined">refresh</span></button>
                        <span class="material-symbols-outlined" id="view-toggle-btn" title="Toggle List View">view_list</span>
                    </div>'''
html = re.sub(
    r'<div class="view-options">\s*<span class="material-symbols-outlined" id="view-toggle-btn".*?</div>',
    home_header_replacement,
    html,
    flags=re.DOTALL
)

# 3. Add refresh button to trash-view
trash_header_replacement = '''<div class="view-options" style="display:flex; align-items:center; gap:12px;">
                        <button class="refresh-trash-btn" style="background:transparent; border:none; cursor:pointer; color:var(--text-secondary);" title="Refresh"><span class="material-symbols-outlined">refresh</span></button>
                        <button class="empty-trash-btn" style="padding: 8px 16px; background: #ea4335; color: white; border: none; border-radius: 20px; cursor: pointer;">Empty Trash</button>
                    </div>'''
html = re.sub(
    r'<div class="view-options">\s*<button class="empty-trash-btn".*?</button>\s*</div>',
    trash_header_replacement,
    html,
    flags=re.DOTALL
)

with open("src/index.html", "w") as f:
    f.write(html)
