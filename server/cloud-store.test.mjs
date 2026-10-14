import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@libsql/client';
import {openCloudStore} from './cloud-store.mjs';
import {cloudOptions,normalizeApiUrl} from '../api/learning.mjs';
import {createAPI,createHandler} from './api.mjs';
import {once} from 'node:events';
import {openStore} from './store.mjs';
import {request} from 'node:http';
function requestHTTP(url,options={}){return new Promise((resolve,reject)=>{const req=request(url,{method:options.method||'GET',headers:options.headers},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,json:async()=>JSON.parse(Buffer.concat(chunks).toString())}));});req.on('error',reject);req.end(options.body);});}

test('adaptador assíncrono preserva contribuição pendente, revisão, páginas e versão',async()=>{
 const store=await openCloudStore({client:createClient({url:':memory:'})});
 try{
  const revision=await store.revision();const input={label:'Oi',kind:'static',features:Array(63).fill(.2)};
  const saved=await store.add(input);assert.equal(saved.status,'pending');assert.notEqual(await store.revision(),revision);
  assert.equal((await store.add({...input,label:'oi'})).duplicate,true);
  const simultaneous=await Promise.all([store.add({label:'B',kind:'static',features:Array(63).fill(.3)}),store.add({label:'B',kind:'static',features:Array(63).fill(.3)})]);
  assert.equal(simultaneous.filter(row=>row.duplicate).length,1);assert.equal(simultaneous[0].id,simultaneous[1].id);
  assert.equal((await store.page({reviewedOnly:true})).length,0);
  await store.review(saved.id,'reviewed');assert.equal((await store.page({reviewedOnly:true}))[0].id,saved.id);
  await store.review(saved.id,'rejected');assert.equal((await store.page({reviewedOnly:true})).length,0);
  await assert.rejects(store.saveModel({labels:['A','B'],sampleIds:[saved.id],artifacts:{modelTopology:{},weightSpecs:[],weightData:'AA=='}}),/três movimentos revisados/);
  const pdf=await store.addReference('referencia.pdf',Buffer.from('%PDF- test'),'Descrição',1);assert.equal((await store.reference(pdf.id)).text,'Descrição');
  for(let i=0;i<30;i++)assert.equal(await store.acceptContribution('hashed-client'),true);
  assert.equal(await store.acceptContribution('hashed-client'),false);assert.equal(await store.acceptContribution('another-client'),true);
 }finally{store.close();}
});
test('migração mantém identificadores, revisão e PDF, e pode ser repetida sem duplicar',async()=>{
 const source=openStore(':memory:');const target=await openCloudStore({client:createClient({url:':memory:'})});
 try{
  const input=source.add({label:'A',kind:'static',features:Array(63).fill(.2),source:{type:'video',name:'alfabeto.mp4'}});
  const tables={examples:[{id:input.id,label:'A',label_key:'a',kind:'static',features:JSON.stringify(input.features),description:'',source:JSON.stringify(input.source),status:'pending',digest:'test-digest',created_at:input.createdAt}],references_docs:[{id:'pdf-test',name:'referencia.pdf',content:Buffer.from('%PDF- fixture'),text:'Libras',pages:1,created_at:input.createdAt}],models:[]};
  assert.deepEqual(await target.importRows(tables),{examples:1,references_docs:1,models:0});
  await target.review(input.id,'reviewed');
  assert.deepEqual(await target.importRows(tables),{examples:0,references_docs:0,models:0});
  assert.equal((await target.list())[0].status,'reviewed');assert.equal((await target.list())[0].id,input.id);
  assert.equal(Buffer.from((await target.reference('pdf-test')).content).toString(),'%PDF- fixture');
 }finally{source.close();target.close();}
});
test('API online aceita domínio configurado e impede revisão ou leitura privada sem chave',async()=>{
 const store=await openCloudStore({client:createClient({url:':memory:'})});
 const key='a'.repeat(64);const api=createAPI(store,async()=>({text:'PDF',pages:1}),key,{production:true,origins:['https://tradutor-libras.vercel.app']});
 api.listen(0,'127.0.0.1');await once(api,'listening');const base=`http://127.0.0.1:${api.address().port}/api/learning`;
 const headers={Host:'tradutor-libras.vercel.app',Origin:'https://tradutor-libras.vercel.app','Content-Type':'application/json'};
 try{
  assert.equal((await requestHTTP(base+'/health',{headers})).status,200);
  assert.equal((await requestHTTP(base+'/admin',{headers})).status,401);
  assert.equal((await requestHTTP(base+'/health',{headers:{...headers,Origin:'https://attacker.example'}})).status,403);
  assert.equal((await requestHTTP(base+'/health',{headers:{...headers,Host:'attacker.example'}})).status,403);
  const row=await requestHTTP(base+'/examples',{method:'POST',headers,body:JSON.stringify({label:'A',kind:'static',features:Array(63).fill(.2),status:'reviewed'})}).then(r=>r.json());
  assert.equal(row.status,'pending');assert.deepEqual((await requestHTTP(base+'/examples',{headers}).then(r=>r.json())).items,[]);
  const admin={...headers,'X-Efata-Admin':key};
  assert.equal((await requestHTTP(base+`/examples/${row.id}/review`,{method:'PATCH',headers,body:'{"status":"reviewed"}'})).status,401);
  assert.equal((await requestHTTP(base+`/examples/${row.id}/review`,{method:'PATCH',headers:admin,body:'{"status":"reviewed"}'})).status,200);
  assert.equal((await requestHTTP(base+'/examples',{headers}).then(r=>r.json())).items[0].label,'A');
  assert.equal((await requestHTTP(base+'/examples',{headers}).then(r=>r.json())).items[0].source,undefined);
  assert.equal((await requestHTTP(base+'/examples?offset=-1',{headers:admin})).status,400);
  assert.equal((await requestHTTP(base+'/export',{headers:admin}).then(r=>r.json())).paginated,true);
 }finally{await new Promise(resolve=>api.close(resolve));store.close();}
});
test('Vercel exige credenciais privadas e origens HTTPS antes de abrir a base',()=>{
 assert.throws(()=>cloudOptions({}),/endereço/);
 const env={VERCEL_PROJECT_PRODUCTION_URL:'tradutor-libras.vercel.app',EFATA_ADMIN_KEY:'x'.repeat(64),TURSO_DATABASE_URL:'libsql://example.turso.io',TURSO_AUTH_TOKEN:'test-token'};
 assert.deepEqual(cloudOptions(env).origins,['https://tradutor-libras.vercel.app']);
 assert.throws(()=>cloudOptions({...env,EFATA_ADMIN_KEY:''}),/EFATA_ADMIN_KEY/);
 assert.throws(()=>cloudOptions({...env,TURSO_AUTH_TOKEN:''}),/credenciais/);
 assert.throws(()=>cloudOptions({...env,EFATA_ALLOWED_ORIGINS:'http://example.com'}),/HTTPS/);
});
test('reescrita da Vercel preserva rotas e páginas, e aceita corpo JSON já analisado',async()=>{
 assert.equal(normalizeApiUrl('/api/learning?route=examples&offset=50'),'/api/learning/examples?offset=50');
 assert.equal(normalizeApiUrl('/api/learning?route=examples%2Fabc%2Freview'),'/api/learning/examples/abc/review');
 assert.equal(normalizeApiUrl('/api/learning/model'),'/api/learning/model');
 const store=await openCloudStore({client:createClient({url:':memory:'})});
 try{
  const req={url:normalizeApiUrl('/api/learning?route=examples'),method:'POST',headers:{host:'tradutor-libras.vercel.app',origin:'https://tradutor-libras.vercel.app','content-type':'application/json'},socket:{remoteAddress:'127.0.0.1'},body:{label:'A',kind:'static',features:Array(63).fill(.2)}};
  let status,data;const res={writeHead:code=>{status=code;},end:value=>{data=JSON.parse(value);}};
  await createHandler(store,async()=>{},'x'.repeat(64),{production:true,origins:['https://tradutor-libras.vercel.app']})(req,res);
  assert.equal(status,201);assert.equal(data.status,'pending');assert.equal((await store.list()).length,1);
 }finally{store.close();}
});
