import React,{useState} from 'react';
import {saveLearningExample} from '../services/learning';
export default function TeachUnknown({sample,onDismiss}) {
  const [label,setLabel]=useState('');const [description,setDescription]=useState('');
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('');
  if(!sample)return null;
  return <section className="bg-white border border-blue-200 rounded-2xl p-5 space-y-3" aria-label="Ensinar sinal desconhecido">
    <h4 className="font-bold text-blue-700">Não reconheci esse sinal. Você pode me ensinar?</h4>
    <p className="text-sm text-gray-600">O exemplo foi separado para você identificar. Ele só será usado no aprendizado depois que nossa equipe revisar o movimento e o significado.</p>
    <label htmlFor="unknown-label" className="block font-bold text-sm">O que você sinalizou?</label>
    <input id="unknown-label" maxLength={40} value={label} onChange={event=>setLabel(event.target.value)} disabled={busy||!!message} className="w-full border rounded-xl p-3" placeholder="Palavra, expressão ou letra"/>
    <label htmlFor="unknown-description" className="block text-sm">Descrição ou contexto (opcional)</label>
    <textarea id="unknown-description" maxLength={2000} value={description} onChange={event=>setDescription(event.target.value)} disabled={busy||!!message} className="w-full border rounded-xl p-3" rows={2}/>
    <div className="flex gap-3 flex-wrap">
      <button type="button" disabled={busy||!label.trim()||!!message} onClick={async()=>{
        setBusy(true);setError('');
        try {const saved=await saveLearningExample({...sample,label,description,source:{type:'camera'}});setMessage(saved.duplicate?'Esse exemplo já estava salvo.':'Exemplo salvo, aguardando revisão da equipe.');}
        catch(cause){setError(cause.message);}finally{setBusy(false);}
      }} className="rounded-xl bg-blue-600 text-white px-4 py-3 font-bold disabled:opacity-50">{busy?'Salvando...':'Ensinar e salvar exemplo'}</button>
      <button type="button" onClick={onDismiss} disabled={busy} className="text-gray-600">{message?'Fechar':'Ignorar este sinal'}</button>
    </div>
    {message&&<p role="status" className="text-sm text-blue-700">{message}</p>}
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
