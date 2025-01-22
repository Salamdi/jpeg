import { Application, Container, Graphics } from 'pixi.js';
import { rtoy, ytor } from './convert';
import { cos, matrix, pi } from 'mathjs';
import { Viewport } from 'pixi-viewport';

const getHeaderValue = (data: Uint8Array, offset: number, size: number) =>
  data
    .slice(offset, offset + size)
    .reduce((value, b, i) => (b << (8 * i)) | value, 0);

(async () => {
  // Create a new application
  const app = new Application();

  const appEl = document.getElementById('app') ?? document.body;

  // Initialize the application
  await app.init({ background: '#1099bb', resizeTo: appEl });

  // Append the application canvas to the document body
  appEl.appendChild(app.canvas);

  const data = await fetch('/flower.bmp')
    .then((r) => r.arrayBuffer())
    .then((ab) => new Uint8Array(ab));
  const w = getHeaderValue(data, 18, 4);
  const h = getHeaderValue(data, 22, 4);
  const cw = Math.ceil(w / 2);
  const ch = Math.ceil(h / 2);
  const bpp = getHeaderValue(data, 28, 2) / 8;
  const imageSize = getHeaderValue(data, 34, 4);
  const pxOffset = getHeaderValue(data, 10, 4);
  const pad = imageSize % 3;
  const wholeSize = imageSize - pad;
  const len = (wholeSize - pxOffset) / bpp;
  const slen = cw * ch;
  const ys = new Array(len).fill(0);
  const cbs = new Array(slen).fill(0);
  const crs = new Array(slen).fill(0);

  for (let i = 0; i < wholeSize; i += bpp) {
    const j = i + pxOffset;
    const b = data[j];
    const g = data[j + 1];
    const r = data[j + 2];
    const ycc = rtoy(matrix([r, g, b]));
    const k = i / 3;
    ys[k] = ycc.get([0]);

    const x = k % w;
    const y = Math.floor(k / w);
    const cx = Math.floor(x / 2);
    const cy = Math.floor(y / 2);

    if (x % 2 === 0 && y % 2 === 0) {
      const ci = cy * cw + cx;
      cbs[ci] = ycc.get([1]);
      crs[ci] = ycc.get([2]);
    }
  }

  appEl.addEventListener('mousewheel', (event: any) => {
    event.stopPropagation();
    event.preventDefault();
  });

  /* let isDown = false;

  let dx = 0;
  let dy = 0;

  app.canvas.addEventListener('pointerdown', (event) => {
    dx = event.offsetX - container.x;
    dy = event.offsetY - container.y;
    isDown = true;
  });

  app.canvas.addEventListener('pointerup', () => {
    isDown = false;
  });

  app.canvas.addEventListener('pointermove', (event) => {
    if (isDown) {
      const ndx = event.offsetX - container.x;
      const ndy = event.offsetY - container.y;
      const dxdiff = ndx - dx;
      const dydiff = ndy - dy;
      container.x += dxdiff;
      container.y += dydiff;
    }
  });

  appEl.addEventListener('mousewheel', (event: any) => {
    event.stopPropagation();
    event.preventDefault();
    const delta = event.deltaX || event.deltaY;

    // doebleTap
    if (event.ctrlKey && delta === 0) {
      const ds = container.scale.x / 100;
      const currentScale = container.scale.x;
      const goalScale = currentScale * 2;
      const scaleup = () => {
        if (container.scale.x >= goalScale) {
          return;
        }
        setTimeout(() => {
          container.scale.set((container.scale.x += ds));
          scaleup();
        });
      };
      scaleup();
      return;
    }

    // pinch
    if (event.ctrlKey && delta !== 0) {
      const speed = Math.sqrt(
        event.deltaX * event.deltaX + event.deltaY * event.deltaY,
      );

      if (event.wheelDelta < 0 && container.scale.x < 0.05) {
        return;
      }

      const ds = 0.01; // 1%
      const rate = ds * speed;
      const sp =
        event.wheelDelta > 0
          ? container.scale.x + rate
          : container.scale.x - rate;
      container.scale.set(sp);
    }
  });
  */

  Object.defineProperty(window, 'container', {
    get: () => container,
  });
  Object.defineProperty(window, 'cbs', {
    get: () => cbs,
  });
  Object.defineProperty(window, 'ys', {
    get: () => ys,
  });

  // Create and add a container to the stage
  const container = new Viewport({
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    worldWidth: window.innerWidth,
    worldHeight: window.innerHeight,
    events: app.renderer.events,
  });

  app.stage.addChild(container);

  container.drag().pinch().wheel().decelerate();

  const f = 1;

  // Move the container to the center
  //container.x = app.screen.width / 2;
  //container.y = app.screen.height / 2;

  // Center the in local container coordinates
  //container.pivot.set(container.width / 2);
  //container.pivot.set(container.height / 2);

  // original image
  /* const rgbc = new Container();
  const g = new Graphics();
  rgbc.addChild(g);
  container.addChild(rgbc);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const j = i + pxOffset;
      const color = getHeaderValue(data, j, 3);
      g.rect(x * f, (h - y) * f, f, f);
      g.fill(color);
    }
  }

  // 4:2:0 subsampled
  const yc = new Container();
  const yg = new Graphics();
  yc.addChild(yg);
  container.addChild(yc);

  yc.x = w * f + 10;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const cx = Math.floor(x / 2);
      const cy = Math.floor(y / 2);
      const ci = cy * cw + cx;
      const ycc = matrix([ys[i], cbs[ci] ?? 0, crs[ci] ?? 0]);
      const rgb = ytor(ycc);
      const color = (rgb.get([0]) << 16) | (rgb.get([1]) << 8) | rgb.get([2]);
      yg.rect(x * f, (h - y) * f, f, f);
      yg.fill(color);
    }
  }

  // 2:2:0 subsampled
  const cbc = new Container();
  const cbg = new Graphics();
  cbc.addChild(cbg);
  container.addChild(cbc);

  cbc.y = h * f + 10;
  cbc.x = w * f + 10;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cx = Math.floor(x / 2);
      const cy = Math.floor(y / 2);
      const ci = cy * cw + cx;
      const yp = y % 2 === 0 ? y : y - 1;
      const xp = x % 2 === 0 ? x : x - 1;
      const ip = yp * w + xp;
      const ycc = matrix([ys[ip], cbs[ci] ?? 0, crs[ci] ?? 0]);
      const rgb = ytor(ycc);
      const color = (rgb.get([0]) << 16) | (rgb.get([1]) << 8) | rgb.get([2]);
      cbg.rect(x * f, (h - y) * f, f, f);
      cbg.fill(color);
    }
  }
  */

  
  // black & white
  const bwc = new Container();
  const bwg = new Graphics();
  bwc.addChild(bwg);
  container.addChild(bwc);

  bwc.x = 2 * w * f + 10;
  bwc.y = h * f + 10;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const ycc = matrix([ys[i], 0, 0]);
      const rgb = ytor(ycc);
      const color = (rgb.get([0]) << 16) | (rgb.get([1]) << 8) | rgb.get([2]);
      bwg.rect(x * f, (h - y) * f, f, f);
      bwg.fill(color);
    }
  }

  const crc = new Container();
  const crg = new Graphics();
  crc.addChild(crg);
  container.addChild(crc);
  const gap = 4;
  const k = 4 * f;

  const makeBlock = (row: number, col: number) => {
    const blockContainer = new Container();
    const blockGraphics = new Graphics();
    crc.addChild(blockContainer);
    blockContainer.addChild(blockGraphics);
    blockContainer.x = row * N * k + gap * row;
    blockContainer.y = col * N * k + gap * col;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        blockGraphics.rect(N * k + i * k, N * k + j * k, k, k);
        const rowCosVal = cos(col * (pi / (2 * N) + (j * pi) / N));
        const colCosVal = cos(row * (pi / (2 * N) + (i * pi) / N));
        const mult = ((rowCosVal * colCosVal) + 1) / 2;
        const shade = Math.round(mult * 255);
        let color = (shade << 16) | (shade << 8) | shade;
        blockGraphics.fill(color);
      }
    }
  };

  // basis image
  crc.y = h * f + 10;
  const N = 8;
  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      makeBlock(row, col);
    }
  }
})();
