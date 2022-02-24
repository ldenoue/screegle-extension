'use strict';

const script = document.createElement('script');
script.setAttribute("type", "module");
script.setAttribute("src", chrome.extension.getURL('virtual-camera.js'));
const head = document.head || document.getElementsByTagName("head")[0] || document.documentElement;
head.insertBefore(script, head.lastChild);

window.addEventListener("PassToBackground", function(evt) {
  try {
    chrome.runtime.sendMessage(evt.detail, (res) => {
      if (res.rectangles) {
        var event = new CustomEvent("PassToBackground", {detail: res});
      window.dispatchEvent(event);
      }
    })
  } catch (e) {}
}, false);

chrome.runtime.onMessage.addListener(async function requestCallback(request, sender, sendResponse) {
  //console.log('inject request=',request,sender)
  sendResponse({ok:true})
  //script.captureStream(request.streamId)
  var event = new CustomEvent("PassToBackground", {detail: request});
  window.dispatchEvent(event);
});
