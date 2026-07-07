const { contextBridge, ipcRenderer, webUtils, shell } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getStorageInfo: () => ipcRenderer.invoke('get-storage-info'),
  addAccount: () => ipcRenderer.invoke('add-account'),
  getFiles: (trashed = 0, parentId = 'root') => ipcRenderer.invoke('get-files', trashed, parentId),
  uploadFile: (parentId = 'root') => ipcRenderer.invoke('upload-file', parentId),
  uploadFileByPath: (path, parentId = 'root') => ipcRenderer.invoke('upload-file-by-path', path, parentId),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  createFolder: (name, parentId = 'root') => ipcRenderer.invoke('create-folder', name, parentId),
  moveToTrash: (id) => ipcRenderer.invoke('move-to-trash', id),
  restoreFromTrash: (id) => ipcRenderer.invoke('restore-from-trash', id),
  deletePermanently: (id) => ipcRenderer.invoke('delete-permanently', id),
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  getStorageBreakdown: () => ipcRenderer.invoke('get-storage-breakdown'),
  deleteAccount: (id) => ipcRenderer.invoke('delete-account', id),
  exportData: () => ipcRenderer.invoke('export-data'),
  importData: () => ipcRenderer.invoke('import-data'),
  clearCache: () => ipcRenderer.invoke('clear-cache'),
  emptyTrash: () => ipcRenderer.invoke('empty-trash'),
  cancelUpload: (id) => ipcRenderer.invoke('cancel-upload', id),
  onUploadProgress: (callback) => ipcRenderer.on('upload-progress', callback),
  onUploadComplete: (callback) => ipcRenderer.on('upload-complete', callback),
  onUploadError: (callback) => ipcRenderer.on('upload-error', callback),

  renameFile: (id, newName) => ipcRenderer.invoke('rename-file', id, newName),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  openExternal: (url) => shell.openExternal(url),
  downloadFiles: (files) => ipcRenderer.invoke('download-files', files),
  openFileLocally: (id, fileName) => ipcRenderer.invoke('open-file-locally', id, fileName),
  startDrag: (id, name) => ipcRenderer.send('ondragstart', id, name)
});

