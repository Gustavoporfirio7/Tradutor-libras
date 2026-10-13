import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';

jest.mock('react-intersection-observer', () => ({ useInView: () => [() => {}, true] }));
jest.mock('@mediapipe/hands', () => ({ Hands: jest.fn(), HAND_CONNECTIONS: [] }));

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  window.IntersectionObserver = jest.fn(() => ({ observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() }));
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({ clearRect: jest.fn() }));
});

test('mostra o protótipo e abre o reconhecimento de gestos', () => {
  window.scrollTo = jest.fn();
  render(<App />);
  expect(screen.getByText('PROTÓTIPO EM DESENVOLVIMENTO')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Abrir tradutor' }));
  expect(screen.getByRole('button', { name: 'Ativar Câmera' })).toBeInTheDocument();
  expect(screen.getByText(/Este protótipo ainda não traduz Libras livremente/)).toBeInTheDocument();
});

test('abre a rota salva e acompanha a navegação do navegador', () => {
  window.scrollTo = jest.fn();
  window.history.replaceState(null, '', '/#/tradutor');
  render(<App />);
  expect(screen.getByRole('button', { name: 'Ativar Câmera' })).toBeInTheDocument();
  act(() => {
    window.history.replaceState(null, '', '/#/');
    window.dispatchEvent(new Event('hashchange'));
  });
  expect(screen.getByRole('button', { name: 'Abrir tradutor' })).toBeInTheDocument();
});

test('muda o tema, salva a preferência e mantém a história do nome acessível', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: 'Éfata, página inicial' })).toBeInTheDocument();
  expect(screen.getByText('Éfata: um convite a abrir-se.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ativar modo escuro' }));
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(localStorage.getItem('efata-theme')).toBe('dark');
  fireEvent.click(screen.getByRole('button', { name: 'Ativar modo claro' }));
  expect(document.documentElement.dataset.theme).toBe('light');
});

test('restaura o modo escuro salvo no navegador', () => {
  localStorage.setItem('efata-theme', 'dark');
  render(<App />);
  expect(screen.getByRole('button', { name: 'Ativar modo claro' })).toBeInTheDocument();
  expect(document.documentElement.dataset.theme).toBe('dark');
});
