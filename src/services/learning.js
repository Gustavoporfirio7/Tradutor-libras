import { validExample } from '../utils/vocabulary';
import { validMotion, motionDistance } from '../utils/motionVocabulary';
let examples=[];
let network=null;
let tensorLibrary=null;
let modelInfo=null;
export const LEARNING_EVENT='efata-learning-updated';
let adminKey='';
export function setDeveloperKey(value){adminKey=value;}
export async function learningRequest(path,options={}) {
  if(typeof fetch!=='function') throw new Error('A base local está indisponível.');
  const response=await fetch(`/api/learning${path}`,{...options,headers:{'Content-Type':'application/json',...(adminKey?{'X-Efata-Admin':adminKey}:{}),...options.headers}});
  let data;
  try {data=await response.json();} catch {throw new Error('Não consegui conectar à base local. Verifique se ela está iniciada.');}
  if(!response.ok) throw new Error(data.error||'Não foi possível acessar a base local.');
  return data;
}
export async function refreshLearning() {
  let path='/examples';const rows=[];const seen=new Set();
  while(path){
    if(seen.has(path))throw new Error('A base retornou uma página repetida.');seen.add(path);
    const page=await learningRequest(path);
    if(Array.isArray(page)){rows.push(...page);path=null;}
    else if(Array.isArray(page?.items)){rows.push(...page.items);path=page.nextOffset===null?null:`/examples?offset=${page.nextOffset}`;}
    else throw new Error('A base retornou exemplos inválidos.');
    if(rows.length>2000||seen.size>41)throw new Error('A base retornou mais exemplos do que o limite permitido.');
  }
  examples=rows;return examples;
}
export function watchLearning(onUpdate=()=>{},onError=()=>{}){
  let active=true,running=false,revision=null;
  const sync=async(force=false)=>{
    if(!active||running)return;running=true;
    try{
      const version=await learningRequest('/revision');
      if(force||version.revision!==revision){await refreshLearning();await restoreLearningModel();revision=version.revision;if(active)onUpdate();}
    }catch(error){if(active)onError(error);}finally{running=false;}
  };
  const changed=()=>sync(true);const visible=()=>{if(document.visibilityState==='visible')sync();};
  sync(true);const timer=setInterval(visible,15000);
  window.addEventListener(LEARNING_EVENT,changed);window.addEventListener('focus',visible);document.addEventListener('visibilitychange',visible);
  return()=>{active=false;clearInterval(timer);window.removeEventListener(LEARNING_EVENT,changed);window.removeEventListener('focus',visible);document.removeEventListener('visibilitychange',visible);};
}
export function reviewedGroups(kind) {
  const groups=new Map();
  for(const item of examples) {
    if(item.status!=='reviewed' || item.kind!==kind || !(kind==='static'?validExample(item.features):validMotion(item.features))) continue;
    if(!groups.has(item.label)) groups.set(item.label,{word:item.label,examples:[]});
    groups.get(item.label).examples.push(item.features);
  }
  return [...groups.values()];
}
export async function saveLearningExample(input) {
  const saved=await learningRequest('/examples',{method:'POST',body:JSON.stringify(input)});
  await refreshLearning();
  window.dispatchEvent(new Event(LEARNING_EVENT));
  return saved;
}
const vector=sequence=>sequence.flat().map(value=>Math.max(-4,Math.min(4,value/8)));
const encode=buffer=>{
  const bytes=new Uint8Array(buffer);let binary='';
  for(let i=0;i<bytes.length;i+=8192) binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(binary);
};
const decode=value=>Uint8Array.from(atob(value),char=>char.charCodeAt(0)).buffer;

export async function restoreLearningModel() {
  const saved=await learningRequest('/model');
  if(!saved) {network?.dispose();network=null;modelInfo=null;return null;}
  const activeIds=new Set(examples.filter(item=>item.status==='reviewed').map(item=>item.id));
  if(saved.sampleIds.some(id=>!activeIds.has(id))) {network?.dispose();network=null;modelInfo=null;return null;}
  if(modelInfo?.id===saved.id) return modelInfo;
  const tf=await import('@tensorflow/tfjs');
  await tf.ready();
  const candidate=await tf.loadLayersModel(tf.io.fromMemory({...saved.artifacts,weightData:decode(saved.artifacts.weightData)}));
  network?.dispose(); network=candidate; tensorLibrary=tf; modelInfo=saved;
  return saved;
}

