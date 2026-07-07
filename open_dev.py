import re

with open("main.js", "r") as f:
    content = f.read()

content = content.replace("mainWindow.loadFile('src/index.html');", "mainWindow.loadFile('src/index.html');\n    mainWindow.webContents.openDevTools();")

with open("main.js", "w") as f:
    f.write(content)
