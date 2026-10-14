import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
export function createAPI(store, parsePdf, adminKey) {
  const send=(res,status,value)=>{ res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); res.end(JSON.stringify(value)); };
  const body=async req=>{
    if (!req.headers['content-type']?.startsWith('application/json')) throw new Error('Envie dados em JSON.');
    let bytes=0; const chunks=[];
    for await (const chunk of req) { bytes+=chunk.length; if(bytes>15000000) throw new Error('Arquivo ou pedido muito grande. O limite do PDF é de 10 MB.'); chunks.push(chunk); }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  };
  return http.createServer(async(req,res)=>{
    const origin=req.headers.origin;
    const allowed=new Set(['http://localhost:3000','http://localhost:3001','http://127.0.0.1:3000','http://127.0.0.1:3001']);
    const address=req.socket.localPort;
    allowed.add(`http://127.0.0.1:${address}`); allowed.add(`http://localhost:${address}`);
    if(origin && !allowed.has(origin)) return send(res,403,{error:'Origem não autorizada para a base local.'});
    if (!['localhost', '127.0.0.1'].includes((req.headers.host||'').split(':')[0])) return send(res,403,{error:'A base está disponível somente neste computador.'});
    const path=new URL(req.url,'http://localhost').pathname;
    const supplied=Buffer.from(String(req.headers['x-efata-admin']||''));
    const expected=Buffer.from(String(adminKey||''));
    const admin=expected.length>0 && supplied.length===expected.length && timingSafeEqual(supplied,expected);
    const restricted=path.includes('/references') || path.endsWith('/export') || path.endsWith('/admin') || path.endsWith('/review') || (path.endsWith('/model') && req.method!=='GET');
    if(restricted && !admin) return send(res,401,{error:'Informe a chave dos desenvolvedores para acessar esta área.'});
    try {
      if(req.method==='GET' && path==='/api/learning/admin') return send(res,200,{ok:true});
      if(req.method==='GET' && path==='/api/learning/health') return send(res,200,{ok:true,storage:'sqlite-local'});
      if(req.method==='GET' && path==='/api/learning/examples') return send(res,200,admin?store.list():store.list().filter(item=>item.status==='reviewed').map(({id,label,kind,features,status})=>({id,label,kind,features,status})));
      if(req.method==='POST' && path==='/api/learning/examples') {
        const input=await body(req);
        if(!admin) input.source={type:'camera'};
        const saved=store.add(input);
        return send(res,201,admin?saved:{id:saved.id,status:'pending',duplicate:!!saved.duplicate});
      }
      const review=path.match(/^\/api\/learning\/examples\/([\w-]+)\/review$/);
      if(req.method==='PATCH' && review) {const result=store.review(review[1],(await body(req)).status);return send(res,result?200:404,result||{error:'Exemplo não encontrado.'});}
      if(req.method==='GET' && path==='/api/learning/references') return send(res,200,store.references());
      const reference=path.match(/^\/api\/learning\/references\/([\w-]+)$/);
      if(req.method==='GET' && reference) {const row=store.reference(reference[1]);return send(res,row?200:404,row?{id:row.id,name:row.name,text:row.text,pages:row.pages}:{error:'Referência não encontrada.'});}
      if(req.method==='POST' && path==='/api/learning/references') {
        const input=await body(req); const bytes=Buffer.from(String(input.data||''),'base64');
        if(bytes.length>10000000 || bytes.length<5 || !bytes.subarray(0,5).equals(Buffer.from('%PDF-'))) throw new Error('Envie um PDF válido de até 10 MB.');
        const result=await parsePdf(bytes);
        return send(res,201,store.addReference(input.name||'Referência.pdf',bytes,result.text,result.pages));
      }
      if(req.method==='GET' && path==='/api/learning/model') return send(res,200,store.model());
      if(req.method==='POST' && path==='/api/learning/model') return send(res,201,store.saveModel(await body(req)));
      if(req.method==='GET' && path==='/api/learning/export') return send(res,200,{version:1,examples:store.list(),references:store.references(),model:store.model()});
      return send(res,404,{error:'Rota não encontrada.'});
    } catch(error) {return send(res,400,{error:error.message||'Não foi possível processar os dados.'});}
  });
}
