const STORAGE_KEY = 'signaweb-vocabulary-v1';
export const MAX_WORDS = 30;
export const MAX_EXAMPLES = 8;

// Preserva a orientação. Remove somente posição na imagem e escala da mão.
export function handFeatures(points) {
  if (!Array.isArray(points) || points.length !== 21 || points.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || (p.z !== undefined && !Number.isFinite(p.z)))) return null;
  const wrist = points[0];
  const scale = Math.hypot(points[9].x - wrist.x, points[9].y - wrist.y, (points[9].z || 0) - (wrist.z || 0));
  if (scale < 0.001) return null;
  return points.flatMap(point => [(point.x - wrist.x) / scale, (point.y - wrist.y) / scale, ((point.z || 0) - (wrist.z || 0)) / scale]);
}

export function validExample(example) {
  return Array.isArray(example) && example.length === 63 && example.every(value => Number.isFinite(value) && Math.abs(value) < 20);
}

export function loadVocabulary() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.filter(item => item && typeof item.word === 'string' && item.word.trim() && item.word.length <= 40 &&
      Array.isArray(item.examples) && item.examples.length > 0 && item.examples.every(validExample))
      .slice(0, MAX_WORDS).map(item => ({ word: item.word.trim(), examples: item.examples.slice(0, MAX_EXAMPLES) }));
  } catch { return []; }
}

export function saveVocabulary(vocabulary) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vocabulary));
}

export function addExample(vocabulary, word, example) {
  const label = word.trim().replace(/\s+/g, ' ').slice(0, 40);
  if (!label || !validExample(example)) throw new Error('Informe uma palavra e mantenha uma mão visível.');
  const existing = vocabulary.find(item => item.word.toLocaleLowerCase('pt-BR') === label.toLocaleLowerCase('pt-BR'));
  if (!existing && vocabulary.length >= MAX_WORDS) throw new Error('O limite é de 30 palavras. Remova uma palavra para cadastrar outra.');
  if (existing && existing.examples.length >= MAX_EXAMPLES) throw new Error('Esta palavra já tem 8 exemplos. Remova o cadastro para começar de novo.');
  return existing ? vocabulary.map(item => item === existing ? { ...item, examples: [...item.examples, example] } : item) :
    [...vocabulary, { word: label, examples: [example] }];
}

// Limiar experimental de distância, sem alegação de confiança estatística.
export function recognizeWord(features, vocabulary) {
  if (!validExample(features)) return null;
  const candidates = vocabulary.filter(item => item.examples.length >= 3).map(item => ({
    word: item.word,
    distance: Math.min(...item.examples.map(example => Math.sqrt(example.reduce((sum, value, i) => sum + (value - features[i]) ** 2, 0) / features.length)))
  })).sort((a, b) => a.distance - b.distance);
  const [best, second] = candidates;
  if (!best || best.distance > 0.16 || (second && second.distance - best.distance < 0.05)) return null;
  return best.word;
}
