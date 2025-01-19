import p5 from 'p5';
import { matrix } from 'mathjs';
import { rtoy, ytor } from './convert';

function s(sketch: p5) {
  let data: { bytes: Uint8Array };
  let ys: number[];
  let cbs: number[];
  let crs: number[];
  let w: number;
  let h: number;
  let bpp: number;
  let imageSize: number;
  let f = 1;
  let d = 1;
  let zoom = 1;
  let ox = 0;
  let oy = 0;

  sketch.windowResized = () => {
    sketch.resizeCanvas(sketch.windowWidth, sketch.windowHeight);
  };

  sketch.mouseDragged = () => {
    ox += sketch.movedX / zoom;
    oy += sketch.movedY / zoom;
    sketch.redraw();
  };

  sketch.mouseWheel = (event) => {
    zoom *= (event as { delta: number }).delta > 0 ? 0.75 : 1.25;
    (event as { preventDefault: () => void }).preventDefault();
    sketch.redraw();
  };

  sketch.preload = () => {
    data = sketch.loadBytes(
      //'http://127.0.0.1:8080/tiger.bmp',
      'http://127.0.0.1:8080/flower.bmp',
      //'http://127.0.0.1:8080/img.bmp',
      //'http://127.0.0.1:8080/barn.bmp',
    ) as { bytes: Uint8Array };
  };

  const getHeaderValue = (offset: number, size: number) =>
    data.bytes
      .slice(offset, offset + size)
      .reduce((value, b, i) => (b << (8 * i)) | value, 0);

  sketch.setup = () => {
    w = getHeaderValue(18, 4);
    h = getHeaderValue(22, 4);
    bpp = getHeaderValue(28, 2) / 8;
    imageSize = getHeaderValue(34, 4);
    const pxOffset = getHeaderValue(10, 4);
    const pad = imageSize % 3;
    const wholeSize = imageSize - pad;
    const len = (wholeSize - pxOffset) / 3;
    ys = new Array(len).fill(0);
    cbs = new Array(len).fill(0);
    crs = new Array(len).fill(0);
    for (let i = 0; i < wholeSize; i += 3) {
      const j = i + pxOffset;
      const b = data.bytes[j];
      const g = data.bytes[j + 1];
      const r = data.bytes[j + 2];
      const ycc = rtoy(matrix([r, g, b]));
      ys[i / 3] = ycc.get([0]);
      cbs[i / 3] = ycc.get([1]);
      crs[i / 3] = ycc.get([2]);
    }
    sketch.createCanvas(sketch.windowWidth, sketch.windowHeight);
    sketch.noStroke();
  };

  sketch.draw = () => {
    sketch.background(220);
    sketch.translate(sketch.width / 2 + ox, sketch.height / 2 + oy);
    sketch.scale(zoom);
    sketch.translate(-sketch.width / 2, -sketch.height / 2);

    for (let y = 0; y < h; y += d) {
      for (let x = 0; x < w; x += d) {
        const i = y * w + x;
        const ycc = matrix([ys[i], cbs[i], crs[i]]);
        const re = ytor(ycc);
        sketch.fill(sketch.color(...re.toArray()));
        sketch.square(
          // x * f / d + (width - w * f / d) / 2,
          x * f + (sketch.width / 2 - w) - 2,
          (sketch.height + (h * f) / d) / 2 - (y * f) / d,
          f,
        );
      }
    }

    for (let y = 0; y < h; y += d) {
      for (let x = 0; x < w; x += d) {
        const i = y * w + x;
        const cx = x % 2 === 0 ? x : x - 1;
        const cy = y % 2 === 0 ? y : y - 1;
        const ci = cy * w + cx;
        const ycc = matrix([ys[i], cbs[ci], crs[ci]]);
        const re = ytor(ycc);
        sketch.fill(sketch.color(...re.toArray()));
        sketch.square(
          // x * f / d + (width - w * f / d) / 1,
          sketch.width / 2 + x * f + 2,
          (sketch.height + (h * f) / d) / 2 - (y * f) / d,
          f,
        );
      }
    }

    sketch.noLoop();
  };
}

new p5(s);
