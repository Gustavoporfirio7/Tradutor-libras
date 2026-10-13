import { classifyAlphabet, ALPHABET, MOTION_LETTERS } from './alphabet';

function hand(fingers, thumb=false) {
  const points = Array.from({length:21},()=>({x:0,y:0,z:0}));
  [[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]].forEach((ids,finger)=>{
    const x=(finger-1.5)*0.6;
    ids.forEach((id,joint)=>{points[id]={x,y:fingers[finger]?1+joint*0.5:[1,1.3,1,0.8][joint],z:0};});
  });
  points[2]={x:-0.5,y:0.4,z:0}; points[3]={x:-0.7,y:0.6,z:0};
  points[4]=thumb?{x:-1.6,y:1.5,z:0}:{x:-0.3,y:0.8,z:0};
  return points;
}

test.each([
  [[true,true,true,true],false,'B'],
  [[false,false,false,true],false,'I'],
  [[true,false,false,false],true,'L'],
  [[true,true,true,false],false,'W'],
  [[true,true,false,false],false,'V']
])('identifica configurações iniciais distintas', (fingers,thumb,letter)=>{
  expect(classifyAlphabet(hand(fingers,thumb))).toBe(letter);
});

test('recusa dados inválidos e evita inventar a letra de um punho fechado', ()=>{
  expect(classifyAlphabet(null)).toBeNull();
  expect(classifyAlphabet([])).toBeNull();
  expect(classifyAlphabet(hand([false,false,false,false]))).toBeNull();
});

test('o cadastro inclui as 26 letras e Ç, com movimento separado', ()=>{
  expect(ALPHABET).toHaveLength(27);
  expect(MOTION_LETTERS).toEqual(expect.arrayContaining(['Ç','J','Z']));
});

test('diferencia a pinça de F e a união dos dedos em U',()=>{
  const f=hand([false,true,true,true]);
  f[4]={...f[8]};
  expect(classifyAlphabet(f)).toBe('F');
  const u=hand([true,true,false,false]);
  u[8]={x:-0.65,y:2.5,z:0};
  u[12]={x:-0.5,y:2.5,z:0};
  expect(classifyAlphabet(u)).toBe('U');
});
