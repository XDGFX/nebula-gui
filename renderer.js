const { ipcRenderer } = require("electron");

let storage = window.localStorage;

// Initialise storage parameters if they don't exist
if (!storage.getItem("autoconnect")) {
  storage.setItem("autoconnect", false);
}

// Set version number
({ NEBULA_VERSION, APP_VERSION } = ipcRenderer.sendSync("get-version"));

// Only set version number if the element exists
if (document.querySelector("#nebula-version")) {
  document.querySelector("#nebula-version").innerHTML = NEBULA_VERSION;
}
if (document.querySelector("#app-version")) {
  document.querySelector("#app-version").innerHTML = APP_VERSION;
}

// Handler for custom window buttons
document.querySelector("#minimize").addEventListener("click", function () {
  ipcRenderer.send("minimize-window");
});

document.querySelector("#quit").addEventListener("click", function () {
  ipcRenderer.send("quit");
});

if (document.querySelector("#settings")) {
  document.querySelector("#settings").addEventListener("click", function () {
    window.location.href = "config.html";
  });
}
