import re

with open("src/index.html", "r") as f:
    content = f.read()

# Replace My Files h2 with breadcrumbs
old_h2 = "<h2>My Files</h2>"
new_breadcrumbs = """<div class="breadcrumb-container" id="breadcrumbs" style="font-size: 20px; font-weight: 600; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                        <span class="breadcrumb-item" data-id="root" style="cursor:pointer; color:var(--accent-color);">Home</span>
                    </div>"""
content = content.replace(old_h2, new_breadcrumbs)

# Add Create Folder button in the action bar
old_action_bar = """<button class="btn primary new-btn"><span class="material-symbols-outlined">add</span> New</button>"""
new_action_bar = """<button class="btn primary new-btn"><span class="material-symbols-outlined">add</span> New File</button>
                    <button class="btn secondary new-folder-btn" style="margin-left: 8px;"><span class="material-symbols-outlined">create_new_folder</span> New Folder</button>"""
content = content.replace(old_action_bar, new_action_bar)

with open("src/index.html", "w") as f:
    f.write(content)
