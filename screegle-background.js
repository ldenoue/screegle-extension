// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging

// manifest location https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_manifests

// cp com.appblit.screegle.json ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/.

// test page https://webrtc.github.io/samples//src/content/getusermedia/getdisplaymedia/

const getAllWindowsInterval = 200

var port = chrome.runtime.connectNative('com.appblit.screegle');
port.onMessage.addListener(function(msg) {
  if (msg !== 'error') {
    let array = msg.split('#')
    parseWindowInfo(array)
  }
  setTimeout(getAllWindows,getAllWindowsInterval)
});
port.onDisconnect.addListener(function() {
  console.log("Disconnected");
});

let windowIDs = {}

function parseWindowInfo(array) {
  let z = 0 // z == 0 = topmost window to draw last
  for (let item of array) {
    let info = item.split(',')
    let windowId = info[0]
    let x = +info[1]
    let y = +info[2]
    let w = +info[3]
    let h = +info[4]
    z++
    windowIDs[windowId] = {x,y,w,h,z}
  }
}

function getAllWindows() {
  port.postMessage('all')
}

function getWindowPosition(windowId) {
  port.postMessage(windowId)
}

function sendMessageActiveTab(json)
{
  chrome.tabs.query({active:true,currentWindow: true}, function(tabs) {
    if (tabs && tabs.length > 0)
    {
      var tab = tabs[0];
      chrome.tabs.sendMessage(tab.id, json, res => console.log(res));
    }
  });
}

async function requestCallback(request, sender, sendResponse)
{
  if (request.rects) {
    let rectangles = []
    for (let windowId of request.rects) {
      if (windowIDs[windowId])
        rectangles.push({windowId:windowId,rect:windowIDs[windowId]})
    }
    sendResponse({rectangles:rectangles})
  } else if (request.pickWindow) {
    sendMessageActiveTab({pickWindowNow:true})
  } else if (request.windowId) {
    if (!windowIDs[request.windowId]) {
      windowIDs[request.windowId] = {x:0,y:0,w:10,h:10}
    }
  }
  sendResponse({ok:true})
  // important: we want to use sendResponse asynchronously sometimes
  return true;
}

chrome.runtime.onMessage.addListener(requestCallback);

chrome.browserAction.onClicked.addListener(function(tab) {
	sendMessageActiveTab({pickWindowNow:true})
});

getAllWindows()
