import { handFeatures, addExample, recognizeWord, saveVocabulary, loadVocabulary } from './vocabulary';

beforeEach(() => localStorage.clear());
const points = Array.from({ length: 21 }, (_, i) => ({ x: i * 0.02, y: i * 0.04, z: i * 0.01 }));
const example = handFeatures(points);

test('remove a posição e a escala mantendo a orientação do exemplo', () => {
  const shifted = handFeatures(points.map(p => ({ x: 0.3 + p.x * 2, y: -0.1 + p.y * 2, z: 0.5 + p.z * 2 })));
  shifted.forEach((value, i) => expect(value).toBeCloseTo(example[i]));
  expect(handFeatures([])).toBeNull();
  expect(handFeatures(Array(21).fill({ x: 0, y: 0 }))).toBeNull();
});

test('exige três exemplos, reconhece palavras cadastradas e recusa poses desconhecidas', () => {
  let vocabulary = addExample([], 'Palavra', example);
  vocabulary = addExample(vocabulary, 'palavra', example);
  expect(recognizeWord(example, vocabulary)).toBeNull();
  vocabulary = addExample(vocabulary, 'PALAVRA', example);
  expect(vocabulary).toHaveLength(1);
  expect(recognizeWord(example, vocabulary)).toBe('Palavra');
  expect(recognizeWord(example.map(value => value + 1), vocabulary)).toBeNull();
});

test('não escolhe uma palavra quando dois sinais são semelhantes demais', () => {
  const vocabulary = [
    { word: 'Primeira', examples: [example, example, example] },
    { word: 'Segunda', examples: [example, example, example] }
  ];
  expect(recognizeWord(example, vocabulary)).toBeNull();
});

test('salva e restaura exemplos, ignorando dados inválidos', () => {
  const vocabulary = addExample([], 'Teste', example);
  saveVocabulary(vocabulary);
  expect(loadVocabulary()).toEqual(vocabulary);
  localStorage.setItem('signaweb-vocabulary-v1', JSON.stringify([{ word: 'Inválida', examples: [[1]] }]));
  expect(loadVocabulary()).toEqual([]);
  localStorage.setItem('signaweb-vocabulary-v1', '{');
  expect(loadVocabulary()).toEqual([]);
});
