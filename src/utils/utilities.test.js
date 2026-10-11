import { classifyHandGesture } from './utilities';

function hand(extended, thumb = false) {
  const points = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  [[5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]].forEach((indices, finger) => {
    const x = (finger - 1.5) * 0.2;
    indices.forEach((index, joint) => {
      points[index] = { x, y: extended[finger] ? 1 + joint * 0.4 : [1, 1.3, 1, 0.8][joint], z: 0 };
    });
  });
  points[1] = { x: -0.3, y: 0.2 };
  points[2] = { x: -0.5, y: 0.4 };
  points[3] = { x: -0.7, y: 0.6 };
  points[4] = thumb ? { x: -1.1, y: 1 } : { x: -0.3, y: 0.8 };
  return points;
}

test.each([
  [[true, true, true, true], false, 'Mão aberta'],
  [[false, false, false, false], false, 'Mão fechada (punho)'],
  [[false, false, false, false], true, 'Positivo'],
  [[true, true, false, false], false, 'Vitória / Paz']
])('reconhece o gesto mesmo ao girar ou espelhar a mão', (fingers, thumb, expected) => {
  const points = hand(fingers, thumb);
  expect(classifyHandGesture(points)).toBe(expected);
  expect(classifyHandGesture(points.map(p => ({ x: -p.y, y: p.x, z: p.z })))).toBe(expected);
  expect(classifyHandGesture(points.map(p => ({ ...p, x: -p.x })))).toBe(expected);
});

test('recusa dados incompletos, degenerados e gestos fora do vocabulário', () => {
  expect(classifyHandGesture(null)).toBeNull();
  expect(classifyHandGesture([])).toBeNull();
  expect(classifyHandGesture(Array(21).fill({ x: 0, y: 0 }))).toBeNull();
  expect(classifyHandGesture(hand([true, false, false, false]))).toBeNull();
});
