import re
import os

with open("src/index.html", "r") as f:
    html = f.read()

# 1. Add Selection Action Bar at the top of main content
action_bar_html = """
            <!-- Selection Action Bar -->
            <div id="selection-action-bar" style="display: none; position: absolute; top: 0; left: 260px; right: 0; height: 64px; background: var(--card-bg); z-index: 50; border-bottom: 1px solid var(--border-color); align-items: center; padding: 0 24px; justify-content: space-between; box-shadow: 0 2px 6px rgba(0,0,0,0.05);">
                <div style="display: flex; align-items: center; gap: 16px;">
                    <span class="material-symbols-outlined" id="clear-selection-btn" style="cursor: pointer; border-radius: 50%; padding: 8px;">close</span>
                    <span id="selection-count" style="font-size: 16px; font-weight: 500;">1 selected</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button id="action-rename" class="icon-btn" title="Rename"><span class="material-symbols-outlined">edit</span></button>
                    <button id="action-download" class="icon-btn" title="Download"><span class="material-symbols-outlined">download</span></button>
                    <button id="action-trash" class="icon-btn" title="Move to Trash"><span class="material-symbols-outlined">delete</span></button>
                    <button id="action-more" class="icon-btn" title="More actions"><span class="material-symbols-outlined">more_vert</span></button>
                </div>
            </div>
"""

if 'id="selection-action-bar"' not in html:
    html = html.replace('<!-- Main Content -->', action_bar_html + '\n            <!-- Main Content -->')

# 2. Update existing multi-select actions (remove them from view-options)
html = re.sub(r'<div class="multi-select-actions hidden".*?</div>', '', html, flags=re.DOTALL)

# 3. Add generic Empty Space Context Menu
empty_space_menu = """
    <!-- Empty Space Context Menu -->
    <div id="empty-space-context-menu" class="hidden material-menu" style="position: absolute; z-index: 2000; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 8px 0; width: 200px;">
        <ul style="list-style: none; margin: 0; padding: 0;">
            <li id="ctx-empty-new-folder" style="padding: 10px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; font-size: 14px;"><span class="material-symbols-outlined" style="font-size:20px;">create_new_folder</span> New folder</li>
            <li style="border-top: 1px solid var(--border-color); margin: 4px 0;"></li>
            <li id="ctx-empty-upload-file" style="padding: 10px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; font-size: 14px;"><span class="material-symbols-outlined" style="font-size:20px;">upload_file</span> File upload</li>
        </ul>
    </div>
"""

if 'id="empty-space-context-menu"' not in html:
    html = html.replace('<!-- Context Menu -->', empty_space_menu + '\n    <!-- Context Menu -->')

with open("src/index.html", "w") as f:
    f.write(html)
