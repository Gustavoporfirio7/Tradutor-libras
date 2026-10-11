import React, { useState, useEffect } from 'react';
import { getVLibrasCorner, setVLibrasCorner, positionVLibrasShortcut } from '../services/vlibras';

export default function VLibrasPosition() {
  const [corner, setCorner] = useState(getVLibrasCorner);
  useEffect(() => { positionVLibrasShortcut(corner); }, [corner]);
  return <div className="max-w-4xl mx-auto px-4 pb-3 flex flex-wrap items-center gap-3 text-sm">
    <label htmlFor="vlibras-corner" className="font-semibold text-gray-700">Atalho do VLibras</label>
    <select id="vlibras-corner" value={corner} onChange={event => { setVLibrasCorner(event.target.value); setCorner(event.target.value); }} className="bg-white border rounded-xl px-3 py-2">
      <option value="right">Canto inferior direito</option>
      <option value="left">Canto inferior esquerdo</option>
    </select>
    <p className="text-gray-500">Com o painel aberto, arraste a barra do VLibras para mover o intérprete.</p>
  </div>;
}
