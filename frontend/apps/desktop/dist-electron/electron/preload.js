"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electron', {
    platform: process.platform,
    send: (channel, ...args) => electron_1.ipcRenderer.send(channel, ...args),
    on: (channel, callback) => {
        electron_1.ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    },
});
//# sourceMappingURL=preload.js.map