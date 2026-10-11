import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Languages } from 'lucide-react';
import { openVLibras } from '../services/vlibras';

export default function TextToLibras() {
  const [text, setText] = useState('');
  const [preparedText, setPreparedText] = useState('');
  const [interim, setInterim] = useState('');
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Digite uma palavra ou use o microfone.');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const mountedRef = useRef(true);
  const operationRef = useRef(0);
  const dailyPhrases = ['Oi', 'Tchau', 'Bom dia', 'Obrigado', 'Por favor', 'Tudo bem?', 'Preciso de ajuda'];
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationRef.current += 1;
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      recognition?.abort();
    };
  }, []);

  const startListening = () => {
    if (!Recognition || recognitionRef.current) return;
    setError('');
    setInterim('');
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    const active = () => mountedRef.current && recognitionRef.current === recognition;
    recognition.onstart = () => {
      if (!active()) return;
      setListening(true);
      setStatus('Ouvindo em português do Brasil...');
    };
    recognition.onresult = event => {
      if (!active()) return;
      let finalText = '';
      let partial = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript + ' ';
        else partial += event.results[i][0].transcript;
      }
      if (finalText.trim()) {
        setText(previous => [previous.trim(), finalText.trim()].filter(Boolean).join(' ').slice(0, 500));
        setPreparedText('');
        setStatus('Confira o texto reconhecido e abra o intérprete.');
      }
      setInterim(partial);
    };
    recognition.onerror = event => {
      if (!active()) return;
      const messages = {
        'not-allowed': 'Permita o acesso ao microfone no navegador.',
        'service-not-allowed': 'O serviço de reconhecimento de voz está indisponível neste navegador.',
        'audio-capture': 'Nenhum microfone disponível. Verifique o dispositivo.',
        'no-speech': 'Não foi detectada fala. Tente novamente.',
        network: 'Não foi possível reconhecer a voz. Verifique sua conexão.'
      };
      if (event.error !== 'aborted') setError(messages[event.error] || 'Não foi possível reconhecer a fala. Você pode digitar o texto.');
    };
    recognition.onend = () => {
      if (!active()) return;
      recognitionRef.current = null;
      setListening(false);
      setInterim('');
    };
    try {
      setListening(true);
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      setError('Não foi possível iniciar o microfone. Tente novamente ou digite o texto.');
    }
  };

  const prepareTranslation = async () => {
    const phrase = text.trim();
    if (!phrase || loading) return;
    const operation = ++operationRef.current;
    recognitionRef.current?.stop();
    setPreparedText(phrase);
    setError('');
    setLoading(true);
    setStatus('Carregando intérprete em Libras...');
    try {
      await openVLibras(() => mountedRef.current && operation === operationRef.current);
      if (!mountedRef.current || operation !== operationRef.current) return;
      setStatus('No painel do VLibras, ative a seleção de texto e toque na frase abaixo para ver os sinais.');
    } catch (cause) {
      if (mountedRef.current && operation === operationRef.current) {
        setError(cause.message);
        setStatus('A tradução em Libras não foi iniciada.');
      }
    } finally {
      if (mountedRef.current && operation === operationRef.current) setLoading(false);
    }
  };

  return (
    <section className="max-w-4xl mx-auto w-full p-4 sm:p-8 space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">Português → Libras</h3>
        <p className="text-gray-600">Escreva ou fale em português. O avatar do VLibras mostra a tradução em sinais.</p>
      </div>
      <div className="bg-white rounded-3xl p-6 shadow-sm space-y-4">
        <label htmlFor="portuguese-text" className="block font-bold">Texto em português do Brasil</label>
        <textarea id="portuguese-text" value={text} maxLength={500} rows={4} disabled={loading || listening}
          onChange={event => { setText(event.target.value); setPreparedText(''); }}
          placeholder="Exemplo: Olá, como você está?"
          className="w-full rounded-2xl border border-gray-300 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <p className="text-xs text-gray-500">{text.length}/500 caracteres</p>
        <div className="flex flex-wrap gap-2" aria-label="Frases do dia a dia">
          {dailyPhrases.map(phrase => <button key={phrase} type="button" disabled={listening || loading} onClick={() => { setText(phrase); setPreparedText(''); }} className="rounded-lg bg-blue-50 text-blue-700 px-3 py-2 text-sm disabled:opacity-50">{phrase}</button>)}
        </div>
        {interim && <p className="text-gray-500 italic" aria-live="polite">Ouvindo: {interim}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={!Recognition || loading}
            onClick={() => listening ? recognitionRef.current?.stop() : startListening()}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-5 py-3 text-blue-700 font-bold disabled:opacity-50">
            {listening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {listening ? 'Parar microfone' : 'Usar microfone'}
          </button>
          <button type="button" disabled={!text.trim() || loading || listening} onClick={prepareTranslation}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-white font-bold disabled:opacity-50">
            <Languages className="w-5 h-5" />{loading ? 'Carregando intérprete...' : 'Abrir intérprete em Libras'}
          </button>
          <button type="button" disabled={listening || loading} onClick={() => { setText(''); setPreparedText(''); setError(''); }} className="px-4 py-3 text-gray-600 disabled:opacity-50">Limpar texto</button>
        </div>
        {!Recognition && <p className="text-sm text-amber-700">Este navegador não oferece reconhecimento de voz. Use o campo de texto.</p>}
        <p role="status" className="text-sm text-gray-600">{status}</p>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
      </div>
      {preparedText && <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 space-y-4">
        <h4 className="font-bold">Texto para o intérprete</h4>
        <p className="text-sm text-gray-600">Abra o VLibras pelo botão azul flutuante. Com a seleção de texto ativa, toque na frase abaixo. No celular, você também pode usar a opção “Tradutor” no menu do VLibras e colar o texto.</p>
        <p className="text-2xl leading-relaxed whitespace-pre-wrap break-words bg-white rounded-2xl p-5">{preparedText}</p>
        <button type="button" onClick={async () => {
          try { await navigator.clipboard.writeText(preparedText); setStatus('Texto copiado. Cole na opção Tradutor do VLibras.'); }
          catch { setError('Não foi possível copiar automaticamente. Selecione e copie o texto.'); }
        }} className="text-blue-700 font-bold">Copiar texto</button>
      </div>}
      <p className="text-sm text-gray-500">O VLibras precisa de internet. O reconhecimento de voz pode enviar o áudio ao serviço do navegador. Confira o texto antes de traduzir.</p>
    </section>
  );
}
