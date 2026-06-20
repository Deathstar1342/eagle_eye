import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('eagleAPI', {
  getAssets: () => ipcRenderer.invoke('get-assets'),
  checkoutAsset: (studentId, assetTag) =>
    ipcRenderer.invoke('checkout-asset', { studentId, assetTag }),
  checkinAsset: (studentId, assetTag) =>
    ipcRenderer.invoke('checkin-asset', { studentId, assetTag }),
})
