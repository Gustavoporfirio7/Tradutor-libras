import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {openCloudStore} from './cloud-store.mjs';
export async function configuredStore(env=process.env){
 if(env.TURSO_DATABASE_URL||env.TURSO_AUTH_TOKEN){return openCloudStore({url:env.TURSO_DATABASE_URL,authToken:env.TURSO_AUTH_TOKEN});}
 if(env.VERCEL)throw new Error('Configure o banco Turso nas variáveis de ambiente da Vercel.');
 mkdirSync('.data',{recursive:true});const {openStore}=await import('./store.mjs');return openStore(resolve('.data/efata.sqlite'));
}
