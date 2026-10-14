import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {openStore} from './store.mjs';
import {createAPI} from './api.mjs';
test('API local salva, revisa, consulta, exporta e bloqueia origens externas',async()=>{
  const store=openStore(':memory:');const server=createAPI(store,async()=>({text:'Referência de Libras',pages:1}),'test-admin-key');
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const url=`http://127.0.0.1:${server.address().port}/api/learning`;
  const post=(path,data,method='POST')=>fetch(url+path,{method,headers:{'Content-Type':'application/json','X-Efata-Admin':'test-admin-key'},body:JSON.stringify(data)});
  try {
    const response=await post('/examples',{label:'A',kind:'static',features:Array(63).fill(0.2)});assert.equal(response.status,201);
    const example=await response.json();assert.equal(example.status,'pending');
    assert.equal((await fetch(url+'/examples').then(r=>r.json())).length,0);
    for(const path of ['/admin','/references','/export']) assert.equal((await fetch(url+path)).status,401);
    assert.equal((await fetch(url+`/examples/${example.id}/review`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'reviewed'})})).status,401);
    assert.equal((await fetch(url+'/model',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);

    assert.equal((await post(`/examples/${example.id}/review`,{status:'reviewed'},'PATCH')).status,200);
    const visible=(await(await fetch(url+'/examples')).json())[0];assert.equal(visible.status,'reviewed');assert.equal(visible.description,undefined);assert.equal(visible.source,undefined);
    const contribution=await fetch(url+'/examples',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({label:'Novo sinal',kind:'static',features:Array(63).fill(.4),status:'reviewed',source:{type:'video',name:'forged.mp4'}})}).then(r=>r.json());
    assert.equal(contribution.status,'pending');
    const pending=store.list().find(item=>item.id===contribution.id);assert.equal(pending.status,'pending');assert.equal(pending.source.type,'camera');
    assert.equal((await fetch(url+'/examples').then(r=>r.json())).length,1);
    assert.equal((await fetch(url+'/examples',{headers:{Origin:'https://external.example'}})).status,403);
    assert.equal((await post('/examples',{label:'Bad',kind:'motion',features:[]})).status,400);
    assert.equal((await post('/references',{name:'bad.pdf',data:Buffer.from('not pdf').toString('base64')})).status,400);
    const document=await(await post('/references',{name:'reference.pdf',data:Buffer.from('%PDF-test fixture').toString('base64')})).json();
    assert.equal((await(await fetch(url+`/references/${document.id}`,{headers:{'X-Efata-Admin':'test-admin-key'}})).json()).text,'Referência de Libras');
    const exported=await(await fetch(url+'/export',{headers:{'X-Efata-Admin':'test-admin-key'}})).json();assert.equal(exported.examples.length,2);assert.equal(exported.references.length,1);
    assert.equal((await fetch(url+'/model')).status,200);
  } finally{await new Promise(resolve=>server.close(resolve));store.close();}
});
