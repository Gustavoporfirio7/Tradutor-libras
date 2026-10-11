const POINTS = [0, 4, 5, 6, 8, 9, 10, 12, 14, 16, 20];
export const MOTION_FRAMES = 16;
const FRAME_SIZE = 2 * (1 + POINTS.length * 3);
const STORAGE_KEY = 'signaweb-motions-v1';
export const DAILY_WORDS = ['Oi', 'Tchau', 'Obrigado', 'Por favor', 'Sim', 'Não', 'Desculpa', 'Bom dia', 'Como você está?', 'Preciso de ajuda'];

export function motionFrame(results, time) {
  const slots = [null, null];
  (results.multiHandLandmarks || []).slice(0, 2).forEach((hand, index) => {
    if (hand.length !== 21 || hand.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y) || (point.z !== undefined && !Number.isFinite(point.z)))) return;
    const label = results.multiHandedness?.[index]?.label;
    const slot = label === 'Right' ? 1 : label === 'Left' ? 0 : index;
    slots[slot] = hand.map(p => ({ x: p.x, y: p.y, z: p.z || 0 }));
  });
  return { time, hands: slots };
}

export function normalizeMotion(frames) {
  if (frames.length < 10 || frames[frames.length - 1].time - frames[0].time < 1000) return null;
  const visible = frames.filter(frame => frame.hands.some(Boolean));
  if (visible.length < frames.length * 0.8) return null;
  const first = visible[0].hands.find(Boolean);
  const origin = first[0];
  const scale = Math.hypot(first[9].x - origin.x, first[9].y - origin.y, first[9].z - origin.z);
  if (scale < 0.001) return null;
  const start = frames[0].time;
  const duration = frames[frames.length - 1].time - start;
  // Amostra por tempo, para não depender da taxa de quadros do celular.
  const sequence = Array.from({ length: MOTION_FRAMES }, (_, i) => {
    const target = start + duration * i / (MOTION_FRAMES - 1);
    const frame = frames.reduce((best, item) => Math.abs(item.time - target) < Math.abs(best.time - target) ? item : best);
    return frame.hands.flatMap(hand => hand ? [1, ...POINTS.flatMap(index => {
      const point = hand[index];
      return [(point.x - origin.x) / scale, (point.y - origin.y) / scale, (point.z - origin.z) / scale];
    })] : Array(1 + POINTS.length * 3).fill(0));
  });
  return validMotion(sequence) ? sequence : null;
}

export function validMotion(sequence) {
  return Array.isArray(sequence) && sequence.length === MOTION_FRAMES && sequence.every(frame => Array.isArray(frame) && frame.length === FRAME_SIZE && frame.every(value => Number.isFinite(value) && Math.abs(value) < 30));
}

export function loadMotions() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.filter(item => item && typeof item.word === 'string' && item.word.trim() && item.word.length <= 40 &&
      Array.isArray(item.examples) && item.examples.length > 0 && item.examples.every(validMotion)).slice(0, 40)
      .map(item => ({ word: item.word, examples: item.examples.slice(0, 5) }));
  } catch { return []; }
}

export function saveMotions(motions) { localStorage.setItem(STORAGE_KEY, JSON.stringify(motions)); }

export function addMotionExample(motions, word, sequence) {
  const label = word.trim().replace(/\s+/g, ' ').slice(0, 40);
  if (!label || !validMotion(sequence)) throw new Error('Informe a palavra e grave o movimento com as mãos visíveis.');
  const existing = motions.find(item => item.word.toLocaleLowerCase('pt-BR') === label.toLocaleLowerCase('pt-BR'));
  if (!existing && motions.length >= 40) throw new Error('O limite é de 40 sinais em movimento. Remova um cadastro para continuar.');
  if (existing?.examples.length >= 5) throw new Error('Este sinal já tem cinco exemplos. Remova o cadastro para recomeçar.');
  return existing ? motions.map(item => item === existing ? { ...item, examples: [...item.examples, sequence] } : item) : [...motions, { word: label, examples: [sequence] }];
}

export function motionDistance(a, b) {
  let previous = Array(b.length + 1).fill(Infinity);
  previous[0] = 0;
  for (let i = 1; i <= a.length; i += 1) {
    const current = Array(b.length + 1).fill(Infinity);
    for (let j = 1; j <= b.length; j += 1) {
      const cost = Math.sqrt(a[i - 1].reduce((sum, value, index) => sum + (value - b[j - 1][index]) ** 2, 0) / FRAME_SIZE);
      current[j] = cost + Math.min(current[j - 1], previous[j], previous[j - 1]);
    }
    previous = current;
  }
  return previous[b.length] / Math.max(a.length, b.length);
}

export function recognizeMotion(sequence, motions) {
  if (!validMotion(sequence)) return null;
  const candidates = motions.filter(item => item.examples.length >= 3).map(item => ({ word: item.word,
    distance: Math.min(...item.examples.map(example => motionDistance(sequence, example)))
  })).sort((a, b) => a.distance - b.distance);
  const [best, second] = candidates;
  if (!best || best.distance > 0.22 || (second && second.distance - best.distance < 0.06)) return null;
  return best.word;
}
