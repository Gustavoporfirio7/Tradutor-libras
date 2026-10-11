import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import TextToLibras from './TextToLibras';
import { openVLibras } from '../services/vlibras';

jest.mock('../services/vlibras', () => ({ openVLibras: jest.fn() }));

beforeEach(() => {
  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
  openVLibras.mockReset().mockResolvedValue();
});

test('prepara texto digitado para o VLibras e oferece alternativa sem microfone', async () => {
  render(<TextToLibras />);
  expect(screen.getByRole('button', { name: 'Usar microfone' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Abrir intérprete em Libras' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Texto em português do Brasil'), { target: { value: 'Bom dia' } });
  fireEvent.click(screen.getByRole('button', { name: 'Abrir intérprete em Libras' }));
  await waitFor(() => expect(openVLibras).toHaveBeenCalledTimes(1));
  expect(await screen.findByText('Bom dia', { selector: 'p' })).toBeInTheDocument();
  expect(screen.getByText(/toque na frase abaixo para ver os sinais/)).toBeInTheDocument();
});

test('mostra uma falha do intérprete sem fingir que houve tradução', async () => {
  openVLibras.mockRejectedValue(new Error('Serviço indisponível.'));
  render(<TextToLibras />);
  fireEvent.change(screen.getByLabelText('Texto em português do Brasil'), { target: { value: 'Olá' } });
  fireEvent.click(screen.getByRole('button', { name: 'Abrir intérprete em Libras' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Serviço indisponível');
  expect(screen.getByRole('status')).toHaveTextContent('A tradução em Libras não foi iniciada');
});

test('transcreve a voz em pt-BR e aborta o microfone ao sair', () => {
  const recognition = { start: jest.fn(), stop: jest.fn(), abort: jest.fn() };
  window.webkitSpeechRecognition = jest.fn(() => recognition);
  const { unmount } = render(<TextToLibras />);
  fireEvent.click(screen.getByRole('button', { name: 'Usar microfone' }));
  expect(recognition.lang).toBe('pt-BR');
  expect(recognition.start).toHaveBeenCalledTimes(1);
  const result = Object.assign([{ transcript: 'Tudo bem' }], { isFinal: true });
  act(() => recognition.onresult({ resultIndex: 0, results: [result] }));
  expect(screen.getByLabelText('Texto em português do Brasil')).toHaveValue('Tudo bem');
  expect(screen.getByRole('button', { name: 'Parar microfone' })).toBeInTheDocument();
  unmount();
  expect(recognition.abort).toHaveBeenCalledTimes(1);
  act(() => recognition.onresult({ resultIndex: 0, results: [result] }));
});

test('explica a recusa de permissão do microfone', () => {
  const recognition = { start: jest.fn(), abort: jest.fn() };
  window.SpeechRecognition = jest.fn(() => recognition);
  render(<TextToLibras />);
  fireEvent.click(screen.getByRole('button', { name: 'Usar microfone' }));
  act(() => { recognition.onerror({ error: 'not-allowed' }); recognition.onend(); });
  expect(screen.getByRole('alert')).toHaveTextContent('Permita o acesso ao microfone');
  expect(screen.getByRole('button', { name: 'Usar microfone' })).toBeEnabled();
});
