const { app, BrowserWindow } = require("electron");
const path = require("path");

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 650,

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  try {
    if (app.isPackaged) {
      await mainWindow.loadFile(
        path.join(__dirname, "..", "dist", "index.html")
      );
    } else {
      await mainWindow.loadURL(
        process.env.VITE_DEV_SERVER_URL || "http://localhost:5173"
      );
    }
  } catch (error) {
    console.error("Unable to load the ESM Rest House desktop UI:", error);
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