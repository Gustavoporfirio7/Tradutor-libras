import {refreshLearning,reviewedGroups,saveLearningExample,trainLearningModel,restoreLearningModel,predictLearnedMotion,watchLearning} from './learning';
beforeEach(()=>{global.fetch=jest.fn();});
test('exemplos pendentes e rejeitados não entram no reconhecimento',async()=>{
  const features=Array(63).fill(0.1);
  fetch.mockResolvedValue({ok:true,json:async()=>[
    {label:'A',kind:'static',features,status:'pending'},
    {label:'B',kind:'static',features,status:'rejected'},
    {label:'C',kind:'static',features,status:'reviewed'}
  ]});
  await refreshLearning();expect(reviewedGroups('static').map(item=>item.word)).toEqual(['C']);
});
test('uma falha na base não é confundida com exemplo salvo',async()=>{
  fetch.mockResolvedValue({ok:false,json:async()=>({error:'Exemplo inválido.'})});
  await expect(saveLearningExample({label:'A',kind:'static',features:[]})).rejects.toThrow('Exemplo inválido');
});
test('treina, salva e restaura uma rede neural com dados sintéticos de duas classes',async()=>{
  const tf=require('@tensorflow/tfjs');await tf.setBackend('cpu');await tf.ready();
  let saved=null;
  const examples=[];
  for(const [label,sign] of [['Movimento um',1],['Movimento dois',-1]]){
    for(let sample=0;sample<3;sample+=1)examples.push({id:`${label}-${sample}`,label,kind:'motion',status:'reviewed',features:Array.from({length:16},(_,frame)=>Array.from({length:68},(_,coordinate)=>sign*(3+frame*0.03+coordinate*0.001)+sample*0.02))});
  }
  fetch.mockImplementation(async(url,options)=>{
    if(url.endsWith('/examples'))return {ok:true,json:async()=>examples};
    if(url.endsWith('/model')&&options.method==='POST'){saved={...JSON.parse(options.body),id:'trained-test',createdAt:new Date().toISOString()};return {ok:true,json:async()=>saved};}
    if(url.endsWith('/model'))return {ok:true,json:async()=>saved};
    throw new Error('Rota inesperada.');
  });
  const model=await trainLearningModel();
  expect(model.labels).toEqual(['Movimento dois','Movimento um']);
  expect(saved.artifacts.weightData.length).toBeGreaterThan(100);
  expect(saved.trainingIds).toHaveLength(4);expect(saved.validationIds).toHaveLength(2);
  expect(saved.trainingIds.some(id=>saved.validationIds.includes(id))).toBe(false);
  expect(predictLearnedMotion(examples[0].features)).toBe('Movimento um');
  saved.id='restored-copy';
  expect(await restoreLearningModel()).toMatchObject({id:'restored-copy'});
  expect(predictLearnedMotion(examples[0].features)).toBe('Movimento um');
},30000);

test('carrega todas as páginas da base online e exclui contribuições pendentes',async()=>{
 const features=Array(63).fill(.1);
 fetch.mockImplementation(async url=>({ok:true,json:async()=>url.includes('offset=50')?{items:[{id:'b',label:'B',kind:'static',features,status:'reviewed'}],nextOffset:null}:{items:[{id:'a',label:'A',kind:'static',features,status:'pending'}],nextOffset:50}}));
 expect(await refreshLearning()).toHaveLength(2);expect(reviewedGroups('static').map(row=>row.word)).toEqual(['B']);
 expect(fetch.mock.calls.map(([url])=>url)).toEqual(['/api/learning/examples','/api/learning/examples?offset=50']);
});
test('busca novas revisões em outra página e libera a atualização periódica ao sair',async()=>{
 jest.useFakeTimers();const tick=async ms=>{jest.advanceTimersByTime(ms);for(let i=0;i<12;i++)await Promise.resolve();};let revision='one';let examples=[];
 fetch.mockImplementation(async url=>({ok:true,json:async()=>url.endsWith('/revision')?{revision}:url.endsWith('/model')?null:examples}));
 const updated=jest.fn();const stop=watchLearning(updated);
 try{
  await tick(0);expect(updated).toHaveBeenCalledTimes(1);
  await tick(15000);expect(updated).toHaveBeenCalledTimes(1);
  revision='two';examples=[{id:'new',label:'Oi',kind:'static',features:Array(63).fill(.2),status:'reviewed'}];
  await tick(15000);expect(updated).toHaveBeenCalledTimes(2);expect(reviewedGroups('static')[0].word).toBe('Oi');
  stop();await tick(30000);expect(updated).toHaveBeenCalledTimes(2);
 }finally{stop();jest.useRealTimers();}
});
