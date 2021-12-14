"use strict";

const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const download = require("download");
const fs = require("fs");
const { spawn } = require("child_process");
const tarToZip = require("tar-to-zip");
const extract = require("extract-zip");

const NEBULA_VERSION = "1.4.0";
const APP_VERSION = "0.0.1";

const appData = app.getPath("userData");
console.log("Appdata: " + appData);

// // If not production, enable hot reload
// if (process.env.NODE_ENV !== "production") {
//   require("electron-reload")(__dirname);
// }

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

  ipcMain.on("get-version", function (event) {
    event.returnValue = { NEBULA_VERSION, APP_VERSION };
  });

  ipcMain.on("open-file-dialog", function (event) {
    dialog
      .showOpenDialog({
        title: "Select your nebula config files",
        buttonLabel: "Select",
        // Restricting the user to only Text Files.
        filters: [
          {
            name: "Text Files",
            extensions: ["crt", "key", "yml"],
          },
        ],
        // Specifying the File Selector Property
        properties: ["openFile", "multiSelections"],
      })
      .then((file) => {
        if (!file.canceled) {
          file.filePaths.forEach(function (filePath) {
            const result = loadConfig(filePath);
            event.sender.send("uploaded-file", result);
          });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  });

  function loadConfig(filepath) {
    // Attempt to load a file from the filepath.
    let target;
    let result;

    if (filepath.includes("ca.crt")) {
      target = path.join(appData, "conf", "ca.crt");
      result = "ca-crt";
    } else if (filepath.includes("yml")) {
      target = path.join(appData, "conf", "config.yml");
      result = "config";
    } else if (filepath.includes("key")) {
      target = path.join(appData, "conf", "client.key");
      result = "client-key";
    } else if (filepath.includes("crt")) {
      target = path.join(appData, "conf", "client.crt");
      result = "client-crt";
    }

    // If the config, read and edit the file and save it.
    if (result === "config") {
      const config = fs.readFileSync(filepath, "utf8");
      const newConfig = config
        .replace(
          /ca: [\w\W]+?\n/,
          `ca: ${path.join(appData, "conf", "ca.crt")}\n`
        )
        .replace(
          /cert: [\w\W]+?\n/,
          `cert: ${path.join(appData, "conf", "client.crt")}\n`
        )
        .replace(
          /key: [\w\W]+?\n/,
          `key: ${path.join(appData, "conf", "client.key")}\n`
        );

      fs.writeFileSync(target, newConfig);
    } else if (result) {
      // Otherwise just copy it directly
      fs.copyFile(filepath, target, function (err) {
        if (err) throw err;
        console.log("File copied to: " + target);
      });
    }

    return result;
  }

  // Handle error events
  ipcMain.on("error", function (event, message) {
    console.log(message);
    dialog.showErrorBox("Error", message);
  });

  // Check if the binary is already downloaded
  if (getBinary()) {
    console.log("Binary found, not downloading");

    // If no config exists, load the config page
    if (checkConfig()) {
      mainWindow.loadFile("index.html");
    } else {
      mainWindow.loadFile("config.html");
    }
  } else {
    mainWindow.loadFile("download.html");

    // Constantly check if the binary is downloaded
    const checkBinary = setInterval(function () {
      if (getBinary()) {
        clearInterval(checkBinary);

        if (checkConfig()) {
          mainWindow.loadFile("index.html");
        } else {
          mainWindow.loadFile("config.html");
        }
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

// Create the `binaries` and `conf` directories if they don't exist
if (!fs.existsSync(path.join(appData, "binaries"))) {
  fs.mkdirSync(path.join(appData, "binaries"));
}

if (!fs.existsSync(path.join(appData, "conf"))) {
  fs.mkdirSync(path.join(appData, "conf"));
}

function checkConfig() {
  return (
    fs.existsSync(path.join(appData, "conf", "ca.crt")) &&
    fs.existsSync(path.join(appData, "conf", "config.yml")) &&
    fs.existsSync(path.join(appData, "conf", "client.crt")) &&
    fs.existsSync(path.join(appData, "conf", "client.key"))
  );
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

    // If on linux, mark the binary as executable
    if (process.platform === "linux") {
      fs.chmodSync(path.join(appData, "binaries", "nebula"), "755");
    }

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
    console.log(`nebula process exited with code ${code}`);
  });

  nebula.on("error", function (err) {
    console.log(`nebula process error: ${err}`);
  });

  // Disconnect from VPN
  ipcMain.once("vpn-disconnect", function (event) {
    nebula.kill();
    console.log("VPN disconnected");
  });
});
