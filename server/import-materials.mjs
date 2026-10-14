// Offline developer import: node server/import-materials.mjs raw-segments.json reference.pdf
import {readFileSync, mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {configuredStore} from './configured-store.mjs';
import {parseReferencePdf} from './pdf.mjs';
const moduleFromFile=async path=>import(`data:text/javascript;base64,${readFileSync(path).toString('base64')}`);
const {normalizeMotion}=await moduleFromFile('src/utils/motionVocabulary.js');
const {handFeatures,validExample}=await moduleFromFile('src/utils/vocabulary.js');
mkdirSync('.data',{recursive:true});const store=await configuredStore();
let motion=0,posture=0;const skipped=[];
try{
 if(process.argv[2])for(const clip of JSON.parse(readFileSync(process.argv[2],'utf8'))){
  const source={type:'video',name:clip.name,start:clip.start,end:clip.end};
  const features=normalizeMotion(clip.frames);
  if(features){const saved=await store.add({label:clip.label,kind:'motion',features,source,description:'Trecho separado pela letra exibida no vídeo. Conferir pontos e significado antes de aprovar.'});if(!saved.duplicate)motion++;}else skipped.push(`${clip.name}: ${clip.label}`);
  if(!['Ç','H','J','K','X','Y','Z'].includes(clip.label))for(const i of [5,8,11]){
   const hands=clip.frames[i]?.hands.filter(Boolean)||[];if(hands.length!==1)continue;
   const vector=handFeatures(hands[0]);if(!validExample(vector))continue;
   const saved=await store.add({label:clip.label,kind:'static',features:vector,source:{...source,start:clip.frames[i].time/1000,end:clip.frames[i].time/1000},description:'Postura extraída do vídeo. Quadros do mesmo vídeo não são pessoas independentes para avaliar precisão.'});if(!saved.duplicate)posture++;
  }
 }
 if(process.argv[3]){
  const path=resolve(process.argv[3]);const name=path.split(/[\\/]/).pop();
  if(!(await store.references()).some(row=>row.name===name)){
   const bytes=readFileSync(path);const pdf=await parseReferencePdf(bytes);await store.addReference(name,bytes,pdf.text,pdf.pages);console.log(JSON.stringify({reference:name,pages:pdf.pages,characters:pdf.text.length}));
  }
 }
 console.log(JSON.stringify({newMotionExamples:motion,newPostureExamples:posture,skipped,pending:(await store.list()).filter(row=>row.status==='pending').length}));
}finally{store.close();}
