let streams = []
const pollRectsInterval = 200
const radius = 11
const LINE_WIDTH = 4
let pollRectsTimeout = null

function scaledRect(r) {
  r.x *= sx
  r.y *= sy
  r.w *= sx
  r.h *= sy
  return r
}

window.addEventListener("PassToBackground", function(evt) {
  //console.log('got evt=',evt.detail);
  if (evt.detail.rectangles) {
    for (let item of evt.detail.rectangles) {
      let windowId = item.windowId
      let rect = item.rect
      if (streams[windowId])
        streams[windowId].rect = scaledRect(rect)
    }
    pollRectsTimeout = setTimeout(pollRects,pollRectsInterval)
  }
  else if (evt.detail.pickWindowNow) {
    pickWindow();
  }
}, false);

let canvas = document.createElement('canvas')
let width = 1280
let height = 720
let fps = 30
canvas.width = width
canvas.height = height
let ctx = canvas.getContext('2d')
ctx.fillStyle = 'black'
ctx.fillRect(0,0,width,height)
ctx.fillStyle = 'white'
ctx.fillText('Screegle',10,10)
let stream = canvas.captureStream(fps)
let sx = canvas.width / screen.width
let sy = canvas.height / screen.height

async function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function sendToInject(json) {
  var event = new CustomEvent("PassToBackground", {detail: json});
  window.dispatchEvent(event);
}

async function captureStream(streamId) {
  console.log('captureStream',streamId)
  let stream = await navigator.mediaDevices.getDisplayMedia({ video: { deviceId: streamId } })
  await wait(1000)
  let settings = stream.getVideoTracks()[0].getSettings()
  console.log('stream w/h=',settings.width,settings.height,settings)
  let video = document.createElement('video')
  video.onloadedmetadata = () => {
    streams.push({video:video,rect:{x:0,y:0,w:video.videoWidth,h:video.videoHeight}})
  }
  video.muted = true
  video.autoplay = true
  video.srcObject = stream
  document.body.appendChild(video)
}

function draw() {
  ctx.fillStyle = 'black'
  ctx.fillRect(0,0,width,height)
  ctx.fillStyle = 'white'
  ctx.font = '32px arial'
  ctx.textBaseline = 'bottom'
  ctx.fillText('Screegle',4,height-4)

  let list = []
  for (let windowId in streams) {
    let stream = streams[windowId]
    if (stream) {
      let zOrder = stream.rect.z
      list.push({windowId,zOrder})
    }
  }
  list.sort((a,b) => b.zOrder - a.zOrder)
  for (let item of list) {
    let stream = streams[item.windowId]
    drawSource(stream)
  }
  requestAnimationFrame(draw)
}
draw()

function rounded(ctx,rect) {
  let x = rect.x
  let y = rect.y
  let width = rect.w
  let height = rect.h
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.clip();
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof stroke === 'undefined') {
    stroke = true;
  }
  if (typeof radius === 'undefined') {
    radius = 5;
  }
  if (typeof radius === 'number') {
    radius = {tl: radius, tr: radius, br: radius, bl: radius};
  } else {
    var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
    for (var side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side];
    }
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = LINE_WIDTH;
    ctx.strokeStyle = 'rgba(25,115,232,0.8)';
    ctx.stroke();
  }
}

function drawSource(source) {
  ctx.save()
  let rect = source.rect
  rounded(ctx,rect)
  ctx.drawImage(source.video,rect.x,rect.y,rect.w,rect.h)
  ctx.restore()
  roundRect(ctx,rect.x,rect.y,rect.w,rect.h,radius,false,true);
}

function pollRects() {
  let ids = []
  for (let windowId in streams)
    ids.push(windowId)
  if (ids.length > 0)
    sendToInject({rects:ids})
}

/*function monkeyPatchMediaDevices() {

  const enumerateDevicesFn = MediaDevices.prototype.enumerateDevices;
  const getUserMediaFn = MediaDevices.prototype.getDisplayMedia;

  MediaDevices.prototype.enumerateDevices = async function () {
    const res = await enumerateDevicesFn.call(navigator.mediaDevices);
    res.push({
      deviceId: "virtual",
      groupID: "com.appblit.screegle",
      kind: "videoinput",
      label: "Screegle",
    });
    return res;
  };

  MediaDevices.prototype.getUserMedia = async function () {
    const args = arguments;
    console.log(args[0]);
    if (args.length && args[0].video && args[0].video.deviceId) {
      if (
        args[0].video.deviceId === "virtual" ||
        args[0].video.deviceId.exact === "virtual"
      ) {
        // This constraints could mimick closely the request.
        // Also, there could be a preferred webcam on the options.
        // Right now it defaults to the predefined input.
        const constraints = {
          video: {
            facingMode: args[0].facingMode,
            advanced: args[0].video.advanced,
            width: args[0].video.width,
            height: args[0].video.height,
          },
          audio: false,
        };
        const res = await getUserMediaFn.call(
          navigator.mediaDevices,
          constraints
        );
        if (res) {
          const filter = new FilterStream(res);
          return filter.outputStream;
        }
      }
    }
    const res = await getUserMediaFn.call(navigator.mediaDevices, ...arguments);
    return res;
  };
}*/

//monkeyPatchMediaDevices()

const getDisplayMediaFn = MediaDevices.prototype.getDisplayMedia;
async function pickWindow() {
  let stream = await getDisplayMediaFn.call(navigator.mediaDevices,{});
  let track = stream.getVideoTracks()[0]
  track.onended = () => {
    delete streams[windowId]
  }
  await wait(1000)
  let settings = track.getSettings()
  let parts = settings.deviceId.split(':')
  /*if (parts[0] !== 'window')
  {
      track.stop()
      return
  }*/
  let windowId = parts[1]
  console.log(windowId)
  //sendToInject({windowId})
  //console.log('stream w/h=',settings.width,settings.height,settings)
  let video = document.createElement('video')
  video.onloadedmetadata = () => {
    console.log(video.videoWidth,video.videoHeight)
    streams[windowId] = {video:video,rect:{x:0,y:0,w:video.videoWidth,h:video.videoHeight,z:0}}
    if (Object.keys(streams).length === 1)
      pollRects()
  }
  video.muted = true
  video.style.position = 'fixed'
  video.style.top = 0
  video.style.let = 0
  video.style.transform = 'scale(0)'
  video.autoplay = true
  video.playsInline = true
  video.srcObject = stream
  document.body.appendChild(video)

}

MediaDevices.prototype.getDisplayMedia = async function (options) {
  //console.log(options)
  //if (options && options.screegle)
    return stream
  //else
  //  return await getDisplayMediaFn.call(navigator.mediaDevices,options);
}
