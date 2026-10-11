import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import CameraTranslator from '../components/CameraTranslator';
import TextToLibras from '../components/TextToLibras';
import VLibrasPosition from '../components/VLibrasPosition';

export default function TranslatorPage({ navigateTo }) {
  const [mode, setMode] = useState('camera');
  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <header className="bg-white border-b p-4 sm:px-8 flex items-center justify-between gap-4">
        <button type="button" onClick={() => navigateTo('/')} className="flex items-center gap-2 font-bold text-gray-600 hover:text-blue-600"><ArrowLeft className="w-5 h-5" />Voltar</button>
        <h2 className="text-xl font-bold">Tradutor <span className="text-blue-600">SignaWeb</span></h2>
      </header>
      <div role="group" aria-label="Direção da tradução" className="max-w-4xl mx-auto p-4 flex flex-col sm:flex-row gap-3">
        <button type="button" aria-pressed={mode === 'text'} onClick={() => setMode('text')}
          className={`flex-1 rounded-2xl px-5 py-4 font-bold border ${mode === 'text' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}>Texto ou voz → Libras</button>
        <button type="button" aria-pressed={mode === 'camera'} onClick={() => setMode('camera')}
          className={`flex-1 rounded-2xl px-5 py-4 font-bold border ${mode === 'camera' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'}`}>Libras → Texto e voz</button>
      </div>
      <VLibrasPosition />
      {mode === 'text' ? <TextToLibras /> : <CameraTranslator />}
    </div>
  );
}
