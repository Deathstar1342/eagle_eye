import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('eagleAPI', {
  getAssets: () => ipcRenderer.invoke('get-assets'),
  
  checkoutAsset: (studentId, assetTag) =>
    ipcRenderer.invoke('checkout-asset', { studentId, assetTag }),
  
  checkinAsset: (studentId, assetTag) =>
    ipcRenderer.invoke('checkin-asset', { studentId, assetTag }),
  
  addAsset: (asset) => ipcRenderer.invoke('add-asset', asset),
  
  deleteAsset: (assetTag) => ipcRenderer.invoke('delete-asset', assetTag),

  updateAsset: (asset) => ipcRenderer.invoke('update-asset', asset),
})
