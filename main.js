"use strict";

// Modules to control application life and create native browser window

// // This is the same as `from electron import app, BrowserWindow`
// const {app, BrowserWindow} = require('electron')

// Instead, we can import the whole electron module and reassign the imports later
const electron = require("electron");

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

// // We can load the electron-reload library like this
// const electronReload = require('electron-reload')

// // But the object returned is a function, which we can instead call immediately
// // and pass the directory name
// require("electron-reload")(__dirname);

const path = require("path");

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    show: false, // Hide the window until the content is loaded
  });

  // and load the index.html of the app.
  mainWindow.loadFile("index.html");

  // Once the window content is ready, show it. We use `once` as it will only
  // trigger the callback once, unlike `on`
  mainWindow.once("ready-to-show", function () {
    mainWindow.show();
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
  if (process.platform !== "darwin") app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
