const anime = require("animejs");

function animationGenerator(targets, reverse) {
  return anime
    .timeline({
      autoplay: false,
      duration: 200,
    })
    .add({
      targets: targets,
      translateX: anime.stagger(40 * reverse, {
        start: 5 * reverse,
        direction: "reverse",
        grid: [5, 0],
        from: "center",
        easing: "easeOutQuad",
      }),
      easing: "easeInOutQuad",
      duration: 600,
      delay: anime.stagger(100, { from: "center" }),
    })
    .add(
      {
        targets: targets[2],
        fill: "#56c4c5",
        duration: 600,
      },
      "-=500"
    );
}

const circlesContainer = document.querySelector("#circle-animation");

const configAnimation = animationGenerator(
  circlesContainer.querySelectorAll(".config"),
  -1
);
const caCrtAnimation = animationGenerator(
  circlesContainer.querySelectorAll(".ca-crt"),
  1
);
const clientCrtAnimation = animationGenerator(
  circlesContainer.querySelectorAll(".client-crt"),
  -1
);
const clientKeyAnimation = animationGenerator(
  circlesContainer.querySelectorAll(".client-key"),
  1
);

document.querySelector("#file-button").addEventListener("click", function () {
  ipcRenderer.send("open-file-dialog");
});

let uploadedFiles = {
  config: false,
  caCrt: false,
  clientCrt: false,
  clientKey: false,
};

ipcRenderer.on("uploaded-file", (event, result) => {
  if (result) {
    switch (result) {
      case "config":
        configAnimation.play();
        uploadedFiles.config = true;
        break;
      case "ca-crt":
        caCrtAnimation.play();
        uploadedFiles.caCrt = true;
        break;
      case "client-crt":
        clientCrtAnimation.play();
        uploadedFiles.clientCrt = true;
        break;
      case "client-key":
        clientKeyAnimation.play();
        uploadedFiles.clientKey = true;
        break;
    }

    if (
      uploadedFiles.config &&
      uploadedFiles.caCrt &&
      uploadedFiles.clientCrt &&
      uploadedFiles.clientKey
    ) {
      const button = document.querySelector("#file-button");
      button.disabled = true;
      button.innerHTML = "Done ✔";
      anime({
        targets: button,
        backgroundColor: "#56c4c5",

        duration: 500,
        easing: "easeInOutQuad",
      });

      setTimeout(function () {
        window.location.href = "index.html";
      }, 700);
    }
  }
});
