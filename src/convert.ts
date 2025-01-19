import { matrix, inv, multiply, Matrix, add, subtract } from 'mathjs';

const yccMatrix = matrix([
  [0.299, 0.587, 0.114],
  [-0.169, -0.331, 0.5],
  [0.5, -0.419, -0.081],
]);

const rgbMatrix = inv(yccMatrix);

const offset = matrix([-128, 0, 0]);

export const rtoy = (rgb: Matrix) => add(multiply(yccMatrix, rgb), offset);
export const ytor = (ycc: Matrix) => multiply(rgbMatrix, subtract(ycc, offset));
