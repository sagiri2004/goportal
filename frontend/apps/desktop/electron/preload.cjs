const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("platform", {
  isDesktop: true,
  getBackendUrl() {
    return "http://localhost:8080";
  },
  getLivekitUrl() {
    return "ws://localhost:7880";
  }
});

