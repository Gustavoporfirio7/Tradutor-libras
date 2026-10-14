import React,{useState,useEffect} from 'react';
import {learningRequest,setDeveloperKey,refreshLearning} from '../services/learning';
import LearningBase from '../components/LearningBase';
import CameraTranslator from '../components/CameraTranslator';
export default function DeveloperPage(){
  const [key,setKey]=useState('');const [ready,setReady]=useState(false);const [error,setError]=useState('');const [camera,setCamera]=useState(false);
  useEffect(()=>()=>{setDeveloperKey('');refreshLearning().catch(()=>{});},[]);
  if(ready)return <><div className="max-w-5xl mx-auto p-4 flex gap-4"><button className="efata-secondary" onClick={()=>setCamera(!camera)}>{camera?'Voltar à revisão':'Capturar exemplos pela câmera'}</button><button onClick={()=>{setDeveloperKey('');setReady(false);setKey('');}}>Sair da área dos desenvolvedores</button></div>{camera?<CameraTranslator developer/>:<LearningBase/>}</>;
  return <form className="max-w-lg mx-auto my-12 p-6 bg-white rounded-2xl space-y-4" onSubmit={async event=>{event.preventDefault();setDeveloperKey(key.trim());try{await learningRequest('/admin');setReady(true);setError('');}catch(cause){setDeveloperKey('');setError(cause.message);}}}>
    <h1 className="text-2xl font-bold">Área dos desenvolvedores</h1><p>Importação, revisão e treinamento da base de aprendizado. No site publicado, use a chave configurada pela equipe. No ambiente local, ela fica em .env.server.local ou .data/admin-key.txt.</p>
    <label htmlFor="developer-key" className="block font-bold">Chave local</label><input id="developer-key" type="password" value={key} onChange={event=>setKey(event.target.value)} className="w-full p-3 border rounded-xl" autoComplete="off"/>
    <button className="efata-primary" disabled={!key.trim()}>Entrar</button>{error&&<p role="alert">{error}</p>}
  </form>;
}
