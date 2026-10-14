// Destino fixo local: não aceita URLs de terceiros nem expõe a base na rede.
const http=require('node:http');
module.exports=function(app){
  app.use('/api/learning',(req,res)=>{
    const upstream=http.request({hostname:'127.0.0.1',port:3002,path:req.originalUrl,method:req.method,headers:{...req.headers,host:'127.0.0.1:3002'}},response=>{
      res.writeHead(response.statusCode,response.headers);response.pipe(res);
    });
    upstream.on('error',()=>{
      if(!res.headersSent){res.statusCode=503;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify({error:'A base local está desconectada. Inicie o ambiente local e tente novamente.'}));}
      else res.end();
    });
    req.on('aborted',()=>upstream.destroy());req.pipe(upstream);
  });
};
