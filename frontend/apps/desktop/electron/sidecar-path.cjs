const path = require("node:path");
const { app } = require("electron");

function getSidecarPath() {
  const sidecarName = process.platform === "win32" ? "tool.exe" : "tool";

  if (app.isPackaged) {
    return path.join(process.resourcesPath, "sidecars", sidecarName);
  }

  const devRelativeParts =
    process.platform === "win32"
      ? ["sidecars", "win", "tool.exe"]
      : ["sidecars", "linux", "tool"];

  return path.join(__dirname, "..", ...devRelativeParts);
}

module.exports = {
  getSidecarPath
};

