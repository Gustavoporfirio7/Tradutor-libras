import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import {validFeatures} from './validation.mjs';
export {validFeatures} from './validation.mjs';

export function openStore(path) {
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS examples (id TEXT PRIMARY KEY, label TEXT NOT NULL, label_key TEXT NOT NULL, kind TEXT NOT NULL, features TEXT NOT NULL, description TEXT NOT NULL, source TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', digest TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(label_key, kind, digest));
    CREATE TABLE IF NOT EXISTS references_docs (id TEXT PRIMARY KEY, name TEXT NOT NULL, content BLOB NOT NULL, text TEXT NOT NULL, pages INTEGER NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS models (id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TEXT NOT NULL);
  `);
  const parseExample = row => ({ id:row.id, label:row.label, kind:row.kind, features:JSON.parse(row.features), description:row.description, source:JSON.parse(row.source), status:row.status, createdAt:row.created_at });
  return {
    close:()=>db.close(),
    list:()=>db.prepare('SELECT * FROM examples ORDER BY created_at DESC').all().map(parseExample),
    add(input) {
      const label = typeof input.label === 'string' ? input.label.normalize('NFC').trim().replace(/\s+/g,' ') : '';
      if (!label || label.length > 40 || /[\u0000-\u001f]/.test(label) || !validFeatures(input.kind,input.features)) throw new Error('Informe um significado válido e um exemplo completo do sinal.');
      if (db.prepare('SELECT COUNT(*) AS n FROM examples').get().n >= 2000) throw new Error('A base de testes atingiu o limite de 2000 exemplos.');
      const features=JSON.stringify(input.features);
      const digest=createHash('sha256').update(features).digest('hex');
      const key=label.toLocaleLowerCase('pt-BR');
      const existing=db.prepare('SELECT * FROM examples WHERE label_key=? AND kind=? AND digest=?').get(key,input.kind,digest);
      if (existing) return { ...parseExample(existing), duplicate:true };
      const canonical=db.prepare('SELECT label FROM examples WHERE label_key=? LIMIT 1').get(key)?.label||label;
      const id=randomUUID();
      const description=String(input.description||'').slice(0,2000);
      const source=JSON.stringify({ type:input.source?.type === 'video' ? 'video' : 'camera', name:String(input.source?.name||'').slice(0,200), start:Number(input.source?.start)||0, end:Number(input.source?.end)||0 });
      db.prepare('INSERT INTO examples VALUES (?,?,?,?,?,?,?,?,?,?)').run(id,canonical,key,input.kind,features,description,source,'pending',digest,new Date().toISOString());
      return parseExample(db.prepare('SELECT * FROM examples WHERE id=?').get(id));
    },
    review(id,status) {
      if (!['reviewed','rejected','pending'].includes(status)) throw new Error('Estado de revisão inválido.');
      if (!db.prepare('SELECT id FROM examples WHERE id=?').get(id)) return null;
      db.prepare('UPDATE examples SET status=? WHERE id=?').run(status,id);
      return parseExample(db.prepare('SELECT * FROM examples WHERE id=?').get(id));
    },
    references:()=>db.prepare('SELECT id,name,pages,created_at AS createdAt,length(content) AS bytes,substr(text,1,500) AS preview FROM references_docs ORDER BY created_at DESC').all(),
    reference:id=>db.prepare('SELECT * FROM references_docs WHERE id=?').get(id),
    addReference(name,content,text,pages) {
      const id=randomUUID();
      db.prepare('INSERT INTO references_docs VALUES (?,?,?,?,?,?)').run(id,String(name).slice(0,200),content,String(text).slice(0,500000),pages,new Date().toISOString());
      return {id,name,pages,characters:text.length};
    },
    saveModel(data) {
      if (!Array.isArray(data.labels) || data.labels.length < 2 || data.labels.length > 100 || !data.artifacts?.modelTopology || !Array.isArray(data.artifacts?.weightSpecs) || typeof data.artifacts?.weightData !== 'string' || data.artifacts.weightData.length > 2000000) throw new Error('Modelo inválido.');
      if (!Array.isArray(data.sampleIds) || data.sampleIds.length > 2000) throw new Error('Exemplos de treinamento inválidos.');
      const all=this.list().filter(row=>row.status==='reviewed' && row.kind==='motion');
      const selected=all.filter(row=>data.sampleIds.includes(row.id));
      if (selected.length!==data.sampleIds.length || data.labels.some(label=>selected.filter(row=>row.label===label).length<3)) throw new Error('Treine com pelo menos três movimentos revisados de cada uma das duas ou mais palavras.');
      const id=randomUUID(); const createdAt=new Date().toISOString();
      db.prepare('INSERT INTO models VALUES (?,?,?)').run(id,JSON.stringify(data),createdAt);
      return {id,createdAt,labels:data.labels};
    },
    model() {
      const row=db.prepare('SELECT * FROM models ORDER BY created_at DESC LIMIT 1').get();
      return row ? {id:row.id,createdAt:row.created_at,...JSON.parse(row.data)} : null;
    }
  };
}
