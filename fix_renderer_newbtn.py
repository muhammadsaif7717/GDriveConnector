with open("src/renderer.js", "r") as f:
    lines = f.readlines()

# Remove the old declaration at lines 310-318 (wherever the duplicate is)
# Let's find it.
start_idx = -1
for i, line in enumerate(lines):
    if "const dropdownNewBtn = document.querySelector('.new-btn');" in line and i > 100:
        start_idx = i
        break

if start_idx != -1:
    end_idx = start_idx
    while "});" not in lines[end_idx] and end_idx < len(lines):
        end_idx += 1
    del lines[start_idx:end_idx+1]

with open("src/renderer.js", "w") as f:
    f.writelines(lines)
