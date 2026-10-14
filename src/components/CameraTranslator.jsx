import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, History, Volume2, AlertCircle, SwitchCamera } from 'lucide-react';
import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { classifyHandGesture, SIGN_DICTIONARY } from '../utils/utilities';
import MotionTrainer from './MotionTrainer';
import TeachUnknown from './TeachUnknown';
import {refreshLearning,restoreLearningModel,reviewedGroups,predictLearnedMotion,saveLearningExample,LEARNING_EVENT} from '../services/learning';
import AlphabetPanel from './AlphabetPanel';
import { classifyAlphabet, isLetter } from '../utils/alphabet';
import { loadMotions, motionFrame, normalizeMotion, recognizeMotion } from '../utils/motionVocabulary';
import { handFeatures, loadVocabulary, saveVocabulary, addExample, recognizeWord } from '../utils/vocabulary';

export default function CameraTranslator({developer=false}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const sessionRef = useRef(null);
  const [translatedText, setTranslatedText] = useState('');
  const [history, setHistory] = useState([]);
  const [conversation, setConversation] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState('Aguardando ativação...');
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState('user');
  const [actualFacingMode, setActualFacingMode] = useState('user');
  const [cameraNotice, setCameraNotice] = useState('');
  const [vocabulary, setVocabulary] = useState(loadVocabulary);
  const vocabularyRef = useRef(vocabulary);
  const latestHandRef = useRef(null);
  const [wordToTeach, setWordToTeach] = useState('');
  const [trainingStatus, setTrainingStatus] = useState('');
  const [recognitionMode, setRecognitionMode] = useState(developer?'signs':'learning');
  const recognitionModeRef = useRef(developer?'signs':'learning');
  const [unknownSample,setUnknownSample]=useState(null);
  const unknownVisibleRef=useRef(false);
  const unknownRequestRef=useRef(0);
  const offerUnknown=(sample,force=false)=>{if(force||!unknownVisibleRef.current){unknownVisibleRef.current=true;setUnknownSample({...sample,requestId:++unknownRequestRef.current});}};
  useEffect(()=>{
    const sync=()=>refreshLearning().then(()=>restoreLearningModel()).catch(()=>{});
    sync();window.addEventListener(LEARNING_EVENT,sync);
    return()=>window.removeEventListener(LEARNING_EVENT,sync);
  },[]);

  const updateVocabulary = next => {
    try {
      saveVocabulary(next);
      vocabularyRef.current = next;
      setVocabulary(next);
      setError('');
      return true;
    } catch {
      setError('Não foi possível salvar os exemplos neste navegador. Verifique se o armazenamento está disponível.');
      return false;
    }
  };

  const captureExample = (label = wordToTeach) => {
    const latest = latestHandRef.current;
    if (!latest || Date.now() - latest.time > 1000) {
      setTrainingStatus('Ative a câmera e mantenha uma mão visível antes de salvar.');
      return;
    }
    try {
      const next = addExample(vocabularyRef.current, label, latest.features);
      if (updateVocabulary(next)) {
        const saved = next.find(item => item.word.toLocaleLowerCase('pt-BR') === label.trim().replace(/\s+/g, ' ').slice(0, 40).toLocaleLowerCase('pt-BR'));
        setTrainingStatus(`Exemplo salvo para “${saved.word}”. ${saved.examples.length}/3 exemplos mínimos. Varie um pouco a posição para o próximo exemplo.`);
        saveLearningExample({label:saved.word,kind:'static',features:latest.features,source:{type:'camera'},description:'Postura capturada na área dos desenvolvedores.'}).then(()=>setTrainingStatus('Postura enviada à base local, aguardando revisão. Varie a mão para capturar outro exemplo.')).catch(cause=>setTrainingStatus(`Cópia no navegador salva, mas a base local não recebeu o exemplo: ${cause.message}`));
      }
    } catch (cause) { setTrainingStatus(cause.message); }
  };

  const speakText = (text) => {
    if (!text || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    const voice = window.speechSynthesis.getVoices().find(item => item.lang.toLowerCase().replace('_', '-') === 'pt-br');
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  };

  const showWord = word => {
    setTranslatedText(word);
    setHistory(previous => [word, ...previous].slice(0, 30));
    setConversation(previous => (isLetter(word) ? previous + word : [previous, word].filter(Boolean).join(' ')).slice(-1000));
    speakText(word);
  };

  const releaseSession = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    latestHandRef.current = null;
    if (session) {
      cancelAnimationFrame(session.frame);
      session.stream?.getTracks().forEach(track => track.stop());
      // Aguarda o quadro em processamento antes de liberar o modelo.
      Promise.resolve(session.pending).catch(() => {}).then(() => session.hands?.close()).catch(() => {});
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    window.speechSynthesis?.cancel();
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const stopDetection = () => {
    releaseSession();
    setIsCapturing(false);
    setStatus('Câmera desligada');
    setTranslatedText('');
  };

  const startDetection = async (requestedFacing = facingMode) => {
    if (sessionRef.current) return;
    const session = { frame: 0, stream: null, hands: null, pending: null, candidate: null, since: 0, last: null, emptySince: null };
    sessionRef.current = session;
    setError('');
    setStatus('Carregando câmera e detector de mãos...');
    setIsCapturing(true);
    const fail = (cause) => {
      if (sessionRef.current !== session) return;
      releaseSession();
      setIsCapturing(false);
      setStatus('Não foi possível iniciar a detecção');
      const messages = {
        NotAllowedError: 'Permita o acesso à câmera nas configurações do navegador e tente novamente.',
        NotFoundError: 'A câmera solicitada não foi encontrada. Escolha a câmera frontal ou conecte uma webcam.',
        OverconstrainedError: 'Este dispositivo não disponibilizou a câmera solicitada. Tente a câmera frontal.',
        NotReadableError: 'Não foi possível acessar a câmera. Verifique se outro aplicativo está usando a webcam.'
      };
      setError(messages[cause?.name] || cause?.userMessage || 'Não foi possível carregar o detector. Verifique sua conexão e tente novamente.');
    };
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        const cause = new Error('A câmera precisa de um navegador compatível e de uma página HTTPS ou localhost.');
        cause.userMessage = cause.message;
        throw cause;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 }, height: { ideal: 480 },
          facingMode: requestedFacing === 'environment' ? { exact: 'environment' } : { ideal: 'user' }
        },
        audio: false
      });
      if (sessionRef.current !== session) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      session.stream = stream;
      const actualFacing = stream.getVideoTracks?.()[0]?.getSettings?.().facingMode;
      setActualFacingMode(actualFacing || requestedFacing);
      if (requestedFacing === 'environment' && actualFacing && actualFacing !== 'environment') {
        setCameraNotice('O navegador abriu outra câmera. A câmera traseira pode não estar disponível.');
      }
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      if (sessionRef.current !== session) return;
      const hands = new Hands({
        locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
      });
      session.hands = hands;
      hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
      session.motionFrames = [];
      session.motions = loadMotions();
      session.motionCheckedAt = 0;
      hands.onResults(results => {
        if (sessionRef.current !== session) return;
        session.latestResults = { results, time: Date.now() };

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const detectedHands = results.multiHandLandmarks || [];
        const gestures = [];
        for (const landmarks of detectedHands) {
          drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#3b82f6', lineWidth: 4 });
          drawLandmarks(ctx, landmarks, { color: '#ffffff', lineWidth: 2, radius: 4 });
          gestures.push(classifyHandGesture(landmarks));
        }
        // Este protótipo reconhece somente gestos isolados de uma mão.
        const features = detectedHands.length === 1 ? handFeatures(detectedHands[0]) : null;
        latestHandRef.current = features ? { features, time: Date.now() } : null;
        if (session.recording) { session.motionFrames=[]; return; }
        const now = Date.now();
        const alphabetMode = recognitionModeRef.current === 'alphabet';
        const learnedMode=recognitionModeRef.current==='learning';
        const allPostures=learnedMode?reviewedGroups('static'):[...vocabularyRef.current,...reviewedGroups('static')];
        const trained = alphabetMode ? allPostures.filter(item=>isLetter(item.word)) : allPostures;
        const word = recognizeWord(features, trained);
        if (!session.motionFrames.length || now - session.motionFrames[session.motionFrames.length-1].time >= 90) {
          session.motionFrames.push(motionFrame(results, now));
          session.motionFrames = session.motionFrames.filter(frame=>now-frame.time<=3000).slice(-40);
        }
        if (now-session.motionCheckedAt>=500) {
          session.motionCheckedAt = now;
          session.motions = loadMotions();
          const sequence = normalizeMotion(session.motionFrames);
          const allMotions=learnedMode?reviewedGroups('motion'):[...session.motions,...reviewedGroups('motion')];
          const eligible=alphabetMode?allMotions.filter(item=>isLetter(item.word)):allMotions;
          const prediction=predictLearnedMotion(sequence);
          const motionLetter=(prediction&&(!alphabetMode||isLetter(prediction))?prediction:null)||recognizeMotion(sequence,eligible);
          if (motionLetter) {
            if(session.last!==motionLetter){session.last = motionLetter;showWord(motionLetter);}
            session.unknownUntil=now+4000;
            return;
          }
        }
        const gesture = word || (detectedHands.length === 1 ? (learnedMode?null:alphabetMode ? classifyAlphabet(detectedHands[0]) : gestures[0]) : null);
        setStatus(detectedHands.length > 1 ? 'Use uma mão por vez para reconhecer o gesto' :
          detectedHands.length === 0 ? 'Posicione uma mão na câmera' :
          gesture ? 'Mantenha o gesto por um instante' : 'Gesto fora do vocabulário do protótipo');
        if (!gesture) {
          if(learnedMode&&!unknownVisibleRef.current&&detectedHands.length&&now>=(session.unknownUntil||0)&&session.motionFrames.length>=25&&now-session.motionFrames[0].time>=2800){
            const captured=normalizeMotion(session.motionFrames);
            if(captured)offerUnknown({kind:'motion',features:captured});
          }
          if(learnedMode&&features&&!unknownVisibleRef.current&&now>=(session.unknownUntil||0)){
            const same=session.unknownAnchor&&Math.sqrt(features.reduce((sum,value,i)=>sum+(value-session.unknownAnchor[i])**2,0)/features.length)<0.08;
            if(!same){session.unknownAnchor=features;session.unknownSince=now;}
            else if(now-session.unknownSince>3200){const captured=normalizeMotion(session.motionFrames);offerUnknown(captured?{kind:'motion',features:captured}:{kind:'static',features:features.slice()});session.unknownSince=now;}
          } else if(!features) session.unknownAnchor=null;
          session.candidate = null;
          if (session.emptySince === null) session.emptySince = now;
          if (now - session.emptySince >= 500) session.last = null;
          return;
        }
        session.emptySince = null;
        if (session.candidate !== gesture) {
          session.candidate = gesture;
          session.since = now;
        }
        if (now - session.since < 600 || session.last === gesture) return;
        session.last = gesture;
        setTranslatedText(gesture);
        setHistory(previous => [gesture, ...previous].slice(0, 30));
        if (!SIGN_DICTIONARY.includes(gesture)) setConversation(previous => (isLetter(gesture) ? previous + gesture : [previous, gesture].filter(Boolean).join(' ')).slice(-1000));
        speakText(gesture);
      });
      const processFrame = async () => {
        if (sessionRef.current !== session) return;
        try {
          if (video.readyState >= 2) {
            session.pending = hands.send({ image: video });
            await session.pending;
          }
          if (sessionRef.current === session) session.frame = requestAnimationFrame(processFrame);
        } catch (cause) { fail(cause); }
      };
      session.frame = requestAnimationFrame(processFrame);
    } catch (cause) { fail(cause); }
  };

  useEffect(() => releaseSession, [releaseSession]);
  return (
    <section className="flex flex-col bg-[#f0f4f8]">
      <div className="px-4 sm:px-8 pt-4">
        <h3 className="text-2xl font-bold">Libras → Texto e voz</h3>
        <p className="text-gray-600 mt-2">Faça o sinal com as mãos visíveis. Se não houver reconhecimento, você poderá informar o significado para nossa equipe revisar. O reconhecimento de conversas completas ainda está em desenvolvimento.</p>
      </div>

      <div className="px-4 sm:px-8 pt-4 flex flex-wrap gap-3 items-center">
        {developer&&<><label htmlFor="recognition-mode" className="font-bold">Reconhecer</label>
        <select id="recognition-mode" value={recognitionMode} onChange={event=>{
          const next = event.target.value; setRecognitionMode(next); recognitionModeRef.current=next;
          if (sessionRef.current) { sessionRef.current.last=null; sessionRef.current.candidate=null; sessionRef.current.motionFrames=[]; }
        }} className="border rounded-xl bg-white p-3"><option value="signs">Sinais e palavras</option><option value="alphabet">Alfabeto manual</option><option value="learning">IA com base local</option></select></>}
        <label htmlFor="camera-facing" className="font-bold">Câmera</label>
        <select id="camera-facing" value={facingMode} onChange={event => {
          const next = event.target.value;
          const wasCapturing = Boolean(sessionRef.current);
          setFacingMode(next);
          if (wasCapturing) { stopDetection(); startDetection(next); }
        }} className="border rounded-xl bg-white p-3">
          <option value="user">Frontal / webcam</option>
          <option value="environment">Traseira</option>
        </select>
        <button type="button" onClick={() => {
          const next = facingMode === 'user' ? 'environment' : 'user';
          const wasCapturing = Boolean(sessionRef.current);
          setFacingMode(next);
          if (wasCapturing) { stopDetection(); startDetection(next); }
        }} className="inline-flex items-center gap-2 bg-white border rounded-xl px-4 py-3 font-bold text-blue-700"><SwitchCamera className="w-5 h-5" />Trocar câmera</button>
        {developer&&<button type="button" disabled={!isCapturing} onClick={()=>{
          const sequence=normalizeMotion(sessionRef.current?.motionFrames||[]);
          if(sequence)offerUnknown({kind:'motion',features:sequence},true);
          else if(latestHandRef.current)offerUnknown({kind:'static',features:latestHandRef.current.features.slice()},true);
        }} className="bg-white border rounded-xl px-4 py-3 text-blue-700 font-bold disabled:opacity-50">Corrigir ou ensinar sinal atual</button>}
        <p className="text-xs text-gray-500">No celular, abra o site por HTTPS e permita o uso da câmera.</p>
        {cameraNotice && <p role="status" className="text-amber-700">{cameraNotice}</p>}
      </div>
      <main className="flex-1 flex flex-col lg:flex-row p-4 sm:p-6 gap-6">
        <div className="flex-1 min-w-0 flex flex-col gap-5">
        <div className="min-h-[320px] lg:min-h-[480px] lg:max-h-[640px] bg-black rounded-[2.5rem] overflow-hidden relative border-8 border-white shadow-2xl flex items-center justify-center">
          <video ref={videoRef} playsInline className={`w-full h-full object-cover transform ${actualFacingMode === 'user' ? '-scale-x-100' : ''} ${!isCapturing ? 'hidden' : 'block'}`} />
          <canvas ref={canvasRef} className={`absolute inset-0 w-full h-full object-cover transform ${actualFacingMode === 'user' ? '-scale-x-100' : ''} pointer-events-none ${!isCapturing ? 'hidden' : 'block'}`} />

          {!isCapturing ? (
            <div className="flex flex-col items-center justify-center text-white p-8 text-center">
              <Camera className="w-20 h-20 mb-6 opacity-25" />
              <h3 className="text-2xl font-bold mb-4">A câmera está desligada</h3>
              <p className="text-gray-400 mb-6 max-w-sm">Ative a câmera para reconhecer os sinais revisados pela equipe. Este protótipo ainda não traduz Libras livremente.</p>
              <button onClick={() => startDetection()} className="bg-blue-500 hover:bg-blue-600 px-10 py-4 rounded-2xl font-bold transition-all shadow-xl">
                Ativar Câmera
              </button>
            </div>
          ) : (
            <div className="absolute top-6 left-6 bg-black/50 backdrop-blur-md text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <span aria-hidden="true" className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
              <span role="status">{status}</span>
            </div>
          )}
        </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 max-h-[420px] overflow-hidden flex flex-col">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <History className="w-4 h-4" /> Histórico
            </h4>
            <div className="space-y-3 overflow-y-auto pr-2">
              {history.length > 0 ? (
                history.map((h, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-2xl font-bold flex justify-between items-center hover:border-blue-100 border border-transparent">
                    <span className="text-[#1f2937]">{h}</span>
                    <button type="button" aria-label={`Ouvir ${h}`} onClick={() => speakText(h)} className="text-gray-400 hover:text-blue-500"><Volume2 className="w-4 h-4" /></button>
                  </div>
                ))
              ) : (
                <p className="text-gray-300 text-sm text-center py-10 italic">Aguardando gestos...</p>
              )}
            </div>
          </div>


        </div>
        <div className="w-full lg:w-[400px] flex flex-col gap-6">
          {developer&&<p className="text-sm text-gray-600">Gestos básicos: mão aberta, punho fechado, positivo e vitória/paz. Palavras precisam de pelo menos três exemplos cadastrados. Mantenha a mão estável; para repetir, retire-a por um instante.</p>}
          {developer && recognitionMode === 'alphabet' && <AlphabetPanel vocabulary={vocabulary} isCapturing={isCapturing} onCapture={captureExample} />}
          {unknownSample&&<TeachUnknown key={unknownSample.requestId} sample={unknownSample} onDismiss={()=>{setUnknownSample(null);unknownVisibleRef.current=false;if(sessionRef.current)sessionRef.current.unknownUntil=Date.now()+8000;}} />}
          {developer&&<MotionTrainer key={facingMode} cameraSessionRef={sessionRef} isCapturing={isCapturing} onRecognized={showWord} onUnknown={sample=>offerUnknown(sample,true)} />}
          {developer&&<details className="bg-white rounded-2xl p-5 border border-gray-200">
            <summary className="font-bold cursor-pointer text-blue-700">Ensinar uma palavra (experimental)</summary>
            <div className="space-y-3 mt-4">
              <p className="text-sm text-gray-600">Cadastre apenas sinais estáticos de uma mão que você conheça. Este recurso compara a postura com seus exemplos; não valida se o sinal pertence à Libras. Evite palavras com posturas parecidas.</p>
              <label htmlFor="teach-word" className="block text-sm font-bold">Palavra do sinal</label>
              <input id="teach-word" maxLength={40} value={wordToTeach} onChange={event => setWordToTeach(event.target.value)} className="w-full border rounded-xl p-3" placeholder="Digite a palavra" />
              <button type="button" disabled={!isCapturing || !wordToTeach.trim()} onClick={() => captureExample()} className="w-full rounded-xl bg-blue-600 text-white px-4 py-3 font-bold disabled:opacity-50">Salvar exemplo da mão</button>
              <p role="status" className="text-sm text-gray-600">{trainingStatus || 'Faça o sinal e salve três exemplos com pequenas variações. Os exemplos ficam somente neste navegador.'}</p>
              <ul className="space-y-2">
                {vocabulary.map(item => <li key={item.word} className="flex items-center justify-between gap-2 text-sm border-t pt-2">
                  <span>{item.word} — {item.examples.length} exemplos {item.examples.length < 3 ? '(em cadastro)' : '(pronta para testar)'}</span>
                  <button type="button" aria-label={`Remover ${item.word}`} onClick={() => updateVocabulary(vocabularyRef.current.filter(entry => entry.word !== item.word))} className="text-red-700">Remover</button>
                </li>)}
              </ul>
              <p className="text-xs text-gray-500">Use a mesma mão e orientação dos exemplos. O reconhecimento não cobre movimentos, frases ou posição em relação ao rosto e ao corpo.</p>
            </div>
          </details>}
          {error && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-red-700">{error}</p>}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 text-center">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Palavra ou gesto reconhecido</h4>
            <p className="text-4xl font-black text-[#1f2937] min-h-[60px] italic">
              {translatedText ? `"${translatedText}"` : "..."}
            </p>
            {translatedText && (
              <button onClick={() => speakText(translatedText)} className="mt-4 inline-flex items-center gap-2 text-blue-500 font-bold text-sm hover:text-blue-700">
                <Volume2 className="w-4 h-4" /> Repetir Áudio
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl p-5 space-y-3">
            <label htmlFor="conversation-text" className="block font-bold">Sua conversa</label>
            <textarea id="conversation-text" rows={3} maxLength={1000} value={conversation} onChange={event => setConversation(event.target.value)} className="w-full border rounded-xl p-3" placeholder="As palavras cadastradas reconhecidas aparecem aqui. Você pode corrigir o texto." />
            <div className="flex gap-4">
              <button type="button" disabled={!conversation.trim()} onClick={() => speakText(conversation)} className="text-blue-700 font-bold disabled:opacity-50">Ouvir conversa</button>
              <button type="button" onClick={() => setConversation('')} className="text-gray-600">Limpar conversa</button>
            </div>
          </div>
          {isCapturing && (
            <button onClick={stopDetection} className="bg-red-50 text-red-600 py-3 rounded-2xl font-bold flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" /> Parar Câmera
            </button>
          )}
        </div>
      </main>
    </section>
  );
}
