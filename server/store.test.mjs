import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,unlinkSync,rmdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openStore} from './store.mjs';

test('exemplos persistem ao reabrir o banco, começam pendentes e duplicatas não aumentam a base',()=>{
  const dir=mkdtempSync(join(tmpdir(),'efata-db-test-'));const path=join(dir,'test.sqlite');
  let store=openStore(path);
  try {
    const input={label:'Oi',kind:'static',features:Array(63).fill(0.1),source:{type:'camera'}};
    const saved=store.add(input);assert.equal(saved.status,'pending');
    assert.equal(store.add({...input,label:'oi'}).duplicate,true);assert.equal(store.list().length,1);
    store.close();store=openStore(path);assert.equal(store.list()[0].label,'Oi');
    store.review(saved.id,'reviewed');assert.equal(store.list()[0].status,'reviewed');
    store.review(saved.id,'rejected');assert.equal(store.list()[0].status,'rejected');
  } finally {store.close();for(const name of ['test.sqlite','test.sqlite-wal','test.sqlite-shm']){try{unlinkSync(join(dir,name));}catch{}}rmdirSync(dir);}
});
test('não aceita dados degenerados, estado inválido ou um modelo treinado com exemplos pendentes',()=>{
  const store=openStore(':memory:');
  try {
    assert.throws(()=>store.add({label:'',kind:'static',features:[]}));
    assert.throws(()=>store.add({label:'Oi',kind:'motion',features:Array(16).fill(Array(68).fill(NaN))}));
    assert.throws(()=>store.review('missing','approved'));
    const sequence=Array.from({length:16},()=>Array(68).fill(0.1));
    const first=store.add({label:'Oi',kind:'motion',features:sequence});
    const second=store.add({label:'Tchau',kind:'motion',features:sequence});
    assert.throws(()=>store.saveModel({labels:['Oi','Tchau'],sampleIds:[first.id,second.id],artifacts:{modelTopology:{},weightSpecs:[],weightData:'AA=='}}),/três movimentos revisados/);
  } finally{store.close();}
});
test('guarda a versão do modelo somente após revisar os exemplos necessários',()=>{
  const store=openStore(':memory:');
  try {
    const ids=[];
    for(const [label,sign] of [['Oi',1],['Tchau',-1]])for(let i=0;i<3;i+=1){
      const features=Array.from({length:16},()=>Array(68).fill(sign*(0.1+i*0.01)));
      const row=store.add({label,kind:'motion',features});store.review(row.id,'reviewed');ids.push(row.id);
    }
    const saved=store.saveModel({labels:['Oi','Tchau'],sampleIds:ids,artifacts:{modelTopology:{format:'test-fixture'},weightSpecs:[],weightData:'AAAA'}});
    assert.equal(store.model().id,saved.id);assert.deepEqual(store.model().sampleIds,ids);assert.equal(store.model().artifacts.weightData,'AAAA');
  }finally{store.close();}
});
