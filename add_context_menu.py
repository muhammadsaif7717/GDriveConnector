import re

# 1. Update index.html
with open('src/index.html', 'r') as f:
    html = f.read()

context_menu = """
    <!-- Context Menu -->
    <div id="custom-context-menu" class="hidden" style="position: absolute; z-index: 2000; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 8px 0; width: 160px;">
        <ul style="list-style: none; margin: 0; padding: 0;">
            <li id="ctx-open" style="padding: 8px 16px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px;"><span class="material-symbols-outlined" style="font-size:18px;">open_in_new</span> Open</li>
            <li id="ctx-download" style="padding: 8px 16px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px;"><span class="material-symbols-outlined" style="font-size:18px;">download</span> Download</li>
            <li id="ctx-rename" style="padding: 8px 16px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px;"><span class="material-symbols-outlined" style="font-size:18px;">edit</span> Rename</li>
            <li id="ctx-delete" style="padding: 8px 16px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px; color: #ea4335;"><span class="material-symbols-outlined" style="font-size:18px;">delete</span> Delete</li>
        </ul>
    </div>
"""

html = html.replace('<!-- Upload Manager Dialog -->', context_menu + '\n    <!-- Upload Manager Dialog -->')
with open('src/index.html', 'w') as f:
    f.write(html)

# 2. Update style.css
with open('src/style.css', 'a') as f:
    f.write('''
/* Context Menu & Selection */
.file-card.selected, .file-list-item.selected {
    border-color: var(--accent-color);
    background: rgba(26, 115, 232, 0.05);
}
#custom-context-menu li:hover {
    background: var(--hover-color);
}
''')

# 3. Update renderer.js
with open('src/renderer.js', 'r') as f:
    js = f.read()

# Add selectedFiles set
js = js.replace("let currentSearchQuery = '';", "let currentSearchQuery = '';\nlet selectedFiles = new Set();\n")

# Update card rendering to handle selection and context menu
card_html_old = """                <div class="file-icon click-to-open" data-id="${file.id}" data-name="${file.name}" style="cursor: pointer;">
                    <span class="material-symbols-outlined">${icon}</span>
                </div>"""
card_html_new = """                <div class="file-icon click-to-open" data-id="${file.id}" data-name="${file.name}" style="cursor: pointer;">
                    <span class="material-symbols-outlined">${icon}</span>
                </div>"""
# we need to inject selection logic when a file card is created
selection_logic = """
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
"""

# Find where card is appended and insert selection logic
js = js.replace("            grid.appendChild(card);\n        });", selection_logic + "\n            grid.appendChild(card);\n        });")

# Add global context menu hiding and bulk actions
bulk_logic = """
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
"""

js = js.replace("    // Search\n    const searchInput = document.getElementById('search-input');", bulk_logic + "\n    // Search\n    const searchInput = document.getElementById('search-input');")

with open('src/renderer.js', 'w') as f:
    f.write(js)

