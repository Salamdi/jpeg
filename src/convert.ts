import {
  matrix,
  inv,
  multiply,
  Matrix,
  add,
  subtract,
  MathScalarType,
  zeros,
  cos,
  pi,
  transpose,
  MathType,
  sqrt,
  divide,
  round,
} from 'mathjs';

const yccMatrix = matrix([
  [0.299, 0.587, 0.114],
  [-0.169, -0.331, 0.5],
  [0.5, -0.419, -0.081],
]);

const rgbMatrix = inv(yccMatrix);

export const offset = matrix([128, 0, 0]);

const min = 0;
const max = 255;
export const rtoy = (rgb: Matrix) => add(multiply(yccMatrix, rgb), offset);
export const ytor = (ycc: Matrix) =>
  multiply(rgbMatrix, subtract(ycc, offset)).map((x) => {
    if (x < min) {
      return min;
    }
    if (x > max) {
      return max;
    }
    return round(x);
  });

const N = 8;
const C = (zeros(N, N) as Matrix<MathScalarType>).map((_, [w, i]) =>
  cos(((2 * i + 1) * w * pi) / (2 * N)),
);
const CN = C.map((x, [i]) =>
  i === 0 ? divide(x, sqrt(N)) : multiply(x, sqrt(2 / N)),
);
const CNT = transpose(CN);

export const dct = (block: Matrix<MathType>) =>
  multiply(block as MathType, CNT);

export const dct2 = (block: Matrix<MathScalarType>) =>
  multiply(CN, block as MathType, CNT);

export const idct2 = (dct: Matrix<MathScalarType>) =>
  multiply(CNT, dct as MathType, CN);

export const YQ = matrix([
  [16, 11, 10, 16, 24, 40, 51, 61],
  [12, 12, 14, 19, 26, 58, 60, 55],
  [14, 13, 16, 24, 40, 57, 69, 56],
  [14, 17, 22, 29, 51, 87, 80, 62],
  [18, 22, 37, 56, 68, 109, 103, 77],
  [24, 35, 55, 64, 81, 104, 113, 92],
  [49, 64, 78, 87, 103, 121, 120, 101],
  [72, 92, 95, 98, 112, 100, 103, 99],
]);

Object.defineProperty(window, 'C', {
  get: () => C,
});
Object.defineProperty(window, 'dct', {
  get: () => dct,
});

export const zigzagOrder = (N: number) => {
  const zigzag: [number, number][] = [];
  for (let S = 0; S <= 2 * (N - 1); S++) {
    if (S % 2 === 0) {
      for (let j = Math.min(S, N - 1), i = S - j; j >= 0 && i < N; j--, i++) {
        zigzag.push([j, i]);
      }
    } else {
      for (let i = Math.min(S, N - 1), j = S - i; i >= 0 && j < N; i--, j++) {
        zigzag.push([j, i]);
      }
    }
  }
  return zigzag;
};
