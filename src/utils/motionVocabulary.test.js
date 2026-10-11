import { motionFrame, normalizeMotion, addMotionExample, recognizeMotion, loadMotions, saveMotions } from './motionVocabulary';

function sequence(direction = 1, offset = 0) {
  return normalizeMotion(Array.from({ length: 31 }, (_, frame) => {
    const hand = Array.from({ length: 21 }, (_, point) => ({ x: offset + point * 0.01 + direction * frame * 0.012, y: point * 0.025, z: 0 }));
    return motionFrame({ multiHandLandmarks: [hand], multiHandedness: [{ label: 'Left' }] }, frame * 100);
  }));
}

beforeEach(() => localStorage.clear());

test('preserva a trajetória e reconhece o movimento independentemente da posição inicial', () => {
  const example = sequence();
  const shifted = sequence(1, 0.3);
  let motions = [];
  for (let i = 0; i < 3; i += 1) motions = addMotionExample(motions, 'Teste', example);
  expect(recognizeMotion(shifted, motions)).toBe('Teste');
  expect(recognizeMotion(sequence(-1), motions)).toBeNull();
});

test('exige três exemplos e recusa duas palavras com o mesmo movimento', () => {
  const example = sequence();
  let motions = addMotionExample([], 'Oi', example);
  expect(recognizeMotion(example, motions)).toBeNull();
  for (let i = 0; i < 2; i += 1) motions = addMotionExample(motions, 'Oi', example);
  for (let i = 0; i < 3; i += 1) motions = addMotionExample(motions, 'Tchau', example);
  expect(recognizeMotion(example, motions)).toBeNull();
});

test('mantém as duas mãos nos mesmos espaços quando a ordem do detector muda', () => {
  const left = Array.from({ length: 21 }, (_, i) => ({ x: i * 0.01, y: i * 0.02 }));
  const right = left.map(point => ({ ...point, x: point.x + 0.4 }));
  const a = motionFrame({ multiHandLandmarks: [left, right], multiHandedness: [{ label: 'Left' }, { label: 'Right' }] }, 0);
  const b = motionFrame({ multiHandLandmarks: [right, left], multiHandedness: [{ label: 'Right' }, { label: 'Left' }] }, 0);
  expect(a).toEqual(b);
});

test('recusa gravações curtas ou sem mãos visíveis', () => {
  expect(normalizeMotion([])).toBeNull();
  expect(normalizeMotion(Array.from({ length: 31 }, (_, i) => motionFrame({}, i * 100)))).toBeNull();
});

test('salva movimentos e restaura somente exemplos válidos', () => {
  const motions = addMotionExample([], 'Teste', sequence());
  saveMotions(motions);
  expect(loadMotions()).toEqual(motions);
  localStorage.setItem('signaweb-motions-v1', '[{"word":"Inválida","examples":[[]]}]');
  expect(loadMotions()).toEqual([]);
});