export async function trainLearningModel(onProgress=()=>{}) {
  await refreshLearning();
  const byLabel=new Map();
  examples.filter(item=>item.kind==='motion'&&item.status==='reviewed'&&validMotion(item.features)).forEach(item=>{
    if(!byLabel.has(item.label))byLabel.set(item.label,[]);byLabel.get(item.label).push(item);
  });
  const labels=[...byLabel.keys()].filter(label=>byLabel.get(label).length>=3).sort();
  if(labels.length<2) throw new Error('Cadastre e revise pelo menos três movimentos de cada uma de duas palavras diferentes.');
  const training=[];const validation=[];
  labels.forEach(label=>{
    const rows=byLabel.get(label).slice(0,25);
    validation.push(rows[rows.length-1]);training.push(...rows.slice(0,-1));
  });
  const tf=await import('@tensorflow/tfjs');await tf.ready();
  const candidate=tf.sequential();
  candidate.add(tf.layers.dense({inputShape:[1088],units:32,activation:'relu'}));
  candidate.add(tf.layers.dropout({rate:0.15}));
  candidate.add(tf.layers.dense({units:labels.length,activation:'softmax'}));
  candidate.compile({optimizer:tf.train.adam(0.005),loss:'categoricalCrossentropy',metrics:['accuracy']});
  const x=tf.tensor2d(training.map(item=>vector(item.features)));
  const y=tf.tensor2d(training.map(item=>labels.map(label=>label===item.label?1:0)));
  const vx=tf.tensor2d(validation.map(item=>vector(item.features)));
  const vy=tf.tensor2d(validation.map(item=>labels.map(label=>label===item.label?1:0)));
  let committed=false;
  try {
    await candidate.fit(x,y,{epochs:40,batchSize:Math.min(16,training.length),shuffle:true,validationData:[vx,vy],callbacks:{onEpochEnd:async(epoch)=>onProgress(Math.round((epoch+1)/40*100))}});
    const results=candidate.evaluate(vx,vy);
    const metrics=Array.isArray(results)?results:[results];
    const validationAccuracy=metrics.length>1?metrics[1].dataSync()[0]:null;
    metrics.forEach(metric=>metric.dispose());
    let artifacts;
    await candidate.save(tf.io.withSaveHandler(async data=>{
      artifacts={modelTopology:data.modelTopology,weightSpecs:data.weightSpecs,weightData:encode(data.weightData)};
      return {modelArtifactsInfo:{dateSaved:new Date(),modelTopologyType:'JSON',modelTopologyBytes:JSON.stringify(data.modelTopology).length,weightSpecsBytes:JSON.stringify(data.weightSpecs).length,weightDataBytes:data.weightData.byteLength}};
    }));
    const payload={labels,artifacts,sampleIds:[...training,...validation].map(item=>item.id),trainingIds:training.map(item=>item.id),validationIds:validation.map(item=>item.id),validationAccuracy,validationCount:validation.length,format:'efata-motion-dense-v1'};
    const saved=await learningRequest('/model',{method:'POST',body:JSON.stringify(payload)});
    network?.dispose();network=candidate;tensorLibrary=tf;modelInfo={...payload,...saved};committed=true;
    window.dispatchEvent(new Event(LEARNING_EVENT));
    return modelInfo;
  } finally {x.dispose();y.dispose();vx.dispose();vy.dispose();if(!committed)candidate.dispose();}
}

export function predictLearnedMotion(sequence) {
  if(!network || !validMotion(sequence))return null;
  const probabilities=tensorLibrary.tidy(()=>network.predict(tensorLibrary.tensor2d([vector(sequence)])).dataSync());
  const ranked=Array.from(probabilities,(score,index)=>({score,index})).sort((a,b)=>b.score-a.score);
  if(ranked[0].score<0.8 || ranked[0].score-ranked[1].score<0.2)return null;
  const label=modelInfo.labels[ranked[0].index];
  const group=reviewedGroups('motion').find(item=>item.word===label);
  if(!group || group.examples.length<3 || Math.min(...group.examples.map(example=>motionDistance(sequence,example)))>0.25)return null;
  return label;
}
