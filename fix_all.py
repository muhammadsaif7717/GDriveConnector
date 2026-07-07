import re

with open("src/index.html", "r") as f:
    html = f.read()

# Add New Folder button
if "new-folder-btn" not in html:
    html = html.replace(
        '<button class="new-btn">',
        '<button class="new-folder-btn" style="background:#f0f4f9; border:none; border-radius:12px; padding:12px 24px; font-weight:500; cursor:pointer; margin-left:16px;"><span class="material-symbols-outlined" style="vertical-align:middle; margin-right:8px;">create_new_folder</span>New Folder</button>\n                <button class="new-btn">'
    )

with open("src/index.html", "w") as f:
    f.write(html)


with open("src/renderer.js", "r") as f:
    js = f.read()

# Replace let currentFolderId with window.currentFolderId
js = js.replace("let currentFolderId = 'root';", "window.currentFolderId = 'root';")
js = re.sub(r'(?<!window\.)currentFolderId', 'window.currentFolderId', js)

with open("src/renderer.js", "w") as f:
    f.write(js)
