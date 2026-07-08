# ☁️ G Drive Connector (v1.0.0)

* [ ] [ ]

---

## ✨ Key Features & Capabilities

`G Drive Connector` provides an intuitive graphical interface leveraging the Google Drive API to deliver a native-feeling experience:

- **Multi-Account Support:** Securely connect, manage, and seamlessly switch between multiple Google Drive accounts via OAuth 2.0.
- **Dynamic Storage Monitoring:** Automatically aggregates your storage quotas (e.g., 15GB, 30GB) across all connected accounts, displaying real-time visual progress bars and detailed file-type breakdowns (Images, Videos, Docs, Others).
- **Advanced File Management:**
  - **Uploads & Downloads:** Drag-and-drop file uploading, plus native download support directly to your machine.
  - **Context Menus:** Right-click on files/folders to Open, Download, Rename, Move to Trash, or Delete Permanently. Right-click on empty space to Create New Folders or Upload Files.
  - **Unified Trash View:** Manage the recycle bins of all your connected accounts from one central interface. Restore files or empty the trash entirely with a single click.
- **Rich Media Thumbnails:** Securely fetches and renders authorized, edge-to-edge image and video thumbnails directly from Google's servers, bringing your grid view to life.
- **Pro-Level Multi-Selection:** Select files just like a native OS! Supports `Shift + Click` for range selection, `Ctrl/Cmd + Click` for individual toggling, and `Ctrl/Cmd + A` to select all files.
- **Grid vs. List Views:** Toggle between a spacious thumbnail grid view or a compact list view showing modification dates and exact file sizes.
- **Import & Export Accounts:** Securely backup (export) and restore (import) all your connected accounts and authentication tokens for easy migration between devices.
- **Stunning UI/UX:** A modern interface with hover animations, pulsing loading states, spinning refresh indicators, rounded cards, and a seamless Dark Mode toggle.

---

## 🛠️ Technology Stack

- **Frontend:** HTML5, Vanilla JavaScript, CSS3 (No heavy frameworks, highly optimized custom design system).
- **Backend:** Node.js, Electron framework.
- **Database:** SQLite3 (Local caching for accounts, tokens, and storage metrics).
- **Integration:** Google APIs (`googleapis`), specifically Google Drive API v3.
- **IPC:** Secure context bridging via Electron Preload scripts (`preload.js`).

---

## 🚀 Building G Drive Connector (All Platforms)

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

**Troubleshooting "Missing Shortcut" Error (Windows Defender)**
Since this app is not signed with a paid certificate, Windows Defender or other antivirus software might falsely flag and remove the executable immediately after installation, resulting in a "Missing Shortcut" error when trying to open the app.

To resolve this:
1. Open **Windows Security** > **Virus & threat protection** > **Protection history**.
2. Look for the recently blocked `G Drive Connector.exe` file and select **Allow on device** or **Restore**.
3. If it's not in the history, uninstall the app, temporarily disable **Real-time protection**, and reinstall the app.
4. Once installed and working, add the installation folder (usually `%localappdata%\Programs\G Drive Connector`) to your Windows Security **Exclusions** list before turning Real-time protection back on.

### 🐧 Linux

Download the `.AppImage` file from the GitHub Releases page.
Before running it, you must make it executable. Open a terminal in the folder where it downloaded and run:

```bash
chmod +x "G Drive Connector-1.0.0-arm64.AppImage"
./"G Drive Connector-1.0.0-arm64.AppImage"
```

---

## ⚙️ How to Setup Client Credentials

To connect your accounts, you must first supply your own Google Cloud OAuth 2.0 Credentials:

1. Open the **Help** section within the app for a detailed, step-by-step UI guide on how to create a Google Cloud Project.
2. Enable the **Google Drive API**.
3. Create an **OAuth Consent Screen** (Adding yourself as a Test User).
4. Create **Desktop App** Credentials to get your Client ID and Client Secret.
5. Paste them into the **Setup** tab of the app to unlock the Dashboard!

---

## 📄 License

This application is free to use but remains proprietary. Users are granted permission to use the app's features for free, but are strictly prohibited from customizing, developing, recreating, editing, or updating the app or its source code. 

**Disclaimer of Liability:** The author is not responsible or liable for any permanent deletion of files, system damage, or any other harm or damages that users may face in the future while using this app. Please use it at your own risk. 

See the [LICENSE](LICENSE) file for full details.
