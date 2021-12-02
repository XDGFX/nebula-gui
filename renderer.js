const { ipcRenderer } = require("electron");

let storage = window.localStorage;
let connectedToVPN = false;

// Initialise storage parameters if they don't exist
if (!storage.getItem("autoconnect")) {
  storage.setItem("autoconnect", false);
}

// Handler for custom window buttons
document.querySelector("#minimize").addEventListener("click", function () {
  ipcRenderer.send("minimize-window");
});

document.querySelector("#quit").addEventListener("click", function () {
  ipcRenderer.send("quit");
});

function connect() {
  /**
   * Connect to the VPN.
   */

  button = document.querySelector("#vpnConnect");
  slider = document.querySelector("#autoconnect");

  if (connectedToVPN) {
    // Button is now disconnect
    connectedFade("out");
    button.innerHTML = "Connect";
    connectedToVPN = false;

    // Connect to the VPN
    ipcRenderer.send("vpn-disconnect");
  } else {
    console.log("Connecting to VPN...");

    // Set the connect button to "Connecting..." with a spinner
    button.innerHTML = "";
    button.classList.add("has-spinner");
    button.disabled = true;
    slider.disabled = true;

    // Connect to the VPN
    ipcRenderer.send("vpn-connect");
  }
}

function connectedFade(direction) {
  /**
   * Fade the world image in or out.
   *
   * @param {string} direction - The direction of the fade.
   */

  let fadeIn = direction === "in";

  let op = fadeIn ? 0 : 1;
  const timer = setInterval(function () {
    op += fadeIn ? 0.1 : -0.1;

    if (op > 1 || op < 0) {
      clearInterval(timer);
    } else {
      document.querySelector("#world-connected").style.opacity = op;
    }
  }, 50);
}

ipcRenderer.on("vpn-connected", function () {
  // Only run if not already connected
  if (!connectedToVPN) {
    connectedFade("in");
    button.innerHTML = "Disconnect";
    button.classList.remove("has-spinner");
    button.disabled = false;
    slider.disabled = false;
    connectedToVPN = true;
  }
});

// Handler for vpn connection buttons
document.querySelector("#vpnConnect").addEventListener("click", function () {
  connect();
});

// Autoconnect toggle
document.querySelector("#autoconnect").addEventListener("change", function () {
  if (this.checked) {
    console.log("Autoconnect enabled");
    storage.setItem("autoconnect", true);

    if (!connectedToVPN) {
      connect();
    }
  } else {
    storage.setItem("autoconnect", false);
    console.log("Autoconnect disabled");
  }
});

// Set autoconnect checkbox to match storage value
if (storage.getItem("autoconnect") == "true") {
  document.querySelector("#autoconnect").checked = true;
  connect();
}
