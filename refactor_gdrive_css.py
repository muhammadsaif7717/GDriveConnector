css_additions = """
/* Material 3 Action Bar & Icons */
.icon-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    transition: background-color 0.2s;
}
.icon-btn:hover, #clear-selection-btn:hover {
    background-color: rgba(0,0,0,0.04);
}
.dark-theme .icon-btn:hover, .dark-theme #clear-selection-btn:hover {
    background-color: rgba(255,255,255,0.08);
}

/* Selected State */
.file-card {
    transition: background-color 0.2s, box-shadow 0.2s, border-color 0.2s;
    user-select: none;
}
.file-card.selected {
    background-color: #f0f4f9;
    border-color: transparent;
}
.dark-theme .file-card.selected {
    background-color: #1f1f1f;
}

/* Material 3 menus */
.material-menu li:hover {
    background-color: rgba(0,0,0,0.04);
}
.dark-theme .material-menu li:hover {
    background-color: rgba(255,255,255,0.08);
}
"""

with open("src/style.css", "a") as f:
    f.write(css_additions)
