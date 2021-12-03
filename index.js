const anime = require("animejs");

let connectedToVPN = false;

// Home sphere animation
const sphereEl = document.querySelector(".sphere-animation");
const spherePathEls = sphereEl.querySelectorAll(".sphere path");
const pathLength = spherePathEls.length;
let animations = [];

const breatheAnimation = anime({
  begin: function () {
    for (var i = 0; i < pathLength; i++) {
      animations.push(
        anime({
          targets: spherePathEls[i],
          stroke: {
            value: ["#56c4c5", "#323238"],
            duration: 900,
          },
          translateX: [2, -4],
          translateY: [2, -4],
          easing: "easeOutQuad",
          autoplay: false,
        })
      );
    }
  },
  update: function (ins) {
    animations.forEach(function (animation, i) {
      const percent = (1 - Math.sin(i * 0.35 + 0.0022 * ins.currentTime)) / 2;
      animation.seek(animation.duration * percent);
    });
  },
  duration: Infinity,
  autoplay: true,
});

const introAnimation = anime
  .timeline({
    autoplay: false,
  })
  .add(
    {
      targets: spherePathEls,
      strokeDashoffset: {
        value: [anime.setDashoffset, 0],
        duration: 2100,
        easing: "easeInOutCirc",
        delay: anime.stagger(190, { direction: "reverse" }),
      },
      duration: 200,
      delay: anime.stagger(60, { direction: "reverse" }),
      easing: "linear",
    },
    0
  );

const outroAnimation = anime
  .timeline({
    autoplay: false,
  })
  .add(
    {
      targets: spherePathEls,
      strokeOpacity: {
        value: [1, 0],
        duration: 500,
        easing: "easeInOutCirc",
        delay: anime.stagger(190, { direction: "reverse" }),
      },
      duration: 200,
      delay: anime.stagger(60, { direction: "reverse" }),
      easing: "linear",
      complete: function (anim) {
        introAnimation.pause();
        introAnimation.seek(0);
        anim.seek(0);
      },
    },
    0
  );

function connect() {
  /**
   * Connect to the VPN.
   */

  button = document.querySelector("#vpnConnect");
  slider = document.querySelector("#autoconnect");

  if (connectedToVPN) {
    // Button is now disconnect
    outroAnimation.play();
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

// Set autoconnect checkbox to match storage value
if (storage.getItem("autoconnect") == "true") {
  document.querySelector("#autoconnect").checked = true;
  connect();
}

ipcRenderer.on("vpn-connected", function () {
  // Only run if not already connected
  if (!connectedToVPN) {
    outroAnimation.pause();
    outroAnimation.seek(0);
    introAnimation.seek(0);
    introAnimation.play();
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
