import React,{useEffect,useState,useRef} from 'react';
import {learningRequest,refreshLearning,saveLearningExample,trainLearningModel,restoreLearningModel,LEARNING_EVENT} from '../services/learning';
import {extractVideoExample} from '../services/videoExamples';
import ExamplePreview from './ExamplePreview';
export default function LearningBase(){
  const [examples,setExamples]=useState([]);const [references,setReferences]=useState([]);const [model,setModel]=useState(null);
  const [error,setError]=useState('');const [message,setMessage]=useState('Conectando à base de aprendizado...');
  const [maxPdfBytes,setMaxPdfBytes]=useState(10000000);
  const [label,setLabel]=useState('');const [video,setVideo]=useState(null);const [start,setStart]=useState(0);const [end,setEnd]=useState(3);
  const [busy,setBusy]=useState(false);const [progress,setProgress]=useState(0);const [referenceText,setReferenceText]=useState('');
  const [filter,setFilter]=useState('all');const [search,setSearch]=useState('');const [limit,setLimit]=useState(20);
  const filtered=examples.filter(item=>(filter==='all'||(filter==='camera'?item.source.type==='camera':item.status===filter))&&item.label.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  const abortRef=useRef(null);const mounted=useRef(true);const busyRef=useRef(false);
  const reload=async()=>{
    const rows=await refreshLearning();
    const [docs,saved,health]=await Promise.all([learningRequest('/references'),restoreLearningModel().catch(()=>null),learningRequest('/health')]);
    if(mounted.current){setExamples(rows);setReferences(docs);setModel(saved);setMaxPdfBytes(health.maxPdfBytes||10000000);setError('');setMessage(health.storage==='turso-cloud'?'Base online conectada. As revisões e os modelos são compartilhados com o site.':'Base local conectada. Os dados ficam salvos neste computador.');}
  };
  useEffect(()=>{
    mounted.current=true;const update=()=>{if(!busyRef.current)reload().catch(cause=>{if(mounted.current)setError(cause.message);});};
    update();const timer=setInterval(()=>{if(document.visibilityState==='visible')update();},15000);
    return()=>{mounted.current=false;clearInterval(timer);abortRef.current?.abort();};
    // A conexão é iniciada somente ao abrir esta tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  const run=async action=>{
    busyRef.current=true;setBusy(true);setError('');setProgress(0);
    try{await action();}catch(cause){if(mounted.current)setError(cause.message);}finally{busyRef.current=false;if(mounted.current)setBusy(false);}
  };
  const review=async(id,status)=>run(async()=>{
    await learningRequest(`/examples/${id}/review`,{method:'PATCH',body:JSON.stringify({status})});
    await reload();window.dispatchEvent(new Event(LEARNING_EVENT));
  });
  const reviewed=examples.filter(row=>row.status==='reviewed');
  const counts=new Map();reviewed.filter(row=>row.kind==='motion').forEach(row=>counts.set(row.label,(counts.get(row.label)||0)+1));
  const trainable=[...counts].filter(([,count])=>count>=3).length>=2;
  return <section className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
    <div><h3 className="text-2xl font-bold">Base de aprendizado do Éfata</h3><p className="text-gray-600 mt-2">Vídeos fornecem exemplos dos movimentos. PDFs guardam descrições e referências. Você revisa os significados antes de treinar.</p></div>
    <p role="status" className="text-sm text-blue-700">{message}</p>{error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    <button type="button" disabled={busy} onClick={()=>run(reload)} className="efata-secondary">Atualizar base</button>
    <div className="grid sm:grid-cols-3 gap-3">{[['Exemplos salvos',examples.length],['Exemplos revisados',reviewed.length],['PDFs de referência',references.length]].map(([title,count])=><div key={title} className="bg-white rounded-2xl p-5 border"><p className="text-sm text-gray-500">{title}</p><strong className="text-3xl">{count}</strong></div>)}</div>
    <div className="bg-white rounded-2xl p-6 space-y-4 border">
      <h4 className="font-bold text-xl">Importar um exemplo de vídeo</h4>
      <p className="text-sm text-gray-600">Escolha um trecho de 1 a 10 segundos com apenas um sinal e informe seu significado. O processamento ocorre no navegador; são salvos os pontos das mãos, sem enviar o vídeo inteiro à base.</p>
      <label htmlFor="learning-video" className="block font-bold text-sm">Vídeo do sinal (MP4 ou WebM, até 100 MB)</label><input id="learning-video" type="file" accept="video/mp4,video/webm" disabled={busy} onChange={event=>setVideo(event.target.files[0]||null)}/>
      <label htmlFor="learning-label" className="block font-bold text-sm">Significado do sinal</label><input id="learning-label" maxLength={40} value={label} disabled={busy} onChange={event=>setLabel(event.target.value)} placeholder="Exemplo: Oi" className="w-full border rounded-xl p-3"/>
      <div className="flex flex-wrap gap-4"><label>Início (segundos)<input aria-label="Início do trecho" type="number" min="0" step="0.1" value={start} disabled={busy} onChange={event=>setStart(Number(event.target.value))} className="block w-32 border rounded-lg p-2"/></label><label>Fim (segundos)<input aria-label="Fim do trecho" type="number" min="1" step="0.1" value={end} disabled={busy} onChange={event=>setEnd(Number(event.target.value))} className="block w-32 border rounded-lg p-2"/></label></div>
      <button type="button" disabled={busy||!video||!label.trim()} onClick={()=>run(async()=>{
        abortRef.current=new AbortController();setMessage('Acompanhando as mãos no vídeo...');
        const features=await extractVideoExample(video,start,end,value=>{if(mounted.current)setProgress(value);},abortRef.current.signal);
        if(!mounted.current)return;
        await saveLearningExample({label,kind:'motion',features,description:'Exemplo extraído de um trecho de vídeo.',source:{type:'video',name:video.name,start,end}});
        await reload();setMessage('Exemplo importado. Confira o significado na lista e marque como revisado.');
      })} className="efata-primary disabled:opacity-50">Importar exemplo do vídeo</button>
    </div>
    <div className="bg-white rounded-2xl p-6 space-y-4 border">
      <h4 className="font-bold text-xl">Materiais de referência em PDF</h4><p className="text-sm text-gray-600">O texto extraído pode ser consultado para entender e descrever sinais. Ele não gera um movimento para o modelo. PDFs com páginas apenas em imagem precisam de OCR, que ainda não está incluído.</p>
      <label htmlFor="learning-pdf" className="block font-bold text-sm">Adicionar PDF (até {maxPdfBytes/1000000} MB)</label><input id="learning-pdf" type="file" accept="application/pdf" disabled={busy} onChange={event=>{
        const file=event.target.files[0];if(!file)return;
        run(async()=>{
          if(file.size>maxPdfBytes)throw new Error(`O limite neste ambiente é de ${maxPdfBytes/1000000} MB. Importe PDFs maiores pelo computador dos desenvolvedores conectado ao Turso.`);
          setMessage('Lendo o PDF...');const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
          const result=await learningRequest('/references',{method:'POST',body:JSON.stringify({name:file.name,data:btoa(binary)})});
          await reload();setMessage(result.characters?'PDF salvo com seu texto de referência.':'PDF salvo, mas não encontrei texto selecionável. Esse material pode precisar de OCR.');
        });event.target.value='';
      }}/>
      <ul className="space-y-2">{references.map(doc=><li key={doc.id}><button type="button" disabled={busy} onClick={()=>run(async()=>{const full=await learningRequest(`/references/${doc.id}`);setReferenceText(full.text||'Este PDF não contém texto selecionável.');})} className="text-blue-700 underline">{doc.name} — {doc.pages} páginas</button></li>)}</ul>
      {referenceText&&<div className="space-y-2"><label htmlFor="reference-search" className="font-bold text-sm">Texto do material selecionado</label><textarea id="reference-search" readOnly rows={8} value={referenceText} className="w-full border rounded-xl p-3"/><button onClick={()=>setReferenceText('')} className="text-gray-600">Fechar texto</button></div>}
    </div>
    <div className="bg-white rounded-2xl p-6 space-y-4 border">
      <h4 className="font-bold text-xl">Treinar o modelo de movimentos</h4><p className="text-sm text-gray-600">É necessário ter três movimentos revisados por palavra e pelo menos duas palavras. O treinamento usa uma rede neural pequena e guarda sua versão na base local. Novos exemplos não mudam o modelo automaticamente.</p>
      <button type="button" disabled={busy||!trainable} onClick={()=>run(async()=>{setMessage('Treinando com os movimentos revisados...');const saved=await trainLearningModel(value=>{if(mounted.current)setProgress(value);});setModel(saved);setMessage('Modelo treinado e salvo. Agora teste com sinais diferentes dos exemplos usados.');})} className="efata-primary disabled:opacity-50">Treinar com exemplos revisados</button>
      {busy&&<p role="status" className="text-blue-700">Processando... {progress}%</p>}
      {model&&<p className="text-sm text-gray-600">Versão salva em {new Date(model.createdAt).toLocaleString('pt-BR')}. Palavras: {model.labels.join(', ')}. Resultado nos {model.validationCount} exemplos separados: {Math.round((model.validationAccuracy||0)*100)}%. Essa avaliação pequena não comprova precisão com outros usuários.</p>}
    </div>
    <div className="bg-white rounded-2xl p-6 space-y-4 border"><h4 className="font-bold text-xl">Revisar exemplos ensinados</h4><p className="text-sm text-gray-600">Confira cada significado. Um erro de descrição também pode ensinar um reconhecimento errado.</p>
      {!examples.length&&<p>Nenhum exemplo foi enviado à base ainda.</p>}
      <div className="flex flex-wrap gap-3"><label>Mostrar exemplos<select aria-label="Filtrar exemplos" value={filter} onChange={event=>{setFilter(event.target.value);setLimit(20);}} className="block border rounded-xl p-3"><option value="all">Todos</option><option value="camera">Contribuições pela câmera</option><option value="pending">Aguardando revisão</option><option value="reviewed">Revisados</option><option value="rejected">Rejeitados</option></select></label><label>Buscar significado<input aria-label="Buscar significado" value={search} onChange={event=>{setSearch(event.target.value);setLimit(20);}} className="block border rounded-xl p-3"/></label></div>
      <p className="text-sm text-gray-600">{filtered.length} exemplos encontrados. Nas contribuições pela câmera, confira a resposta do usuário junto com os pontos capturados.</p>
      <ul className="space-y-3">{filtered.slice(0,limit).map(item=><li key={item.id} className="border rounded-xl p-4 space-y-2"><div className="flex justify-between gap-3"><strong>{item.label}</strong><span className="text-sm text-gray-500">{item.status==='reviewed'?'Revisado':item.status==='rejected'?'Rejeitado':'Aguardando revisão'}</span></div><p className="text-sm text-gray-600">{item.kind==='motion'?'Movimento':'Postura'} · {item.source.type==='video'?`${item.source.name} (${item.source.start.toFixed(2)}–${item.source.end.toFixed(2)} s)`:'Câmera'}{item.description?` · ${item.description}`:''}</p><ExamplePreview example={item}/><div className="flex gap-4"><button type="button" disabled={busy||item.status==='reviewed'} onClick={()=>review(item.id,'reviewed')} className="text-blue-700 font-bold disabled:opacity-50">Confirmar significado e revisar</button><button type="button" disabled={busy||item.status==='rejected'} onClick={()=>review(item.id,'rejected')} className="text-red-700 disabled:opacity-50">Rejeitar exemplo</button></div></li>)}</ul>{filtered.length>limit&&<button type="button" className="efata-secondary" onClick={()=>setLimit(limit+20)}>Mostrar mais exemplos</button>}
    </div>
    <button type="button" disabled={busy} onClick={()=>run(async()=>{
      const data=await learningRequest('/export');if(data.paginated)data.examples=await refreshLearning();const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='efata-base-aprendizado.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Cópia dos exemplos e do modelo exportada. Os arquivos PDF completos permanecem no banco de dados.');
    })} className="efata-secondary disabled:opacity-50">Exportar exemplos e modelo</button>
  </section>;
}
