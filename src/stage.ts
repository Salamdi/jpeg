import { Application, Container, Graphics } from 'pixi.js';
import { dct2, idct2, rtoy, ytor, zigzagOrder } from './convert';
import { floor, MathNumericType, Matrix, matrix, zeros, round } from 'mathjs';
import { Viewport } from 'pixi-viewport';

const getHeaderValue = (data: Uint8Array, offset: number, size: number) =>
  data
    .slice(offset, offset + size)
    .reduce((value, b, i) => (b << (8 * i)) | value, 0);

export const main = async () => {
  // Create a new application
  const app = new Application();

  const appEl = document.getElementById('app') ?? document.body;

  // Initialize the application
  await app.init({ background: '#1099bb', resizeTo: appEl });

  // Append the application canvas to the document body
  appEl.appendChild(app.canvas);

  const data = await fetch('/tiger.bmp')
    .then((r) => r.arrayBuffer())
    .then((ab) => new Uint8Array(ab));
  const w = getHeaderValue(data, 18, 4);
  const h = getHeaderValue(data, 22, 4);
  const cw = Math.ceil(w / 2);
  const ch = Math.ceil(h / 2);
  const bpp = getHeaderValue(data, 28, 2) / 8;
  const imageSize = getHeaderValue(data, 34, 4);
  const pxOffset = getHeaderValue(data, 10, 4);
  const pad = imageSize % bpp;
  const wholeSize = imageSize - pad;
  const len = wholeSize / bpp;
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
    const k = i / bpp;
    ys[k] = round(ycc.get([0]));

    const x = k % w;
    const y = Math.floor(k / w);
    const cx = Math.floor(x / 2);
    const cy = Math.floor(y / 2);

    if (x % 2 === 0 && y % 2 === 0) {
      const ci = cy * cw + cx;
      cbs[ci] = round(ycc.get([1]));
      crs[ci] = round(ycc.get([2]));
    }
  }

  appEl.addEventListener('mousewheel', (event: any) => {
    event.stopPropagation();
    event.preventDefault();
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
  const graphics = new Graphics();
  rgbc.addChild(graphics);
  container.addChild(rgbc);

  rgbc.y = 10;
  rgbc.x = 10;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * bpp;
      const j = i + pxOffset;
      let colorOffset = 0;
      const b = getHeaderValue(data, j + colorOffset++, 1);
      const g = getHeaderValue(data, j + colorOffset++, 1);
      const r = getHeaderValue(data, j + colorOffset, 1);
      const color = (r << 16) | (g << 8) | b;
      graphics.rect(x * f, (h - y) * f, f, f);
      graphics.fill(color);
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
      const cx = Math.floor(x / 2);
      const cy = Math.floor(y / 2);
      const ci = cy * cw + cx;
      const ycc = matrix([ys[i], cbs[ci] ?? 0, crs[ci] ?? 0]);
      //const ycc = matrix([ys[i], 0, 0]);
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

  const lumaBrowsCount = floor(h / N);
  const lumaBcolsCount = floor(w / N);

  const chromaBrowsCount = floor(ch / N);
  const chromaBcolsCount = floor(cw / N);

  const lumaDCTCoefficients = Array.from<Matrix<MathNumericType>>({
    length: lumaBrowsCount * lumaBcolsCount,
  });
  const chromaredDCTCoefficients = Array.from<Matrix<MathNumericType>>({
    length: chromaBrowsCount * chromaBcolsCount,
  });
  const chromablueDCTCoefficients = Array.from<Matrix<MathNumericType>>({
    length: chromaBrowsCount * chromaBcolsCount,
  });

  const singleToPair = zigzagOrder(N);
  const pairToSingle = singleToPair.reduce(
    (m, [i, j], n) => {
      m[i * N + j] = n;
      return m;
    },
    Array.from<number>({ length: singleToPair.length }),
  );

  const lumaDCTInput = document.getElementById('lumadct') as HTMLInputElement;
  const lumaDctnParahraph = document.getElementById(
    'lumadctvalue',
  ) as HTMLParagraphElement;
  const chromaDCTInput = document.getElementById('chromadct') as HTMLInputElement;
  const chromaParahraph = document.getElementById(
    'chromadctvalue',
  ) as HTMLParagraphElement;

  // calculate the dct coefficients
  let lumaCoefficientsNumber = parseInt(lumaDCTInput.value, 10);
  let chromaCoefficientsNumber = parseInt(chromaDCTInput.value, 10);
  const calculateDCTCoefficients = () => {
    for (let row = 0; row < lumaBrowsCount; row++) {
      for (let col = 0; col < lumaBcolsCount; col++) {
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

        const block = dct2(lmx) as Matrix; // dotMultiply(round(dotDivide(dct2(lmx), YQ)), YQ);

        // here we can adjust number of coefficients to be rendered
        lumaDCTCoefficients[row * lumaBcolsCount + col] = block.map(
          (x, [i, j]) => (pairToSingle[i * N + j] < lumaCoefficientsNumber ? x : 0),
        );
      }
    }

    for (let row = 0; row < chromaBrowsCount; row++) {
      for (let col = 0; col < chromaBcolsCount; col++) {
        const y = row * N;
        const x = col * N;

        // chroma components
        const crmx = zeros(N, N) as Matrix<number>;
        const cbmx = zeros(N, N) as Matrix<number>;
        for (let i = 0; i < N; i++) {
          for (let j = 0; j < N; j++) {
            const py = y + i;
            const px = x + j;
            (crmx as Matrix<MathNumericType>).set([i, j], crs[py * cw + px]);
            (cbmx as Matrix<MathNumericType>).set([i, j], cbs[py * cw + px]);
          }
          const crblock = dct2(crmx) as Matrix;
          const cbblock = dct2(cbmx) as Matrix;
          chromaredDCTCoefficients[row * chromaBcolsCount + col] = crblock.map(
            (x, [i, j]) =>
              pairToSingle[i * N + j] < chromaCoefficientsNumber ? x : 0,
          );
          chromablueDCTCoefficients[row * chromaBcolsCount + col] = cbblock.map(
            (x, [i, j]) =>
              pairToSingle[i * N + j] < chromaCoefficientsNumber ? x : 0,
          );
        }
      }
    }
  };
  calculateDCTCoefficients();

  // reconstruct luma components
  const reconstructedLumaComponents = ys.slice();
  const reconstructedChromaredComponents = crs.slice();
  const reconstructedChromablueComponents = cbs.slice();

  const reconstructComponents = () => {
    for (let row = 0; row < lumaBrowsCount; row++) {
      for (let col = 0; col < lumaBcolsCount; col++) {
        const cornerPixelX = col * N;
        const cornerPixelY = row * N;
        const block = idct2(
          lumaDCTCoefficients[row * lumaBcolsCount + col],
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
    for (let row = 0; row < chromaBrowsCount; row++) {
      for (let col = 0; col < chromaBcolsCount; col++) {
        const cornerPixelX = col * N;
        const cornerPixelY = row * N;
        const rblock = idct2(
          chromaredDCTCoefficients[row * chromaBcolsCount + col],
        ) as Matrix<number>;
        const bblock = idct2(
          chromablueDCTCoefficients[row * chromaBcolsCount + col],
        ) as Matrix<number>;
        for (let i = 0; i < N; i++) {
          for (let j = 0; j < N; j++) {
            const pixelY = cornerPixelY + i;
            const pixelX = cornerPixelX + j;
            const pixelIndex = pixelY * cw + pixelX;
            reconstructedChromaredComponents[pixelIndex] = rblock.get([i, j]);
            reconstructedChromablueComponents[pixelIndex] = bblock.get([i, j]);
          }
        }
      }
    }
  };
  reconstructComponents();

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
        const cx = Math.floor(x / 2);
        const cy = Math.floor(y / 2);
        const ci = cy * cw + cx;
        const ycc = matrix([
          reconstructedLumaComponents[i],
          reconstructedChromablueComponents[ci],
          reconstructedChromaredComponents[ci],
        ]);
        const rgb = ytor(ycc);
        const color = (rgb.get([0]) << 16) | (rgb.get([1]) << 8) | rgb.get([2]);
        rbwg.rect(x * f, (h - y) * f, f, f);
        rbwg.fill(color);
      }
    }
  };
  renderReconstructed();

  Object.defineProperty(self, 'reconstructedChromaredComponents', {
    get: () => reconstructedChromaredComponents,
  });
  Object.defineProperty(self, 'crs', {
    get: () => crs,
  });
  Object.defineProperty(self, 'reconstructedChromablueComponents', {
    get: () => reconstructedChromablueComponents,
  });
  Object.defineProperty(self, 'cbs', {
    get: () => cbs,
  });

  lumaDCTInput?.addEventListener('change', () => {
    lumaDctnParahraph.textContent =
      lumaDctnParahraph.textContent?.replace(/\d+/, lumaDCTInput.value) ?? '';
    lumaCoefficientsNumber = parseInt(lumaDCTInput.value);
    calculateDCTCoefficients();
    reconstructComponents();
    renderReconstructed();
  });
  chromaDCTInput?.addEventListener('change', () => {
    chromaParahraph.textContent =
      chromaParahraph.textContent?.replace(/\d+/, chromaDCTInput.value) ?? '';
    chromaCoefficientsNumber = parseInt(chromaDCTInput.value);
    calculateDCTCoefficients();
    reconstructComponents();
    renderReconstructed();
  });
};
main();
