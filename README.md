# ☁️ G Drive Connector (v1.0.0)

A beautiful, modern, and streamlined desktop application to manage multiple Google Drive accounts simultaneously. Easily upload, browse, search, and manage your Google Drive files with a clean, dark-mode supported GUI.

---

## 🚀 Overview & Features

`G Drive Connector` provides an intuitive Electron-based graphical interface that acts as a powerful hub for your Google Drive accounts. It handles:

- **Multi-Account Support:** Connect and seamlessly switch between multiple Google Drive accounts via OAuth 2.0.
- **Import & Export Accounts:** Securely backup (export) and restore (import) all your connected accounts and authentication tokens for easy migration between devices.
- **File Management:** Upload files (via drag-and-drop or file picker), view files in grid or list view, and monitor your global storage usage.
- **Search & Filter:** Quickly search for specific files across your Drive.
- **Trash Management:** Safely move files to the trash, permanently delete them, or empty the entire trash with a single click.
- **Stunning UI/UX:** A modern interface with glassmorphism effects, smooth animations, and a seamless Dark Mode toggle for a premium user experience.
- **Local Caching:** Utilizes local SQLite database to cache file metadata for lightning-fast browsing and search.

---

## 📦 Building G Drive Connector (All Platforms)

You can easily package G Drive Connector for distribution and installation on macOS, Windows, and Linux.

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build for your specific OS:**
   - **macOS:** `npm run build:mac` (Generates `.dmg`)
   - **Windows:** `npm run build:win` (Generates `.exe`)
   - **Linux:** `npm run build:linux` (Generates `.AppImage`)
   - **All OS at once:** `npm run dist`

3. The generated installer files will be placed in the `dist/` directory.

---

## 💻 Installation Guide

### 🍏 macOS
**Via Homebrew:**
Once the tap is pushed to GitHub, you can install the app easily:
```bash
brew tap muhammadsaif7717/apps
brew trust muhammadsaif7717/apps
brew install --cask gdrive-connector
```
*Note: If the app fails to open after installation due to macOS Gatekeeper restrictions, run the following command to remove the quarantine attribute:*
```bash
sudo xattr -cr "/Applications/G Drive Connector.app"
```
**Update via Brew:** `brew upgrade --cask gdrive-connector`
**Uninstall via Brew:** `brew uninstall --cask gdrive-connector`

**Via DMG:**
Simply download the `.dmg` file from Releases, open it, and drag the app into your Applications folder.

### 🪟 Windows
Download the `.exe` installer from the GitHub Releases page. Double-click the installer and follow the on-screen instructions to install the application.

### 🐧 Linux
Download the `.AppImage` file from the GitHub Releases page.
Before running it, you must make it executable. Open a terminal in the folder where it downloaded and run:
```bash
chmod +x "G Drive Connector-1.0.0-arm64.AppImage"
./"G Drive Connector-1.0.0-arm64.AppImage"
```

## 📄 License

This software is provided as a personal project. Users are free to download and use the compiled application. However, the source code is proprietary and may not be cloned, copied, modified, merged, or published without permission. The author is not responsible for any data loss or system issues. See the `LICENSE` file for full details.
