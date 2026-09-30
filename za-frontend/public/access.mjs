/** Dwell activates once per entry; tracking loss clears the pending action. */
export class Dwell {
  constructor(duration = 1200) { this.duration = duration; this.reset(); }
  reset() { this.target = null; this.since = 0; this.fired = false; }
  update(target, now) {
    if (!target) { this.reset(); return { progress: 0, activate: false }; }
    if (target !== this.target) { this.target = target; this.since = now; this.fired = false; }
    const progress = Math.min(1, Math.max(0, (now - this.since) / this.duration));
    const activate = progress === 1 && !this.fired;
    if (activate) this.fired = true;
    return { progress, activate };
  }
}
export function removeLastGrapheme(text, locale = 'en') {
  const pieces = [...new Intl.Segmenter(locale, { granularity: 'grapheme' }).segment(text)];
  return pieces.length ? text.slice(0, pieces.at(-1).index) : '';
}
/** Least-squares affine calibration, rejected if degenerate or visibly inaccurate. */
export function fitCalibration(samples) {
  if (samples.length < 5) throw new Error('Five calibration targets are required');
  const solve = axis => {
    const matrix = Array.from({ length: 3 }, () => [0, 0, 0, 0]);
    for (const { raw, target } of samples) {
      const row = [raw[0], raw[1], 1];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) matrix[i][j] += row[i] * row[j];
        matrix[i][3] += row[i] * target[axis];
      }
    }
    for (let i = 0; i < 3; i++) {
      let pivot = i;
      for (let j = i + 1; j < 3; j++) if (Math.abs(matrix[j][i]) > Math.abs(matrix[pivot][i])) pivot = j;
      [matrix[i], matrix[pivot]] = [matrix[pivot], matrix[i]];
      const divisor = matrix[i][i];
      if (Math.abs(divisor) < 1e-6) throw new Error('Gaze did not move enough between targets');
      for (let k = i; k < 4; k++) matrix[i][k] /= divisor;
      for (let j = 0; j < 3; j++) if (j !== i) {
        const multiplier = matrix[j][i];
        for (let k = i; k < 4; k++) matrix[j][k] -= multiplier * matrix[i][k];
      }
    }
    return matrix.map(row => row[3]);
  };
  const result = [solve(0), solve(1)];
  const error = Math.sqrt(samples.reduce((sum, sample) => sum + result.reduce((part, row, axis) =>
    part + (row[0] * sample.raw[0] + row[1] * sample.raw[1] + row[2] - sample.target[axis]) ** 2, 0), 0) / samples.length);
  if (!Number.isFinite(error) || error > 0.12) throw new Error('Calibration error is too large; reposition and retry');
  return result;
}
export function mapGaze(calibration, x, y) {
  return calibration.map(row => Math.max(0, Math.min(1, row[0] * x + row[1] * y + row[2])));
}
