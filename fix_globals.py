import re

with open("src/renderer.js", "r") as f:
    content = f.read()

# Insert at the very top, after document.addEventListener
target = "document.addEventListener('DOMContentLoaded', () => {"
insertion = """document.addEventListener('DOMContentLoaded', () => {
    let selectedFiles = new Set();
    let currentFolderId = 'root';
    let breadcrumbs = [{ id: 'root', name: 'Home' }];
"""

content = content.replace("document.addEventListener('DOMContentLoaded', () => {", insertion)

with open("src/renderer.js", "w") as f:
    f.write(content)
