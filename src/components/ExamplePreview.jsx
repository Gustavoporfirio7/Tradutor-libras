import React,{useState,useEffect,useMemo} from 'react';
const ids=[0,4,5,6,8,9,10,12,14,16,20];
const links=[[0,5],[5,6],[6,8],[0,9],[9,10],[10,12],[0,14],[14,16],[0,20],[0,4],[5,9],[9,14],[14,20]];
export default function ExamplePreview({example}){
  const [frame,setFrame]=useState(0);const [playing,setPlaying]=useState(false);
  const sequences=useMemo(()=>{
    if(!Array.isArray(example.features))return [];
    if(example.kind==='static')return [[example.features.reduce((points,value,i)=>{if(i%3===0)points.push(example.features.slice(i,i+3));return points;},[])]];
    return example.features.map(row=>[0,34].map(offset=>row[offset]?ids.map((_,i)=>row.slice(offset+1+i*3,offset+4+i*3)):[]));
  },[example]);
  useEffect(()=>{if(!playing||sequences.length<2)return;const timer=setInterval(()=>setFrame(value=>(value+1)%sequences.length),180);return()=>clearInterval(timer);},[playing,sequences.length]);
  const points=sequences.flat(2);const xs=points.map(p=>p[0]);const ys=points.map(p=>p[1]);
  if(!points.length)return null;
  const minX=Math.min(...xs),minY=Math.min(...ys),span=Math.max(Math.max(...xs)-minX,Math.max(...ys)-minY,1);
  const project=p=>[20+(p[0]-minX)/span*220,20+(p[1]-minY)/span*220];
  const hands=sequences[Math.min(frame,sequences.length-1)]||[];
  const edges=example.kind==='static'?[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]]:links.map(pair=>pair.map(id=>ids.indexOf(id)));
  return <div className="space-y-2"><svg role="img" aria-label={`Pontos das mãos do exemplo ${example.label}`} viewBox="0 0 260 260" className="w-56 h-56 bg-slate-100 rounded-xl">{hands.map((hand,h)=><g key={h} stroke={h?'#7c3aed':'#2563eb'}>{edges.filter(([a,b])=>hand[a]&&hand[b]).map(([a,b],i)=>{const p=project(hand[a]),q=project(hand[b]);return <line key={i} x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} strokeWidth="3"/>;})}{hand.map((point,i)=>{const p=project(point);return <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="white"/>;})}</g>)}</svg>
    {sequences.length>1&&<><button type="button" onClick={()=>setPlaying(!playing)} className="text-blue-700 font-bold">{playing?'Pausar movimento':'Reproduzir movimento'}</button><input aria-label={`Quadro do exemplo ${example.label}`} type="range" min="0" max={sequences.length-1} value={frame} onChange={event=>{setPlaying(false);setFrame(Number(event.target.value));}}/></>}
    <p className="text-xs text-gray-500">Prévia dos pontos capturados. Não inclui rosto e corpo; se o significado não puder ser confirmado, mantenha pendente.</p>
  </div>;
}
