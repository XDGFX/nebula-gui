"use strict";

// Assign electron modules by destructuring the electron module array
// Note: these do not need to be in order, it takes the names from the original object!
const { app, BrowserWindow, session, ipcMain, dialog } = require("electron");
const path = require("path");
const download = require("download");
const fs = require("fs");
const { spawn } = require("child_process");
const tarToZip = require("tar-to-zip");
const extract = require("extract-zip");

const NEBULA_VERSION = "1.4.0";

const appData = app.getPath("userData");
console.log("Appdata: " + appData);

// If not production, enable hot reload
if (process.env.NODE_ENV !== "production") {
  require("electron-reload")(__dirname);
}

console.log(`Running on platform: ${process.platform} ${process.arch}`);

// Throw an error if architecture is not x64
if (process.arch !== "x64") {
  dialog.showErrorBox("Error", "Only x64 architecture is supported");

  throw new Error(
    `This application is only compatible with x64 architecture. You are running ${process.arch}`
  );
}

// Make the mainWindow variable global
let mainWindow;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
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

  // Check if the binary is already downloaded
  const binary = getBinary();
  if (binary) {
    console.log("Binary found, not downloading");
    mainWindow.loadFile("index.html");
  } else {
    mainWindow.loadFile("download.html");

    // Constantly check if the binary is downloaded
    const checkBinary = setInterval(function () {
      const binary = getBinary();
      if (binary) {
        clearInterval(checkBinary);
        mainWindow.loadFile("index.html");
      }
    }, 1000);

    // Download the binary
    let binary = "nebula-";
    let ext;
    if (process.platform === "darwin") {
      binary += "darwin";
      ext = ".zip";
    } else if (process.platform === "win32") {
      binary += "windows-amd64";
      ext = ".zip";
    } else if (process.platform === "linux") {
      binary += "linux-amd64";
      ext = ".tar.gz";
    }

    downloadBinary(binary, ext);
  }
}

function getBinary() {
  if (fs.existsSync(path.join(appData, "binaries", "nebula"))) {
    return path.join(appData, "binaries", "nebula");
  } else if (fs.existsSync(path.join(appData, "binaries", "nebula.exe"))) {
    return path.join(appData, "binaries", "nebula.exe");
  } else {
    return false;
  }
}

function downloadBinary(binary, ext) {
  console.log("Downloading nebula binary...");

  binary = binary + ext;

  const url = `https://github.com/slackhq/nebula/releases/download/v${NEBULA_VERSION}/${binary}`;
  console.log(`Downloading ${binary} from ${url}`);

  // Download the binary
  download(url, appData).then(function () {
    console.log("Download complete");

    // If linux, convert to zip first
    if (process.platform === "linux") {
      const outputZip = fs.createWriteStream(path.join(appData, "nebula.zip"));

      const progress = false;
      tarToZip(path.join(appData, binary), { progress })
        .getStream()
        .pipe(outputZip)
        .on("finish", function () {
          console.log("Conversion complete");
          extractBinary(path.join(appData, "nebula.zip"));
        });
    } else {
      // Rename the download to nebula.zip
      fs.renameSync(
        path.join(appData, binary),
        path.join(appData, "nebula.zip")
      );

      extractBinary(path.join(appData, "nebula.zip"));
    }
  });
}

async function extractBinary(file) {
  console.log("Extracting nebula binary...");
  try {
    await extract(file, { dir: path.join(appData, "binaries") });
    console.log("Extraction complete");
    cleanupDownloads();
  } catch (err) {
    console.error(err);
  }
}

function cleanupDownloads() {
  // Delete any .zip or .tar.gz files in the user's appdata
  console.log("Cleaning up downloads...");
  const files = fs.readdirSync(appData);
  files.forEach(function (file) {
    if (file.endsWith(".zip") || file.endsWith(".tar.gz")) {
      fs.unlinkSync(path.join(appData, file));
    }
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

  const confFolder = path.join(appData, "conf");

  // Run the nebula binary
  const nebula = spawn(getBinary(), [
    "-config",
    path.join(confFolder, "config.yml"),
  ]);

  nebula.stdout.on("data", function (data) {
    // Read the output and search for "Handshake message received"
    // If it is found, the VPN is connected
    if (data.toString().includes("Handshake message received")) {
      console.log("VPN connected");
      event.sender.send("vpn-connected");
    }

    console.log(`stdout: ${data}`);
  });

  nebula.stderr.on("data", function (data) {
    console.log(`stderr: ${data}`);
  });

  nebula.on("close", function (code) {
    console.log(`child process exited with code ${code}`);
  });

  nebula.on("error", function (err) {
    console.log(`child process error: ${err}`);
  });

  // Disconnect from VPN
  ipcMain.once("vpn-disconnect", function (event) {
    nebula.kill();
    console.log("VPN disconnected");
  });
});
