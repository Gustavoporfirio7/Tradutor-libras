import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import TranslatorPage from './TranslatorPage';
import { Hands } from '@mediapipe/hands';

jest.mock('@mediapipe/hands', () => ({ Hands: jest.fn(), HAND_CONNECTIONS: [] }));

jest.mock('@mediapipe/drawing_utils', () => ({ drawConnectors: jest.fn(), drawLandmarks: jest.fn() }));
jest.mock('../utils/utilities', () => ({ classifyHandGesture: () => 'Mão aberta', SIGN_DICTIONARY: ['Mão aberta'] }));

afterEach(() => jest.restoreAllMocks());

beforeEach(() => {
  localStorage.clear();
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({ clearRect: jest.fn() }));
});

test('mostra erro de permissão e permite tentar novamente', async () => {
  const getUserMedia = jest.fn().mockRejectedValue({ name: 'NotAllowedError' });
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  render(<TranslatorPage navigateTo={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Ativar Câmera' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Permita o acesso à câmera');
  expect(screen.getByRole('button', { name: 'Ativar Câmera' })).toBeEnabled();
});

test('libera a câmera se a autorização chegar depois de sair da página', async () => {
  let resolveStream;
  const getUserMedia = jest.fn(() => new Promise(resolve => { resolveStream = resolve; }));
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  const stop = jest.fn();
  const { unmount } = render(<TranslatorPage navigateTo={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Ativar Câmera' }));
  unmount();
  resolveStream({ getTracks: () => [{ stop }] });
  await waitFor(() => expect(stop).toHaveBeenCalledTimes(1));
});

test('confirma um gesto estável, evita repetição de voz e libera os recursos ao parar', async () => {
  let onResults;
  const close = jest.fn().mockResolvedValue();
  Hands.mockImplementation(() => ({ setOptions: jest.fn(), onResults: callback => { onResults = callback; }, close }));
  jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  jest.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  const now = jest.spyOn(Date, 'now').mockReturnValue(0);
  const stop = jest.fn();
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
    getUserMedia: jest.fn().mockResolvedValue({ getTracks: () => [{ stop }] })
  } });
  const speak = jest.fn();
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak, cancel: jest.fn(), getVoices: () => [] } });
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  render(<TranslatorPage navigateTo={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Ativar Câmera' }));
  await waitFor(() => expect(onResults).toBeDefined());
  const frame = (time, visible = true) => {
    now.mockReturnValue(time);
    act(() => onResults({ multiHandLandmarks: visible ? [[]] : [] }));
  };
  frame(0);
  expect(speak).not.toHaveBeenCalled();
  frame(601);
  expect(speak).toHaveBeenCalledTimes(1);
  expect(speak.mock.calls[0][0].lang).toBe('pt-BR');
  frame(6000);
  expect(speak).toHaveBeenCalledTimes(1);
  frame(6100, false);
  frame(6700, false);
  frame(6800);
  frame(7401);
  expect(speak).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: 'Parar Câmera' }));
  expect(stop).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  frame(10000);
  expect(speak).toHaveBeenCalledTimes(2);
});

test('troca a câmera ativa, encerra a anterior e não espelha a traseira', async () => {
  Hands.mockImplementation(() => ({ setOptions: jest.fn(), onResults: jest.fn(), close: jest.fn().mockResolvedValue() }));
  jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  jest.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  const frontStop = jest.fn();
  const rearStop = jest.fn();
  const getUserMedia = jest.fn()
    .mockResolvedValueOnce({ getTracks: () => [{ stop: frontStop }], getVideoTracks: () => [{ getSettings: () => ({ facingMode: 'user' }) }] })
    .mockImplementationOnce(() => {
      expect(frontStop).toHaveBeenCalledTimes(1);
      return Promise.resolve({ getTracks: () => [{ stop: rearStop }], getVideoTracks: () => [{ getSettings: () => ({ facingMode: 'environment' }) }] });
    });
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  const { container, unmount } = render(<TranslatorPage navigateTo={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Ativar Câmera' }));
  await waitFor(() => expect(Hands).toHaveBeenCalled());
  expect(getUserMedia.mock.calls[0][0].video.facingMode).toEqual({ ideal: 'user' });
  fireEvent.click(screen.getByRole('button', { name: 'Trocar câmera' }));
  await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(2));
  expect(getUserMedia.mock.calls[1][0].video.facingMode).toEqual({ exact: 'environment' });
  expect(screen.getByLabelText('Câmera')).toHaveValue('environment');
  await waitFor(() => expect(container.querySelector('video').className).not.toContain('-scale-x-100'));
  unmount();
  expect(rearStop).toHaveBeenCalledTimes(1);
});

test('libera a câmera ao mudar para tradução de texto', async () => {
  Hands.mockImplementation(() => ({ setOptions: jest.fn(), onResults: jest.fn(), close: jest.fn().mockResolvedValue() }));
  jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  jest.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  const stop = jest.fn();
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
    getUserMedia: jest.fn().mockResolvedValue({ getTracks: () => [{ stop }] })
  } });
  render(<TranslatorPage navigateTo={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Ativar Câmera' }));
  await waitFor(() => expect(Hands).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: 'Texto ou voz → Libras' }));
  expect(stop).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('Texto em português do Brasil')).toBeInTheDocument();
});

