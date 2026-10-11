const SCRIPT_URL = 'https://vlibras.gov.br/app/vlibras-plugin.js';
let loading;

const CORNER_KEY = 'signaweb-vlibras-corner';

export function getVLibrasCorner() {
  try { return localStorage.getItem(CORNER_KEY) === 'left' ? 'left' : 'right'; }
  catch { return 'right'; }
}

export function positionVLibrasShortcut(corner = getVLibrasCorner()) {
  const access = window.VLibrasWidget?.access;
  const button = window.VLibrasWidget?.initBtn;
  if (!access?.style) return;
  const left = corner === 'left';
  access.style.top = 'auto';
  access.style.bottom = 'calc(16px + env(safe-area-inset-bottom, 0px))';
  access.style.left = left ? '16px' : 'auto';
  access.style.right = left ? 'auto' : '16px';
  access.style.flexDirection = left ? 'row-reverse' : 'row';
  if (button?.style) {
    button.style.left = left ? '0px' : 'auto';
    button.style.right = left ? 'auto' : '0px';
  }
}

export function setVLibrasCorner(corner) {
  const selected = corner === 'left' ? 'left' : 'right';
  try { localStorage.setItem(CORNER_KEY, selected); } catch { /* A posição ainda funciona durante esta sessão. */ }
  positionVLibrasShortcut(selected);
}
export function loadVLibras() {
  if (window.VLibrasWidget?.initBtn) { positionVLibrasShortcut(); return Promise.resolve(); }
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    let script = document.getElementById('signaweb-vlibras');
    const created = !script;
    if (!script) {
      script = document.createElement('script');
      script.id = 'signaweb-vlibras';
      script.src = SCRIPT_URL;
      script.async = true;
    }
    let timer;
    let poll;
    const cleanup = () => {
      clearTimeout(timer);
      clearInterval(poll);
      script.removeEventListener('error', fail);
    };
    const fail = () => {
      cleanup();
      script.remove();
      reject(new Error('Não foi possível carregar o VLibras. Verifique a conexão e tente novamente.'));
    };
    script.addEventListener('error', fail);
    timer = setTimeout(fail, 20000);
    poll = setInterval(() => {
      if (!window.VLibrasWidget?.initBtn) return;
      cleanup();
      positionVLibrasShortcut();
      resolve();
    }, 100);
    if (created) {
      window.VLibrasWidget = { ...window.VLibrasWidget, position: getVLibrasCorner() === 'left' ? 'L' : 'R' };
      document.body.appendChild(script);
    }
  }).catch(error => { loading = null; throw error; });
  return loading;
}

export async function openVLibras(shouldOpen = () => true) {
  await loadVLibras();
  // Botão público documentado pelo VLibras; a tradução é iniciada pelo toque no texto.
  if (shouldOpen()) window.VLibrasWidget.initBtn.click();
}
