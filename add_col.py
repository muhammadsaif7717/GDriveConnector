import re

with open("src/db.js", "r") as f:
    content = f.read()

alter_col = """    db.run(`ALTER TABLE files ADD COLUMN parent_id TEXT`, (err) => {});
    db.run(`ALTER TABLE files ADD COLUMN trashed INTEGER DEFAULT 0`, (err) => {"""

content = content.replace("    db.run(`ALTER TABLE files ADD COLUMN trashed INTEGER DEFAULT 0`, (err) => {", alter_col)

with open("src/db.js", "w") as f:
    f.write(content)
