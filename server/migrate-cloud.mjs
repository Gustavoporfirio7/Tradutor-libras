import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
import {openCloudStore} from './cloud-store.mjs';
const path=resolve(process.argv.slice(2).find(value=>!value.startsWith('--'))||'.data/efata.sqlite');
const db=new DatabaseSync(path,{readOnly:true});
let remote;
try{
 const tables={};for(const table of ['examples','references_docs','models'])tables[table]=db.prepare(`SELECT * FROM ${table}`).all();
 if(process.argv.includes('--check')){console.log(JSON.stringify({source:path,examples:tables.examples.length,references:tables.references_docs.length,models:tables.models.length,onlineConfigured:!!(process.env.TURSO_DATABASE_URL&&process.env.TURSO_AUTH_TOKEN)}));}
 else{
  remote=await openCloudStore({url:process.env.TURSO_DATABASE_URL,authToken:process.env.TURSO_AUTH_TOKEN});
  const inserted=await remote.importRows(tables);
  console.log(JSON.stringify({inserted,cloudExamples:(await remote.list()).length,message:'Migração concluída. A base local foi preservada. Reexecutar não duplica os mesmos registros.'}));
 }
}finally{db.close();remote?.close();}
