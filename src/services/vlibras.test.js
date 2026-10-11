beforeEach(() => {
  jest.resetModules();
  localStorage.clear();
  jest.useFakeTimers();
  delete window.VLibrasWidget;
  document.getElementById('signaweb-vlibras')?.remove();
});

afterEach(() => jest.useRealTimers());

test('carrega um único script e aguarda o botão público do VLibras', async () => {
  const { loadVLibras } = require('./vlibras');
  const first = loadVLibras();
  const second = loadVLibras();
  expect(first).toBe(second);
  expect(document.querySelectorAll('#signaweb-vlibras')).toHaveLength(1);
  window.VLibrasWidget = { initBtn: { click: jest.fn() } };
  jest.advanceTimersByTime(100);
  await first;
});

test('oferece nova tentativa após falha de rede', async () => {
  const { loadVLibras } = require('./vlibras');
  const first = loadVLibras();
  const rejected = expect(first).rejects.toThrow('Não foi possível carregar');
  document.getElementById('signaweb-vlibras').dispatchEvent(new Event('error'));
  await rejected;
  const retry = loadVLibras();
  expect(document.getElementById('signaweb-vlibras')).not.toBeNull();
  window.VLibrasWidget = { initBtn: { click: jest.fn() } };
  jest.advanceTimersByTime(100);
  await retry;
});

test('não abre o avatar depois de o usuário sair da opção de texto', async () => {
  const { openVLibras } = require('./vlibras');
  const pending = openVLibras(() => false);
  const click = jest.fn();
  window.VLibrasWidget = { initBtn: { click } };
  jest.advanceTimersByTime(100);
  await pending;
  expect(click).not.toHaveBeenCalled();
});

test('explica uma inicialização que excede o tempo limite', async () => {
  const { loadVLibras } = require('./vlibras');
  const pending = loadVLibras();
  const rejected = expect(pending).rejects.toThrow('Verifique a conexão');
  jest.advanceTimersByTime(20000);
  await rejected;
  expect(document.getElementById('signaweb-vlibras')).toBeNull();
});

test('posiciona o atalho embaixo e salva a escolha do canto', () => {
  const { setVLibrasCorner, getVLibrasCorner, positionVLibrasShortcut } = require('./vlibras');
  const access = { style: {} };
  const initBtn = { style: {} };
  window.VLibrasWidget = { access, initBtn };
  positionVLibrasShortcut();
  expect(access.style.top).toBe('auto');
  expect(access.style.right).toBe('16px');
  setVLibrasCorner('left');
  expect(access.style.left).toBe('16px');
  expect(access.style.right).toBe('auto');
  expect(initBtn.style.left).toBe('0px');
  expect(getVLibrasCorner()).toBe('left');
});
