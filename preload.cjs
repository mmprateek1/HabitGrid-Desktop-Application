const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('habitAPI', {
  loadData: () => ipcRenderer.invoke('habits:load'),
  saveData: (data) => ipcRenderer.invoke('habits:save', data),
  getDataPath: () => ipcRenderer.invoke('habits:getDataPath'),
  setTheme: (theme) => ipcRenderer.invoke('window:setTheme', theme)
});
