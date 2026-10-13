import React, { useState } from 'react';
import { ALPHABET, MOTION_LETTERS, INITIAL_LETTERS } from '../utils/alphabet';
export default function AlphabetPanel({ vocabulary, isCapturing, onCapture }) {
  const [letter,setLetter] = useState('A');
  const dynamic = MOTION_LETTERS.includes(letter);
  const examples = vocabulary.find(item=>item.word===letter)?.examples.length || 0;
  return <details className="bg-white border border-gray-200 rounded-2xl p-5" open>
    <summary className="font-bold cursor-pointer text-blue-700">Alfabeto manual — A a Z e Ç</summary>
    <div className="space-y-4 mt-4">
      <p className="text-sm text-gray-600">B, F, I, L, U, V e W têm leitura inicial experimental. Cadastre exemplos para as outras letras e para ajustar a leitura à sua mão.</p>
      <div className="flex flex-wrap gap-2" aria-label="Letras do alfabeto">
        {ALPHABET.map(value=><button type="button" key={value} aria-pressed={letter===value} onClick={()=>setLetter(value)} className={`rounded-lg px-3 py-2 font-bold border ${letter===value ? 'bg-blue-600 text-white' : 'bg-white text-blue-700'}`}>{value}</button>)}
      </div>
      <p className="text-sm"><strong>Letra {letter}</strong> — {dynamic ? 'Cadastre o movimento no painel Sinais com movimento usando esta letra como nome.' : `${examples} exemplos salvos. Grave pelo menos três para calibrar.`}{INITIAL_LETTERS.includes(letter) ? ' Também possui leitura inicial.' : ''}</p>
      <button type="button" disabled={!isCapturing || dynamic} onClick={()=>onCapture(letter)} className="w-full bg-blue-600 text-white rounded-xl p-3 font-bold disabled:opacity-50">Salvar postura da letra {letter}</button>
      <p className="text-xs text-gray-500">Letras parecidas podem ser confundidas. Ç, H, J, K, X, Y e Z ficam no cadastro de movimento; a imagem sozinha não mostra toda a trajetória.</p>
      <details><summary className="cursor-pointer text-blue-700 font-semibold">Ver a imagem de referência enviada</summary><img src={`${process.env.PUBLIC_URL}/alfabeto-libras-referencia.png`} alt="Referência enviada do alfabeto manual de Libras, com configurações de A a Z e Ç" className="mt-3 rounded-xl max-w-full mx-auto" /></details>
    </div>
  </details>;
}
