const { ipcRenderer } = require("electron");
const { spawn } = require("child_process");

console.log(`Running on platform: ${process.platform} ${process.arch}`);

// Throw an error if architecture is not x64
// if (process.arch !== "x64") {
ipcRenderer.send(
  "error",
  "This application is only compatible with x64 architecture."
);

throw new Error(
  `This application is only compatible with x64 architecture. You are running ${process.arch}`
);
// }

// Get Nebula binary version
let binary = "nebula-";
if (process.platform === "darwin") {
  binary += "darwin.zip";
} else if (process.platform === "win32") {
  binary += "windows-amd64.zip";
} else if (process.platform === "linux") {
  binary += "linux-amd64.tar.gz";
}

// Handler for custom window buttons
document.querySelector("#minimize").addEventListener("click", function () {
  ipcRenderer.send("minimize-window");
});

document.querySelector("#quit").addEventListener("click", function () {
  ipcRenderer.send("quit");
});

// Handler for vpn connection buttons
document.querySelector("#vpn-connect").addEventListener("click", function () {
  console.log("Connecting to VPN");
  // ipcRenderer.send("vpn-connect");

  cmd = spawn("ip", ["addr"]);

  cmd.stdout.on("data", function (data) {
    console.log(data.toString());
  });

  cmd.stderr.on("data", function (data) {
    console.log(data.toString());
  });

  cmd.on("close", function (code) {
    console.log("child process exited with code " + code);
  });
});
