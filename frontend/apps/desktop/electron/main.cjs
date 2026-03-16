const { app, BrowserWindow } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs")
    }
  });

  // In dev, reuse Vite dev server from apps/web.
  // In production/build preview, load web dist/index.html.
  const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";
  const distIndex = path.join(__dirname, "..", "..", "web", "dist", "index.html");
  if (process.env.NODE_ENV === "production" && fs.existsSync(distIndex)) {
    win.loadFile(distIndex);
  } else {
    win.loadURL(devUrl);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

