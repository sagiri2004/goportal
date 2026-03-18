"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  platform: process.platform,
  send: (channel, ...args) => electron.ipcRenderer.send(channel, ...args),
  on: (channel, callback) => {
    electron.ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  }
});
