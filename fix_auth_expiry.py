import re

with open('src/fileOps.js', 'r') as f:
    content = f.read()

# Pattern 1: account.refresh_token
content = re.sub(
    r'(refresh_token:\s*account\.refresh_token)\s*}',
    r'\1,\n            expiry_date: account.expiry_date\n        }',
    content
)

# Pattern 2: row.refresh_token
content = re.sub(
    r'(refresh_token:\s*row\.refresh_token)\s*}',
    r'\1,\n                        expiry_date: row.expiry_date\n                    }',
    content
)

with open('src/fileOps.js', 'w') as f:
    f.write(content)
