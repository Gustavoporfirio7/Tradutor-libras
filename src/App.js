import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import TranslatorPage from './pages/TranslatorPage';
import NotFoundPage from './pages/NotFoundPage';
import DeveloperPage from './pages/DeveloperPage';
import { Sun, Moon, Hand } from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('efata-theme') === 'dark' ? 'dark' : 'light'; }
    catch { return 'light'; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b1220' : '#f6f8fc');
    try { localStorage.setItem('efata-theme', theme); } catch { /* Mantém a troca de tema nesta sessão. */ }
  }, [theme]);
  const [currentPage, setCurrentPage] = useState(() => window.location.hash.slice(1) || '/');

  const navigateTo = (path) => {
    window.location.hash = path;
    setCurrentPage(path);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const onHashChange = () => {
      setCurrentPage(window.location.hash.slice(1) || '/');
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case '/':
        return <LandingPage navigateTo={navigateTo} />;
      case '/tradutor':
        return <TranslatorPage navigateTo={navigateTo} />;
      case '/desenvolvedor':
        return <DeveloperPage />;
      default:
        return <NotFoundPage navigateTo={navigateTo} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] text-[#1f2937] font-sans antialiased">
      <nav className="efata-nav" aria-label="Navegação principal">
        <button className="efata-brand" onClick={() => navigateTo('/')} aria-label="Éfata, página inicial"><Hand size={28} />Éfata</button>
        <button type="button" className="efata-theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
        </button>
      </nav>
      {renderPage()}
    </div>
  );
}
