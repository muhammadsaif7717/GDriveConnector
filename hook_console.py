import re

with open("main.js", "r") as f:
    content = f.read()

target = "mainWindow.loadFile('src/index.html');"
insertion = """mainWindow.loadFile('src/index.html');
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[Renderer] ${message}`);
    });
"""

content = content.replace(target, insertion)

with open("main.js", "w") as f:
    f.write(content)
