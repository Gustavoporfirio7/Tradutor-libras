import {createClient} from '@libsql/client/web';
import {createHash,randomUUID} from 'node:crypto';
import {validFeatures} from './validation.mjs';

export const CLOUD_SCHEMA=[
 `CREATE TABLE IF NOT EXISTS examples (id TEXT PRIMARY KEY, label TEXT NOT NULL, label_key TEXT NOT NULL, kind TEXT NOT NULL, features TEXT NOT NULL, description TEXT NOT NULL, source TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', digest TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(label_key,kind,digest))`,
 `CREATE TABLE IF NOT EXISTS references_docs (id TEXT PRIMARY KEY,name TEXT NOT NULL,content BLOB NOT NULL,text TEXT NOT NULL,pages INTEGER NOT NULL,created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS models (id TEXT PRIMARY KEY,data TEXT NOT NULL,created_at TEXT NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS contribution_limits (client_hash TEXT PRIMARY KEY,window_start INTEGER NOT NULL,count INTEGER NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS learning_revision (id INTEGER PRIMARY KEY CHECK(id=1),value INTEGER NOT NULL)`,
 `INSERT OR IGNORE INTO learning_revision VALUES (1,0)`,
 ...['examples','references_docs','models'].flatMap(table=>['INSERT','UPDATE','DELETE'].map(action=>`CREATE TRIGGER IF NOT EXISTS revision_${table}_${action} AFTER ${action} ON ${table} BEGIN UPDATE learning_revision SET value=value+1 WHERE id=1; END`))
];
const parse=row=>({id:row.id,label:row.label,kind:row.kind,features:JSON.parse(row.features),description:row.description,source:JSON.parse(row.source),status:row.status,createdAt:row.created_at});
export async function openCloudStore({url,authToken,client}={}){
 if(!client){
  if(!url||!authToken)throw new Error('Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN no servidor.');
  if(!['libsql:','https:'].includes(new URL(url).protocol))throw new Error('A URL do Turso deve usar libsql:// ou https://.');
 }
 const db=client||createClient({url,authToken});
 const execute=(sql,args=[],target=db)=>target.execute({sql,args});
 // Serialized initialization; CREATE IF NOT EXISTS also handles concurrent cold starts.
 await db.batch(CLOUD_SCHEMA,'write');
 let writeTail=Promise.resolve();
 const write=async action=>{
  for(let attempt=0;;attempt++){
   let tx;
   try{tx=await db.transaction('write');const result=await action(tx);await tx.commit();return result;}
   catch(error){if(tx)try{await tx.rollback();}catch{}if(!String(error.code||'').startsWith('SQLITE_BUSY')||attempt>=2)throw error;await new Promise(resolve=>setTimeout(resolve,100*(attempt+1)));}
   finally{tx?.close();}
  }
 };
 const transaction=action=>{const job=writeTail.then(()=>write(action));writeTail=job.catch(()=>{});return job;};
 const store={
  storage:'turso-cloud',close:()=>db.close(),
  async list(){return (await execute('SELECT * FROM examples ORDER BY created_at DESC,id DESC')).rows.map(parse);},
  async page({offset=0,limit=50,reviewedOnly=false}={}){return (await execute(`SELECT * FROM examples ${reviewedOnly?"WHERE status='reviewed'":''} ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`,[limit,offset])).rows.map(parse);},
  async revision(){return String((await execute('SELECT value FROM learning_revision WHERE id=1')).rows[0].value);},
  async add(input){
   const label=typeof input.label==='string'?input.label.normalize('NFC').trim().replace(/\s+/g,' '):'';
   if(!label||label.length>40||/[\u0000-\u001f]/.test(label)||!validFeatures(input.kind,input.features))throw new Error('Informe um significado válido e um exemplo completo do sinal.');
   const features=JSON.stringify(input.features),digest=createHash('sha256').update(features).digest('hex'),key=label.toLocaleLowerCase('pt-BR');
   return transaction(async tx=>{
    const existing=(await execute('SELECT * FROM examples WHERE label_key=? AND kind=? AND digest=?',[key,input.kind,digest],tx)).rows[0];
    if(existing)return {...parse(existing),duplicate:true};
    if(Number((await execute('SELECT COUNT(*) AS n FROM examples',[],tx)).rows[0].n)>=2000)throw new Error('A base atingiu o limite de 2000 exemplos.');
    const canonical=(await execute('SELECT label FROM examples WHERE label_key=? LIMIT 1',[key],tx)).rows[0]?.label||label;
    const id=randomUUID(),createdAt=new Date().toISOString();
    const description=String(input.description||'').slice(0,2000);
    const source={type:input.source?.type==='video'?'video':'camera',name:String(input.source?.name||'').slice(0,200),start:Number(input.source?.start)||0,end:Number(input.source?.end)||0};
    await execute('INSERT INTO examples VALUES (?,?,?,?,?,?,?,?,?,?)',[id,canonical,key,input.kind,features,description,JSON.stringify(source),'pending',digest,createdAt],tx);
    return {id,label:canonical,kind:input.kind,features:input.features,description,source,status:'pending',createdAt};
   });
  },
  async review(id,status){
   if(!['reviewed','rejected','pending'].includes(status))throw new Error('Estado de revisão inválido.');
   return transaction(async tx=>{
    await execute('UPDATE examples SET status=? WHERE id=?',[status,id],tx);
    const row=(await execute('SELECT * FROM examples WHERE id=?',[id],tx)).rows[0];return row?parse(row):null;
   });
  },
  async references(){return (await execute('SELECT id,name,pages,created_at AS createdAt,length(content) AS bytes,substr(text,1,500) AS preview FROM references_docs ORDER BY created_at DESC')).rows;},
  async reference(id){return (await execute('SELECT * FROM references_docs WHERE id=?',[id])).rows[0];},
  async addReference(name,content,text,pages){
   const id=randomUUID();await execute('INSERT INTO references_docs VALUES (?,?,?,?,?,?)',[id,String(name).slice(0,200),new Uint8Array(content),String(text).slice(0,500000),pages,new Date().toISOString()]);
   return {id,name,pages,characters:text.length};
  },
  async saveModel(data){
   if(!Array.isArray(data.labels)||data.labels.length<2||data.labels.length>100||!data.artifacts?.modelTopology||!Array.isArray(data.artifacts.weightSpecs)||typeof data.artifacts.weightData!=='string'||data.artifacts.weightData.length>2000000||!Array.isArray(data.sampleIds)||data.sampleIds.length>2000)throw new Error('Modelo inválido.');
   return transaction(async tx=>{
    const all=(await execute("SELECT id,label FROM examples WHERE status='reviewed' AND kind='motion'",[],tx)).rows;
    const selected=all.filter(row=>data.sampleIds.includes(row.id));
    if(selected.length!==data.sampleIds.length||data.labels.some(label=>selected.filter(row=>row.label===label).length<3))throw new Error('Treine com pelo menos três movimentos revisados de cada uma das duas ou mais palavras.');
    const id=randomUUID(),createdAt=new Date().toISOString();await execute('INSERT INTO models VALUES (?,?,?)',[id,JSON.stringify(data),createdAt],tx);return {id,createdAt,labels:data.labels};
   });
  },
  async model(){const row=(await execute('SELECT * FROM models ORDER BY created_at DESC,id DESC LIMIT 1')).rows[0];return row?{id:row.id,createdAt:row.created_at,...JSON.parse(row.data)}:null;},
  async acceptContribution(clientHash){
   return transaction(async tx=>{
    const now=Date.now(),duration=3600000;
    await execute('DELETE FROM contribution_limits WHERE window_start<?',[now-duration],tx);
    const row=(await execute('SELECT * FROM contribution_limits WHERE client_hash=?',[clientHash],tx)).rows[0];
    if(row&&Number(row.count)>=30)return false;
    if(row)await execute('UPDATE contribution_limits SET count=count+1 WHERE client_hash=?',[clientHash],tx);
    else await execute('INSERT INTO contribution_limits VALUES (?,?,?)',[clientHash,now,1],tx);
    return true;
   });
  },
  // Migration preserves IDs, review states and timestamps. Conflicts never overwrite cloud reviews.
  async importRows(tables){
   const definitions={examples:['id','label','label_key','kind','features','description','source','status','digest','created_at'],references_docs:['id','name','content','text','pages','created_at'],models:['id','data','created_at']};
   const result={};
   for(const [table,columns] of Object.entries(definitions)){
    let count=0;for(const row of tables[table]||[]){
     const args=columns.map(key=>key==='content'?new Uint8Array(row[key]):row[key]);
     const inserted=await execute(`INSERT OR IGNORE INTO ${table} (${columns.join(',')}) VALUES (${columns.map(()=>'?').join(',')})`,args);count+=inserted.rowsAffected;
    }result[table]=count;
   }return result;
  }
 };
 return store;
}
