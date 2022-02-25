let useWindowID = false
let streams = []
const pollRectsInterval = 200
const radius = 11
const LINE_WIDTH = 4
let pollRectsTimeout = null
let width = 1280
let height = 720
let fps = 12

let canvas = document.createElement('canvas')
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
function scaledRect(r) {
  return {x:(r.x * sx)|0, y: (r.y * sy)|0, w: (r.w * sx)|0, h: (r.h * sy)|0}
}

window.addEventListener("PassToBackground", function(evt) {
  if (evt.detail.rectanglesBySize) {
    for (let item of evt.detail.rectanglesBySize) {
      let wh = item.w + 'x' + item.h
      for (let s in streams) {
        let swh = streams[s].rect.w + 'x' + streams[s].rect.h
        if (swh === wh) {
          //console.log('rect=',item)
          streams[s].rect = item
          break
        }
        swh = streams[s].rect.w + 'x' + (streams[s].rect.h+1)
        if (swh === wh) {
          streams[s].rect = item
          break
        }
        swh = (streams[s].rect.w+1) + 'x' + streams[s].rect.h
        if (swh === wh) {
          streams[s].rect = item
          break
        }
        swh = (streams[s].rect.w+1) + 'x' + (streams[s].rect.h+1)
        if (swh === wh) {
          streams[s].rect = item
        }
      }
    }
    pollRectsTimeout = setTimeout(pollRects,pollRectsInterval)
  }
  else if (evt.detail.rectangles) {
    for (let item of evt.detail.rectangles) {
      let windowId = item.windowId
      let rect = item.rect
      if (streams[windowId])
        streams[windowId].rect = rect
    }
    pollRectsTimeout = setTimeout(pollRects,pollRectsInterval)
  }
  else if (evt.detail.pickWindowNow) {
    pickWindow();
  }
}, false);

async function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function sendToInject(json) {
  let event = new CustomEvent("PassToBackground", {detail: json});
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
    let defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
    for (let side in defaultRadius) {
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
  let rect = scaledRect(source.rect)
  rounded(ctx,rect)
  ctx.drawImage(source.video,rect.x,rect.y,rect.w,rect.h)
  ctx.restore()
  roundRect(ctx,rect.x,rect.y,rect.w,rect.h,radius,false,true);
  ctx.fillStyle='blue'
  let w = source.video.videoWidth
  let h = source.video.videoHeight
  //ctx.fillText(w + 'x' + h,rect.x+32,rect.y+32)
  if (!useWindowID) {
    // get latest w/h in case user has resized the window
    source.rect.w = w
    source.rect.h = h
  }
}

function pollRects() {
  if (useWindowID)
    pollRectsByWindowId()
  else
    pollRectsBySizes()
}

function pollRectsByWindowId() {
  let ids = []
  for (let windowId in streams)
    ids.push(windowId)
  if (ids.length > 0)
    sendToInject({rects:ids})
}

function pollRectsBySizes() {
  let ids = []
  for (let windowId in streams) {
    let rect = streams[windowId].rect
    ids.push(rect.w+'x'+rect.h)
  }
  if (ids.length > 0)
  {
    //console.log(ids)
    sendToInject({rectSizes:ids})
  }
}

function uid() {
  return (performance.now().toString(36)+Math.random().toString(36)).replace(/\./g,"");
};

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
  let windowId = uid()
  if (useWindowID) {
    windowId = parts[1]
  }
  let video = document.createElement('video')
  video.onloadedmetadata = () => {
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

console.log('replacing getDisplayMedia',getDisplayMediaFn)

MediaDevices.prototype.getDisplayMedia = async function (options) {
  console.log('screegle display media returning its own stream')
  return stream
}
