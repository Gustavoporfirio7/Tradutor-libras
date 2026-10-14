import http from 'node:http';
import { timingSafeEqual,createHmac,createHash } from 'node:crypto';
export function createHandler(store, parsePdf, adminKey, options={}) {
  const send=(res,status,value)=>{ res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); res.end(JSON.stringify(value)); };
  const body=async req=>{
    if (!req.headers['content-type']?.startsWith('application/json')) throw new Error('Envie dados em JSON.');
    const maxBytes=options.production?4200000:15000000;
    if(req.body!==undefined){const data=typeof req.body==='string'?JSON.parse(req.body):req.body;if(Buffer.byteLength(JSON.stringify(data))>maxBytes)throw new Error('Arquivo ou pedido muito grande.');return data;}
    let bytes=0; const chunks=[];
    for await (const chunk of req) { bytes+=chunk.length; if(bytes>maxBytes) throw new Error('Arquivo ou pedido muito grande.'); chunks.push(chunk); }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  };
  return async(req,res)=>{
    const origin=req.headers.origin;
    const allowed=new Set(['http://localhost:3000','http://localhost:3001','http://127.0.0.1:3000','http://127.0.0.1:3001']);
    const address=req.socket.localPort;
    allowed.add(`http://127.0.0.1:${address}`); allowed.add(`http://localhost:${address}`);
    for(const item of options.origins||[])allowed.add(item);
    if(options.production)for(const item of [...allowed])if(item.startsWith('http://'))allowed.delete(item);
    if(origin && !allowed.has(origin)) return send(res,403,{error:'Origem não autorizada para a base local.'});
    const host=(req.headers.host||'').split(':')[0];
    const hosts=options.production?(options.origins||[]).map(value=>new URL(value).hostname):['localhost','127.0.0.1'];
    if(!hosts.includes(host))return send(res,403,{error:'Endereço não autorizado para esta base.'});
    const url=new URL(req.url,'http://localhost');const path=url.pathname;
    const supplied=Buffer.from(String(req.headers['x-efata-admin']||''));
    const expected=Buffer.from(String(adminKey||''));
    const admin=expected.length>0 && supplied.length===expected.length && timingSafeEqual(supplied,expected);
    const restricted=path.includes('/references') || path.endsWith('/export') || path.endsWith('/admin') || path.endsWith('/review') || (path.endsWith('/model') && req.method!=='GET');
    if(restricted && !admin) return send(res,401,{error:'Informe a chave dos desenvolvedores para acessar esta área.'});
    try {
      if(req.method==='GET' && path==='/api/learning/admin') return send(res,200,{ok:true});
      if(req.method==='GET' && path==='/api/learning/health') return send(res,200,{ok:true,storage:store.storage||'sqlite-local',maxPdfBytes:options.production?3000000:10000000});
      if(req.method==='GET' && path==='/api/learning/revision'){
        const revision=store.revision?await store.revision():createHash('sha256').update(JSON.stringify({examples:(await store.list()).map(row=>[row.id,row.status]),model:(await store.model())?.id})).digest('hex');
        return send(res,200,{revision});
      }
      if(req.method==='GET' && path==='/api/learning/examples') {
        const rawOffset=Number(url.searchParams.get('offset')||0);if(!Number.isSafeInteger(rawOffset)||rawOffset<0)throw new Error('Página inválida.');
        const rows=store.page?await store.page({offset:rawOffset,limit:50,reviewedOnly:!admin}):await store.list();
        const visible=admin?rows:rows.filter(item=>item.status==='reviewed').map(({id,label,kind,features,status})=>({id,label,kind,features,status}));
        return send(res,200,store.page?{items:visible,nextOffset:rows.length===50?rawOffset+50:null}:visible);
      }
      if(req.method==='POST' && path==='/api/learning/examples') {
        const input=await body(req);
        if(!admin){
          input.source={type:'camera'};
          if(options.production&&store.acceptContribution){const address=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].trim();const hash=createHmac('sha256',adminKey).update(address).digest('hex');if(!await store.acceptContribution(hash))return send(res,429,{error:'Limite de contribuições atingido. Tente novamente mais tarde.'});}
        }
        const saved=await store.add(input);
        return send(res,201,admin?saved:{id:saved.id,status:'pending',duplicate:!!saved.duplicate});
      }
      const review=path.match(/^\/api\/learning\/examples\/([\w-]+)\/review$/);
      if(req.method==='PATCH' && review) {const result=await store.review(review[1],(await body(req)).status);return send(res,result?200:404,result||{error:'Exemplo não encontrado.'});}
      if(req.method==='GET' && path==='/api/learning/references') return send(res,200,await store.references());
      const reference=path.match(/^\/api\/learning\/references\/([\w-]+)$/);
      if(req.method==='GET' && reference) {const row=await store.reference(reference[1]);return send(res,row?200:404,row?{id:row.id,name:row.name,text:row.text,pages:row.pages}:{error:'Referência não encontrada.'});}
      if(req.method==='POST' && path==='/api/learning/references') {
        const input=await body(req); const bytes=Buffer.from(String(input.data||''),'base64');
        const limit=options.production?3000000:10000000;
        if(bytes.length>limit || bytes.length<5 || !bytes.subarray(0,5).equals(Buffer.from('%PDF-'))) throw new Error(`Envie um PDF válido de até ${limit/1000000} MB. Para materiais maiores, use a importação pelo computador dos desenvolvedores.`);
        const result=await parsePdf(bytes);
        return send(res,201,await store.addReference(input.name||'Referência.pdf',bytes,result.text,result.pages));
      }
      if(req.method==='GET' && path==='/api/learning/model') return send(res,200,await store.model());
      if(req.method==='POST' && path==='/api/learning/model') return send(res,201,await store.saveModel(await body(req)));
      if(req.method==='GET' && path==='/api/learning/export') return send(res,200,{version:1,paginated:!!store.page,examples:store.page?[]:await store.list(),references:await store.references(),model:await store.model()});
      return send(res,404,{error:'Rota não encontrada.'});
    } catch(error) {return send(res,400,{error:options.production&&error.code?'Não foi possível acessar o banco online. Tente novamente.':error.message||'Não foi possível processar os dados.'});}
  };
}
export function createAPI(store,parsePdf,adminKey,options){return http.createServer(createHandler(store,parsePdf,adminKey,options));}
