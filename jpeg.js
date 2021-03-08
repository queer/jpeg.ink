// var: gradient cache
let gradientColours = nextGradient()
let webpSupport = true
const checkWebpSupport = () => {
  const c = document.createElement("canvas")
  const u = c.toDataURL("image/webp")
  // if we attempt to render a canvas to a webp data url, browsers that don't
  // support it will return a png instead. we can use that to detect whether or
  // not to allow webp exports
  if (u.startsWith("data:image/png")) {
    webpSupport = false
  }
  console.log(">> webp: supported?", webpSupport)
  if (!webpSupport) {
    document.getElementById("webp-container").style.display = "none"
  }
}
checkWebpSupport()

function preview(input) {
  if (input && input.files && input.files.length === 1 && input.files[0]) {
    // what: if we have a valid input, 
    const reader = new FileReader()

    reader.addEventListener("load", () => {
      const img = new Image()
      img.src = reader.result
      img.onload = () => {
        renderToCanvas(img)
      }
    })

    reader.readAsDataURL(input.files[0])
  }
}

function renderToCanvas(img) {
  document.getElementById("jpeg-loader").style.display = "inline"
  document.getElementById("png-loader").style.display = "inline"
  document.getElementById("webp-loader").style.display = "inline"
  console.log(">> set: rendering=true")

  const canvas = document.getElementById("renderer")
  const ctx = canvas.getContext("2d")

  // what: set up canvas
  const watermark = document.getElementById("watermark").checked
  // var: custom width / height
  const cw = pi(ev("width"))
  const ch = pi(ev("height"))
  // var: padding, radius
  const p = parseInt(document.getElementById("padding").value, 10)
  const r = parseInt(document.getElementById("radius").value, 10)
  // var: total offset = padding * 2
  const o = p * 2
  // var: image dims
  const iw = img.width
  const ih = img.height
  // var: output dims
  const w = cw || iw + o
  const h = ch || ih + o
  // var: image pos
  // what: centers image
  const ix = ((w - iw) / 2) - (o / 2)
  const iy = ((h - ih) / 2) - (o / 2)
  ctx.canvas.width = w
  ctx.canvas.height = h
  console.log(">> canvas: setup")

  // what: set up gradient
  const grad = ctx.createConicalGradient(w / 2, h / 2, -Math.PI, Math.PI)
  console.log(">> gradient:", gradientColours)

  const [one, two, three, four, five] = gradientColours
  grad.addColorStop(0, one)
  grad.addColorStop(0.2, two)
  grad.addColorStop(0.4, three)
  grad.addColorStop(0.6, four)
  grad.addColorStop(0.8, five)
  grad.addColorStop(1, one)

  // what: render gradient
  round(ctx, r, 0, 0, w, h)
  ctx.save()
  ctx.clip()
  ctx.fillStyle = grad.pattern
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
  console.log(">> canvas: grad")

  // what: render drop shadow
  const so = r >= 32 ? 8 : 4
  const so2 = so * 2
  ctx.shadowColor = "black"
  ctx.shadowBlur = 32
  ctx.shadowOffsetY = 8
  ctx.fillStyle = "rgba(0, 0, 0, 1)"
  // what: drop shadow is rendered on a rect slightly smaller than the
  //       source image. this ensures that the dropshadow rect doesn't
  //       ever show up underneath the rounded corners. this does NOT
  //       deal with the jpeg transparency meme
  const [sx, sy, sw, sh] = [ix + o / 2 + so, iy + o / 2 + so, iw - so2, ih - so2]
  ctx.fillRect(sx, sy, sw, sh)
  console.log(">> canvas: shadow")

  // rerender the gradient to clean up the clip
  // what: the rect we just rendered for the drop shadow will show up in
  //       the output. this is, ofc, suboptimal. to solve this, we clip
  //       the next render to the size of the rect we rendered for the
  //       drop shadow, and then re-render the gradient over the entire
  //       image. this prevents funny render results with rounded corners
  rect(ctx, sx, sy, sw, sh)
  ctx.save()
  ctx.clip()
  ctx.fillStyle = grad.pattern
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
  console.log(">> canvas: refill gradient")

  // what: set up image clipping
  ctx.save()
  // what: finally, clip to image bounds and render the source image.
  round(ctx, r, o / 2, o / 2, w - o, h - o)
  ctx.clip()

  // what: render image
  ctx.drawImage(img, ix + o / 2, iy + o / 2)
  ctx.restore()
  console.log(">> canvas: img")

  // what: render watermark
  if (watermark) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
    ctx.font = "16px Ubuntu"
    ctx.fillText("made with jpeg.ink", 8, h - 8)
    console.log(">> canvas: watermark")
  }

  // what: render preview
  // what: this happens after a small timeout to allow DOM updates to
  //       happen. by doing the DOM update like this, we have to deal
  //       with the fact that this blocks the main thread, potentially
  //       for significant time. so we just set a "rendering" text to
  //       indicate status to the end-user, then render, then do this off
  //       of the main thread to avoid blocking until the last minute
  setTimeout(() => {
    const jpeg = canvas.toDataURL("image/jpeg")
    document.getElementById("jpeg").src = jpeg
    document.getElementById("open-jpeg").href = jpeg
    document.getElementById("jpeg-loader").style.display = "none"
    console.log(">> preview: jpeg")

    const png = canvas.toDataURL("image/png")
    document.getElementById("png").src = png
    document.getElementById("open-png").href = png
    document.getElementById("png-loader").style.display = "none"
    console.log(">> preview: png")

    // what: don't render webp unnecessarilu
    if(webpSupport) {
      const webp = canvas.toDataURL("image/webp")
      document.getElementById("webp").src = webp
      document.getElementById("open-webp").href = webp
      document.getElementById("webp-loader").style.display = "none"
      console.log(">> preview: webp")
    }
  }, 10)
}

function rand(arr) {
  return "#" + arr[Math.floor(Math.random() * arr.length)]
}

function rect(ctx, x, y, width, height) {
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + width, y)
  ctx.lineTo(x + width, y + height)
  ctx.lineTo(x, y + height)
  ctx.lineTo(x, y)
  ctx.closePath()
}

function round(ctx, radius, x, y, width, height) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function roundRegion(radius, x, y, width, height) {
  const region = new Path2D()
  region.moveTo(x + radius, y)
  region.lineTo(x + width - radius, y)
  region.quadraticCurveTo(x + width, y, x + width, y + radius)
  region.lineTo(x + width, y + height - radius)
  region.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  region.lineTo(x + radius, y + height)
  region.quadraticCurveTo(x, y + height, x, y + height - radius)
  region.lineTo(x, y + radius)
  region.quadraticCurveTo(x, y, x + radius, y)
  region.closePath()
  return region
}

function nextGradient() {
  // Generate colours
  const palette = new ColorScheme()
  palette.scheme("triade")
  return [
    rand(palette.colors()),
    rand(palette.colors()),
    rand(palette.colors()),
    rand(palette.colors()),
    rand(palette.colors()),
  ]
}

function cycleGradient() {
  gradientColours = nextGradient()
}

function id(v) {
  return document.getElementById(v)
}

function ev(v) {
  return id(v).value
}

function pi(v) {
  const x = parseInt(v, 10)
  return x === NaN ? null : x
}