import { handFeatures } from './vocabulary';
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').concat('Ç');
export const MOTION_LETTERS = ['Ç', 'H', 'J', 'K', 'X', 'Y', 'Z'];
export const INITIAL_LETTERS = ['B', 'F', 'I', 'L', 'U', 'V', 'W'];
export const isLetter = value => ALPHABET.includes(value);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
const angle = (a, b, c) => {
  const v = [a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0)];
  const w = [c.x-b.x,c.y-b.y,(c.z||0)-(b.z||0)];
  const length = Math.hypot(...v)*Math.hypot(...w);
  return length ? Math.acos(Math.max(-1,Math.min(1,v.reduce((sum,x,i)=>sum+x*w[i],0)/length)))*180/Math.PI : 0;
};

// Configurações iniciais conservadoras. As demais letras exigem exemplos reais.
export function classifyAlphabet(points) {
  if (!handFeatures(points)) return null;
  const scale = distance(points[0],points[9]);
  const extended = (base,joint,tip) => angle(points[base],points[joint],points[tip]) > 160 && distance(points[0],points[tip]) > distance(points[0],points[joint])*1.18;
  const [index,middle,ring,pinky] = [[5,6,8],[9,10,12],[13,14,16],[17,18,20]].map(ids=>extended(...ids));
  const thumbOpen = angle(points[2],points[3],points[4]) > 155 && distance(points[4],points[5]) > scale*0.7;
  if (!index && middle && ring && pinky && distance(points[4],points[8]) < scale*0.3) return 'F';
  if (index && middle && ring && pinky && !thumbOpen) return 'B';
  if (!index && !middle && !ring && pinky && !thumbOpen) return 'I';
  if (index && !middle && !ring && !pinky && thumbOpen) return 'L';
  if (index && middle && ring && !pinky && !thumbOpen) return 'W';
  if (index && middle && !ring && !pinky && !thumbOpen) {
    const separation = distance(points[8],points[12])/scale;
    const tipVector = { x:points[8].x-points[12].x,y:points[8].y-points[12].y,z:(points[8].z||0)-(points[12].z||0) };
    const baseVector = { x:points[5].x-points[9].x,y:points[5].y-points[9].y,z:(points[5].z||0)-(points[9].z||0) };
    if (tipVector.x*baseVector.x + tipVector.y*baseVector.y + tipVector.z*baseVector.z <= 0) return null; // Pode ser R: não presume U.
    if (separation < 0.22) return 'U';
    if (separation > 0.4) return 'V';
  }
  return null;
}
