export function validFeatures(kind,features){
 const row=(value,size,bound)=>Array.isArray(value)&&value.length===size&&value.every(v=>Number.isFinite(v)&&Math.abs(v)<bound);
 return kind==='static'?row(features,63,20):kind==='motion'&&Array.isArray(features)&&features.length===16&&features.every(frame=>row(frame,68,30));
}
