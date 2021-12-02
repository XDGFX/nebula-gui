"use strict";

// Assign electron modules by destructuring the electron module array
// Note: these do not need to be in order, it takes the names from the original object!
const { app, BrowserWindow, session, ipcMain, dialog } = require("electron");

// Used for running shell commands
const { spawn } = require("child_process");

// If not production, enable hot reload
if (process.env.NODE_ENV !== "production") {
  require("electron-reload")(__dirname);
}

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    show: false, // Hide the window until the content is loaded
    resizable: false,
    frame: false,
    maximizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // If not production, open the dev tools
  if (process.env.NODE_ENV !== "production") {
    mainWindow.webContents.openDevTools();
  }

  // We can use the default session to store VPN credentials
  let mainSession = session.defaultSession;

  // If the session does not contain the vpn credentials, load `login.html`
  // if (!mainSession.credentials) {
  //   mainWindow.loadFile("login.html");
  // } else {
  mainWindow.loadFile("index.html");
  // }

  // Once the window content is ready, show it. We use `once` as it will only
  // trigger the callback once, unlike `on`
  mainWindow.once("ready-to-show", function () {
    mainWindow.show();
  });

  // Handle error events
  ipcMain.on("error", function (event, message) {
    console.log(message);
    dialog.showErrorBox("Error", message);
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", function () {
  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Handle menu button clicks
ipcMain.on("minimize-window", function (event, arg) {
  BrowserWindow.getFocusedWindow().minimize();
});

ipcMain.on("quit", function (event, arg) {
  BrowserWindow.getFocusedWindow().close();
});

// Connect to VPN
ipcMain.on("vpn-connect", function (event) {
  console.log("Connecting to VPN...");

  let cmd = spawn("ip", ["addr"]);

  cmd.stdout.on("data", function (data) {
    console.log(data.toString());
  });

  cmd.stderr.on("data", function (data) {
    console.log(data.toString());
  });

  cmd.on("exit", function (code) {
    console.log("Child process exited with code " + code);
  });
});
