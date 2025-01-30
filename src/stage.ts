import { Application, Container, Graphics } from 'pixi.js';
import { dct2, idct2, rtoy, ytor, zigzagOrder } from './convert';
import * as math from 'mathjs';
import {
  MathNumericType,
  Matrix,
  matrix,
  zeros,
} from 'mathjs';
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
  const ys = new Array<number>(len).fill(0);
  const cbs = new Array<number>(slen).fill(0);
  const crs = new Array<number>(slen).fill(0);
  const N = 8;

  for (let i = 0; i < wholeSize; i += bpp) {
    const j = i + pxOffset;
    const b = data[j];
    const g = data[j + 1];
    const r = data[j + 2];
    const ycc = rtoy(matrix([r, g, b]));
    const k = i / 3;
    ys[k] = Math.round(ycc.get([0]));

    const x = k % w;
    const y = Math.floor(k / w);
    const cx = Math.floor(x / 2);
    const cy = Math.floor(y / 2);

    if (x % 2 === 0 && y % 2 === 0) {
      const ci = cy * cw + cx;
      cbs[ci] = Math.round(ycc.get([1]));
      crs[ci] = Math.round(ycc.get([2]));
    }
  }

  appEl.addEventListener('mousewheel', (event: any) => {
    event.stopPropagation();
    event.preventDefault();
  });

  Object.defineProperty(window, 'math', {
    get: () => math,
  });
  Object.defineProperty(window, 'container', {
    get: () => container,
  });
  Object.defineProperty(window, 'cbs', {
    get: () => cbs,
  });
  Object.defineProperty(window, 'crs', {
    get: () => crs,
  });
  Object.defineProperty(window, 'ys', {
    get: () => ys,
  });
  Object.defineProperty(window, 'dctCoefficients', {
    get: () => dctCoefficients,
  });
  Object.defineProperty(window, 'yCoefficients', {
    get: () => yCoefficients,
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

  // scale
  const f = 1;

  // original image
  const rgbc = new Container();
  const g = new Graphics();
  rgbc.addChild(g);
  container.addChild(rgbc);

  rgbc.y = 10;
  rgbc.x = 10;

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

  yc.x = 10;
  yc.y = h * f + 20;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      //const cx = Math.floor(x / 2);
      //const cy = Math.floor(y / 2);
      //const ci = cy * cw + cx;
      //const ycc = matrix([ys[i], cbs[ci] ?? 0, crs[ci] ?? 0]);
      const ycc = matrix([ys[i], 0, 0]);
      const rgb = ytor(ycc);
      const color = (rgb.get([0]) << 16) | (rgb.get([1]) << 8) | rgb.get([2]);
      yg.rect(x * f, (h - y) * f, f, f);
      yg.fill(color);
    }
  }

  /*
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
  /*
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
  //const gap = 4;
  //const k = 4 * f;

  const makeBasisBlock = (row: number, col: number) => {
    const blockContainer = new Container();
    const blockGraphics = new Graphics();
    crc.addChild(blockContainer);
    blockContainer.addChild(blockGraphics);
    blockContainer.x = row * N * k + gap * row;
    blockContainer.y = col * N * k + gap * col;
    const mx = Array.from<number[]>({ length: N })
      .fill(Array.from<number>({ length: N }).fill(0))
      .map((a) => Array.from(a));
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        blockGraphics.rect(i * k, j * k, k, k);
        const rowCosVal = cos(col * (pi / (2 * N) + (j * pi) / N));
        const colCosVal = cos(row * (pi / (2 * N) + (i * pi) / N));
        const mult = rowCosVal * colCosVal;
        mx[i][j] = mult;
        const normalizedMult = (mult + 1) / 2;
        const shade = Math.round(normalizedMult * 255);
        let color = (shade << 16) | (shade << 8) | shade;
        blockGraphics.fill(color);
      }
    }
  };

  // basis image
  /*
  crc.y = h * f + 10;
  crc.x = 10;

  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      makeBasisBlock(row, col);
    }
  }
  */

  const browsCount = h / N;
  const bcolsCount = w / N;

  const yCoefficients = Array.from<Matrix<MathNumericType>>({
    length: browsCount * bcolsCount,
  });
  const dctCoefficients = Array.from<Matrix<MathNumericType>>({
    length: browsCount * bcolsCount,
  });

  const singleToPair = zigzagOrder(N);
  const pairToSingle = singleToPair.reduce(
    (m, [i, j], n) => {
      m[i * N + j] = n;
      return m;
    },
    Array.from<number>({ length: singleToPair.length }),
  );

  const dctnInput = document.getElementById('dctn') as HTMLInputElement;
  const dctnParahraph = document.getElementById(
    'dctvalue',
  ) as HTMLParagraphElement;

  // calculate the dct coefficients
  let coefficientsNumber = parseInt(dctnInput.value, 10);
  const calculateDCTCoefficients = () => {
    for (let row = 0; row < browsCount; row++) {
      for (let col = 0; col < bcolsCount; col++) {
        const y = row * N;
        const x = col * N;
        const lmx = zeros(N, N) as Matrix<MathNumericType>;
        for (let i = 0; i < N; i++) {
          for (let j = 0; j < N; j++) {
            const py = y + i;
            const px = x + j;
            (lmx as Matrix<MathNumericType>).set([i, j], ys[py * w + px]);
          }
        }
        yCoefficients[row * bcolsCount + col] = lmx;
        const block = dct2(lmx) as Matrix; // dotMultiply(round(dotDivide(dct2(lmx), YQ)), YQ);

        // here we can adjust number of coefficients to be rendered
        dctCoefficients[row * bcolsCount + col] = block.map((x, [i, j]) =>
          pairToSingle[i * N + j] < coefficientsNumber ? x : 0,
        );
      }
    }
  };
  calculateDCTCoefficients();

  // reconstruct luma components
  const reconstructedLumaComponents = ys.slice();

  const regenerateLumaComponents = () => {
    for (let row = 0; row < browsCount; row++) {
      for (let col = 0; col < bcolsCount; col++) {
        const cornerPixelX = col * N;
        const cornerPixelY = row * N;
        const block = idct2(
          dctCoefficients[row * bcolsCount + col],
        ) as Matrix<number>;
        for (let i = 0; i < N; i++) {
          for (let j = 0; j < N; j++) {
            const pixelY = cornerPixelY + i;
            const pixelX = cornerPixelX + j;
            const pixelIndex = pixelY * w + pixelX;
            reconstructedLumaComponents[pixelIndex] = block.get([i, j]);
          }
        }
      }
    }
  };
  regenerateLumaComponents();

  // render luma components
  const rbwc = new Container();
  const rbwg = new Graphics();
  rbwc.addChild(rbwg);
  container.addChild(rbwc);

  rbwc.x = 10;
  rbwc.y = 2 * h * f + 30;
  const renderReconstructed = () => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const ycc = matrix([reconstructedLumaComponents[i], 0, 0]);
        const rgb = ytor(ycc);
        const color = (rgb.get([0]) << 16) | (rgb.get([1]) << 8) | rgb.get([2]);
        rbwg.rect(x * f, (h - y) * f, f, f);
        //rbwg.stroke(color);
        rbwg.fill(color);
      }
    }
  };
  renderReconstructed();

  dctnInput?.addEventListener('change', () => {
    dctnParahraph.textContent =
      dctnParahraph.textContent?.replace(/\d+/, dctnInput.value) ?? '';
    coefficientsNumber = parseInt(dctnInput.value);
    calculateDCTCoefficients();
    regenerateLumaComponents();
    renderReconstructed();
  });
})();
