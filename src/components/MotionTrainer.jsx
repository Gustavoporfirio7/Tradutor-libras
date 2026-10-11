import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadMotions, saveMotions, motionFrame, normalizeMotion, addMotionExample, recognizeMotion, DAILY_WORDS } from '../utils/motionVocabulary';

export default function MotionTrainer({ cameraSessionRef, isCapturing, onRecognized }) {
  const [word, setWord] = useState('');
  const [motions, setMotions] = useState(loadMotions);
  const [recording, setRecording] = useState(false);
  const [remaining, setRemaining] = useState(3);
  const [message, setMessage] = useState('Cadastre três movimentos completos por palavra para começar a testar.');
  const [error, setError] = useState('');
  const timerRef = useRef(null);
  const recordingSessionRef = useRef(null);
  const cancel = useCallback(() => {
    clearInterval(timerRef.current); timerRef.current = null;
    if (recordingSessionRef.current) recordingSessionRef.current.recording = false;
    recordingSessionRef.current = null;
  }, []);
  useEffect(() => cancel, [cancel]);
  useEffect(() => {
    if (!isCapturing && timerRef.current) {
      cancel();
      setRecording(false);
      setMessage('Gravação cancelada porque a câmera foi desligada.');
    }
  }, [isCapturing, cancel]);

  const persist = next => {
    try { saveMotions(next); setMotions(next); return true; }
    catch { setError('Não foi possível salvar os movimentos no armazenamento deste navegador.'); return false; }
  };

  const record = kind => {
    const session = cameraSessionRef.current;
    if (!session || timerRef.current) return;
    recordingSessionRef.current = session;
    session.recording = true;
    const start = Date.now();
    const label = word.trim();
    const frames = [];
    setError('');
    setRecording(true);
    setRemaining(3);
    setMessage('Faça o sinal completo agora, mantendo as mãos dentro da imagem.');
    timerRef.current = setInterval(() => {
      if (cameraSessionRef.current !== session) {
        cancel(); setRecording(false); setMessage('Gravação cancelada pela troca de câmera.'); return;
      }
      const now = Date.now();
      setRemaining(Math.max(0, Math.ceil((3000 - (now - start)) / 1000)));
      const latest = session.latestResults;
      if (latest && latest.time >= start && (!frames.length || frames[frames.length - 1].time < latest.time)) frames.push(motionFrame(latest.results, latest.time));
      if (now - start < 3000) return;
      cancel();
      setRecording(false);
      const sequence = normalizeMotion(frames);
      if (!sequence) {
        setError('A gravação ficou incompleta. Mantenha as mãos visíveis e tente novamente por três segundos.');
        return;
      }
      if (kind === 'teach') {
        try {
          const next = addMotionExample(motions, label, sequence);
          if (persist(next)) {
            const saved = next.find(item => item.word.toLocaleLowerCase('pt-BR') === label.replace(/\s+/g, ' ').slice(0, 40).toLocaleLowerCase('pt-BR'));
            setMessage(`Movimento salvo para “${saved.word}”: ${saved.examples.length} exemplos. ${saved.examples.length < 3 ? 'Grave mais exemplos para habilitar o reconhecimento.' : 'Pronto para testar.'}`);
          }
        } catch (cause) { setError(cause.message); }
      } else {
        const recognized = recognizeMotion(sequence, motions);
        if (recognized) { onRecognized(recognized); setMessage(`Sinal reconhecido: ${recognized}.`); }
        else setMessage('Não encontrei uma correspondência clara. Repita o sinal ou cadastre mais exemplos.');
      }
    }, 100);
  };

  const ready = motions.some(item => item.examples.length >= 3);
  return <div className="bg-white rounded-2xl p-5 border border-blue-100 space-y-4">
    <h4 className="font-bold text-blue-700">Sinais com movimento</h4>
    <p className="text-sm text-gray-600">Agora você pode cadastrar sinais de até três segundos com uma ou duas mãos. Use o mesmo enquadramento e a mesma mão dos exemplos. O reconhecimento continua experimental.</p>
    <label htmlFor="motion-word" className="block text-sm font-bold">Palavra ou expressão do sinal</label>
    <input id="motion-word" maxLength={40} value={word} disabled={recording} onChange={event => setWord(event.target.value)} className="w-full border rounded-xl p-3" placeholder="Exemplo: Oi ou Tchau" />
    <div className="flex flex-wrap gap-2" aria-label="Sugestões para o dia a dia">
      {DAILY_WORDS.map(label => <button key={label} type="button" disabled={recording} onClick={() => setWord(label)} className="rounded-lg bg-blue-50 text-blue-700 px-3 py-1 text-xs disabled:opacity-50">{label}</button>)}
    </div>
    <p className="text-xs text-gray-500">As sugestões são nomes para cadastrar; ainda não são sinais treinados. Use sinais de Libras que você conheça.</p>
    <button type="button" disabled={!isCapturing || !word.trim() || recording} onClick={() => record('teach')} className="w-full bg-blue-600 text-white rounded-xl p-3 font-bold disabled:opacity-50">Gravar exemplo em movimento (3 s)</button>
    <button type="button" disabled={!isCapturing || !ready || recording} onClick={() => record('recognize')} className="w-full border border-blue-200 text-blue-700 rounded-xl p-3 font-bold disabled:opacity-50">Reconhecer sinal em movimento (3 s)</button>
    {recording && <p role="status" className="rounded-xl bg-blue-50 p-3 font-bold text-blue-700">Gravando... {remaining} s</p>}
    <p role="status" className="text-sm text-gray-600">{message}</p>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <ul className="space-y-2">
      {motions.map(item => <li key={item.word} className="flex justify-between items-center gap-2 border-t pt-2 text-sm">
        <span>{item.word} — {item.examples.length} movimentos {item.examples.length >= 3 ? '(pronto para testar)' : '(em cadastro)'}</span>
        <button type="button" disabled={recording} aria-label={`Remover movimento ${item.word}`} className="text-red-700 disabled:opacity-50" onClick={() => persist(motions.filter(entry => entry.word !== item.word))}>Remover</button>
      </li>)}
    </ul>
    <p className="text-xs text-gray-500">Os exemplos ficam neste navegador, sem salvar vídeos. Sinais com a mesma postura e movimento podem ser confundidos. Expressões faciais e posição em relação ao corpo ainda não são analisadas.</p>
  </div>;
}