test('cadastra três exemplos e exibe a palavra associada à mão', async () => {
  let onResults;
  Hands.mockImplementation(() => ({ setOptions: jest.fn(), onResults: callback => { onResults = callback; }, close: jest.fn().mockResolvedValue() }));
  jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  jest.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
    getUserMedia: jest.fn().mockResolvedValue({ getTracks: () => [{ stop: jest.fn() }] })
  } });
  render(<TranslatorPage navigateTo={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Ativar Câmera' }));
  await waitFor(() => expect(onResults).toBeDefined());
  fireEvent.click(screen.getByText('Ensinar uma palavra (experimental)'));
  fireEvent.change(screen.getByLabelText('Palavra do sinal'), { target: { value: 'Exemplo' } });
  const points = Array.from({ length: 21 }, (_, i) => ({ x: 0.1 + i * 0.01, y: 0.2 + i * 0.02, z: i * 0.005 }));
  act(() => onResults({ multiHandLandmarks: [points] }));
  for (let i = 0; i < 3; i += 1) fireEvent.click(screen.getByRole('button', { name: 'Salvar exemplo da mão' }));
  expect(JSON.parse(localStorage.getItem('signaweb-vocabulary-v1'))[0].examples).toHaveLength(3);
  now.mockReturnValue(1100);
  act(() => onResults({ multiHandLandmarks: [points] }));
  now.mockReturnValue(1701);
  act(() => onResults({ multiHandLandmarks: [points] }));
  expect(screen.getByText('"Exemplo"')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Remover Exemplo' }));
  expect(JSON.parse(localStorage.getItem('signaweb-vocabulary-v1'))).toEqual([]);
});

test('lê letras calibradas, mantém repetições no histórico abaixo da câmera e forma o texto', async () => {
  let onResults;
  Hands.mockImplementation(() => ({setOptions:jest.fn(),onResults:callback=>{onResults=callback;},close:jest.fn().mockResolvedValue()}));
  jest.spyOn(window,'requestAnimationFrame').mockReturnValue(1);
  jest.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});
  jest.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();
  const now=jest.spyOn(Date,'now').mockReturnValue(0);
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:jest.fn().mockResolvedValue({getTracks:()=>[{stop:jest.fn()}]})}});
  const points=Array.from({length:21},(_,i)=>({x:0.1+i*0.01,y:0.2+i*0.02,z:0}));
  const {handFeatures}=require('../utils/vocabulary');
  const example=handFeatures(points);
  localStorage.setItem('signaweb-vocabulary-v1',JSON.stringify([{word:'A',examples:[example,example,example]}]));
  const {container}=render(<TranslatorPage navigateTo={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('Reconhecer'),{target:{value:'alphabet'}});
  fireEvent.click(screen.getByRole('button',{name:'Ativar Câmera'}));
  await waitFor(()=>expect(onResults).toBeDefined());
  const frame=(time,visible=true)=>{
    now.mockReturnValue(time);
    act(()=>onResults({multiHandLandmarks:visible?[points]:[]}));
  };
  frame(0);frame(601);frame(1000,false);frame(1601,false);frame(1700);frame(2301);
  expect(screen.getByLabelText('Sua conversa')).toHaveValue('AA');
  expect(screen.getAllByRole('button',{name:'Ouvir A'})).toHaveLength(2);
  const historyHeading=screen.getByRole('heading',{name:'Histórico'});
  const camera=container.querySelector('video');
  expect(camera.compareDocumentPosition(historyHeading)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByRole('button',{name:'Salvar postura da letra A'})).toBeInTheDocument();
});
