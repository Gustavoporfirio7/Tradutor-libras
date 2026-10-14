import {createHandler} from '../server/api.mjs';
import {configuredStore} from '../server/configured-store.mjs';
import {parseReferencePdf} from '../server/pdf.mjs';
let initializing;
export function normalizeApiUrl(value){
 const url=new URL(value,'https://localhost');const route=url.searchParams.get('route');
 if(url.pathname==='/api/learning'&&route!==null){url.pathname=`/api/learning/${route}`;url.searchParams.delete('route');}
 return url.pathname+url.search;
}
export function cloudOptions(env=process.env){
 const origins=new Set((env.EFATA_ALLOWED_ORIGINS||'').split(',').map(value=>value.trim()).filter(Boolean));
 for(const value of [env.VERCEL_URL,env.VERCEL_PROJECT_PRODUCTION_URL])if(value)origins.add(`https://${value}`);
 for(const origin of origins){const url=new URL(origin);if(url.protocol!=='https:'||url.origin!==origin)throw new Error('Informe origens HTTPS completas em EFATA_ALLOWED_ORIGINS.');}
 if(!origins.size)throw new Error('Configure o endereço do site no servidor.');
 if(!env.EFATA_ADMIN_KEY||env.EFATA_ADMIN_KEY.length<32)throw new Error('Configure EFATA_ADMIN_KEY com pelo menos 32 caracteres no servidor.');
 if(!env.TURSO_DATABASE_URL||!env.TURSO_AUTH_TOKEN)throw new Error('Configure as credenciais do Turso no servidor.');
 return {production:true,origins:[...origins]};
}
export default async function handler(req,res){
 try{
  if(!initializing){const options=cloudOptions();initializing=configuredStore().then(store=>createHandler(store,parseReferencePdf,process.env.EFATA_ADMIN_KEY,options)).catch(error=>{initializing=null;throw error;});}
  const api=await initializing;
  req.url=normalizeApiUrl(req.url);
  return await api(req,res);
 }catch{
  res.writeHead(503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify({error:'A base online não está disponível. Os desenvolvedores precisam conferir a configuração do Turso e da Vercel.'}));
 }
}
