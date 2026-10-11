export const SIGN_DICTIONARY = ['Mão aberta', 'Mão fechada (punho)', 'Positivo', 'Vitória / Paz'];

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
const jointAngle = (a, b, c) => {
  const ab = [a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0)];
  const cb = [c.x - b.x, c.y - b.y, (c.z || 0) - (b.z || 0)];
  const length = Math.hypot(...ab) * Math.hypot(...cb);
  if (!length) return 0;
  const cosine = ab.reduce((sum, value, i) => sum + value * cb[i], 0) / length;
  return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
};

// Usa a geometria da mão, em vez de comparar a altura dos dedos na tela.
export function classifyHandGesture(landmarks) {
  if (!Array.isArray(landmarks) || landmarks.length < 21 ||
      !landmarks.every(point => point && Number.isFinite(point.x) && Number.isFinite(point.y) &&
        (point.z === undefined || Number.isFinite(point.z)))) return null;
  const wrist = landmarks[0];
  const palmSize = distance(wrist, landmarks[9]);
  if (palmSize < 0.0001) return null;
  const extended = (base, joint, tip) => jointAngle(landmarks[base], landmarks[joint], landmarks[tip]) > 155 &&
    distance(wrist, landmarks[tip]) > distance(wrist, landmarks[joint]) * 1.15;
  const fingers = [[5, 6, 8], [9, 10, 12], [13, 14, 16], [17, 18, 20]].map(points => extended(...points));
  const thumbExtended = jointAngle(landmarks[2], landmarks[3], landmarks[4]) > 155 &&
    distance(landmarks[4], landmarks[5]) > palmSize * 0.65;
  if (fingers.every(Boolean)) return SIGN_DICTIONARY[0];
  if (fingers.every(value => !value)) return thumbExtended ? SIGN_DICTIONARY[2] : SIGN_DICTIONARY[1];
  if (fingers[0] && fingers[1] && !fingers[2] && !fingers[3]) return SIGN_DICTIONARY[3];
  return null;
}
