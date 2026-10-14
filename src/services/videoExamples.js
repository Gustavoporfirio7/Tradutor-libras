import {Hands} from '@mediapipe/hands';
import {motionFrame,normalizeMotion} from '../utils/motionVocabulary';
const waitEvent=(element,event,action)=>new Promise((resolve,reject)=>{
  const cleanup=()=>{clearTimeout(timeout);element.removeEventListener(event,done);element.removeEventListener('error',fail);};
  const done=()=>{cleanup();resolve();};const fail=()=>{cleanup();reject(new Error('Não foi possível ler este vídeo. Use MP4 ou WebM compatível com o navegador.'));};
  const timeout=setTimeout(fail,15000);element.addEventListener(event,done,{once:true});element.addEventListener('error',fail,{once:true});action();
});
export async function extractVideoExample(file,start,end,onProgress=()=>{},signal) {
  if(!file||file.size>100000000)throw new Error('Escolha um vídeo de até 100 MB.');
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end-start<1||end-start>10)throw new Error('Selecione um trecho entre 1 e 10 segundos, contendo apenas um sinal completo.');
  const url=URL.createObjectURL(file);const video=document.createElement('video');
  video.muted=true;video.playsInline=true;video.preload='auto';
  let hands;
  try {
    await waitEvent(video,'loadeddata',()=>{video.src=url;video.load();});
    if(end>video.duration)throw new Error('O trecho selecionado ultrapassa a duração do vídeo.');
    hands=new Hands({locateFile:name=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${name}`});
    hands.setOptions({maxNumHands:2,modelComplexity:1,minDetectionConfidence:0.7,minTrackingConfidence:0.7});
    let result;hands.onResults(value=>{result=value;});const frames=[];
    const count=Math.max(16,Math.ceil((end-start)*10));
    for(let i=0;i<count;i+=1){
      if(signal?.aborted)throw new Error('Importação cancelada.');
      const time=start+(end-start)*i/(count-1);
      if(Math.abs(video.currentTime-time)>0.002)await waitEvent(video,'seeked',()=>{video.currentTime=time;});
      result=null;await hands.send({image:video});
      frames.push(motionFrame(result||{},time*1000));onProgress(Math.round((i+1)/count*100));
    }
    const sequence=normalizeMotion(frames);
    if(!sequence)throw new Error('Não foi possível acompanhar as mãos no trecho. Use uma gravação nítida com o sinal inteiro visível.');
    return sequence;
  } finally {await hands?.close();video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
}
