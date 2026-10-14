import { render, screen, fireEvent, act } from '@testing-library/react';
import MotionTrainer from './MotionTrainer';

beforeEach(() => { localStorage.clear(); jest.useFakeTimers(); });
afterEach(() => jest.useRealTimers());

function completeRecording(session) {
  act(() => {
    for (let step = 1; step <= 30; step += 1) {
      const hand = Array.from({ length: 21 }, (_, point) => ({ x: point * 0.01 + step * 0.005, y: point * 0.02, z: 0 }));
      session.latestResults = { time: Date.now() + 100, results: { multiHandLandmarks: [hand], multiHandedness: [{ label: 'Left' }] } };
      jest.advanceTimersByTime(100);
    }
  });
}

test('grava três movimentos e reconhece a palavra a partir da sequência completa', async () => {
  const session = {};
  const onRecognized = jest.fn();
  render(<MotionTrainer cameraSessionRef={{ current: session }} isCapturing onRecognized={onRecognized} />);
  fireEvent.change(screen.getByLabelText('Palavra ou expressão do sinal'), { target: { value: 'Exemplo' } });
  for (let example = 0; example < 3; example += 1) {
    fireEvent.click(screen.getByRole('button', { name: 'Gravar exemplo em movimento (3 s)' }));
    expect(session.recording).toBe(true);
    await act(async()=>completeRecording(session));
    expect(session.recording).toBe(false);
  }
  expect(JSON.parse(localStorage.getItem('signaweb-motions-v1'))[0].examples).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: 'Reconhecer sinal em movimento (3 s)' }));
  completeRecording(session);
  expect(onRecognized).toHaveBeenCalledWith('Exemplo');
});

test('cancela uma gravação ao trocar a sessão da câmera', () => {
  const session = {};
  const cameraSessionRef = { current: session };
  const onRecognized = jest.fn();
  render(<MotionTrainer cameraSessionRef={cameraSessionRef} isCapturing onRecognized={onRecognized} />);
  fireEvent.change(screen.getByLabelText('Palavra ou expressão do sinal'), { target: { value: 'Oi' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gravar exemplo em movimento (3 s)' }));
  cameraSessionRef.current = {};
  act(() => jest.advanceTimersByTime(3000));
  expect(session.recording).toBe(false);
  expect(localStorage.getItem('signaweb-motions-v1')).toBeNull();
  expect(onRecognized).not.toHaveBeenCalled();
  expect(screen.getByText('Gravação cancelada pela troca de câmera.')).toBeInTheDocument();
});
