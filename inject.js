'use strict';

const script = document.createElement('script');
script.setAttribute("type", "module");
script.setAttribute("src", chrome.extension.getURL('virtual-camera.js'));
const head = document.head || document.getElementsByTagName("head")[0] || document.documentElement;
head.insertBefore(script, head.lastChild);

window.addEventListener("PassToBackground", function(evt) {
  try {
    chrome.runtime.sendMessage(evt.detail, (res) => {
      if (res.rectangles || res.rectanglesBySize) {
        let event = new CustomEvent("PassToBackground", {detail: res});
        window.dispatchEvent(event);
      }
    })
  } catch (e) {}
}, false);

chrome.runtime.onMessage.addListener(async function requestCallback(request, sender, sendResponse) {
  if (request.pickWindowNow) {
    let event = new CustomEvent("PassToBackground", {detail: request});
    window.dispatchEvent(event);
  }
  sendResponse({})
});

// note: Google Chromes comes with a hidden extension that Meet uses to access chrome.desktopCapture.chooseDesktopMedia
// https://source.chromium.org/chromium/chromium/src/+/master:chrome/browser/resources/hangout_services/thunk.js;l=232
// so Screegle extension is bypassed by it
