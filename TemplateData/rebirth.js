(function () {
  "use strict";

  var canvas = document.getElementById("canvas");
  var frame = document.getElementById("game-frame");
  var fullscreenButton = document.getElementById("fullscreen-button");
  var runtimeStatus = document.getElementById("runtime-status");
  var hideStatusTimer = null;

  function setStatus(message, state) {
    if (!runtimeStatus) return;

    runtimeStatus.classList.remove("is-hidden", "is-error");
    runtimeStatus.lastChild.nodeValue = " " + message;

    if (state === "error") {
      runtimeStatus.classList.add("is-error");
    }
  }

  function hideStatusAfter(delay) {
    window.clearTimeout(hideStatusTimer);
    hideStatusTimer = window.setTimeout(function () {
      runtimeStatus && runtimeStatus.classList.add("is-hidden");
    }, delay);
  }

  function focusGame() {
    canvas && canvas.focus({ preventScroll: true });
  }

  function markReady() {
    document.documentElement.classList.add("runtime-ready");
    setStatus("Ready — click the game to focus");
    hideStatusAfter(2600);
  }

  function reportRuntimeError() {
    setStatus("The original runtime could not start in this browser.", "error");
  }

  function enterFullscreen() {
    focusGame();

    if (frame.requestFullscreen) {
      frame.requestFullscreen().catch(function () {
        useUnityFullscreen();
      });
      return;
    }

    useUnityFullscreen();
  }

  function useUnityFullscreen() {
    if (typeof window.SetFullscreen === "function") {
      try {
        window.SetFullscreen(1);
        return;
      } catch (error) {
        // Report the unavailable state below.
      }
    }

    setStatus("Fullscreen is unavailable in this browser.", "error");
  }

  function keepGameKeysOnCanvas(event) {
    var key = event.key.toLowerCase();
    var isGameKey = key === "arrowleft" || key === "arrowright" || key === "arrowup" ||
      key === "arrowdown" || key === " " || key === "w" || key === "a" || key === "s" ||
      key === "d" || key === "l";

    if (document.activeElement === canvas && isGameKey) {
      event.preventDefault();
    }
  }

  canvas.addEventListener("pointerdown", focusGame);
  canvas.addEventListener("focus", function () {
    setStatus("Focused — WASD / arrows to move, L / Space to jump");
    hideStatusAfter(1800);
  });
  fullscreenButton.addEventListener("click", enterFullscreen);
  window.addEventListener("keydown", keepGameKeysOnCanvas, { passive: false });
  window.addEventListener("error", function (event) {
    if (event.filename && /Release\//.test(event.filename)) {
      reportRuntimeError(event.error || event.message);
    }
  });

  window.DuckomanRebirth = {
    markReady: markReady,
    reportRuntimeError: reportRuntimeError
  };
}());
