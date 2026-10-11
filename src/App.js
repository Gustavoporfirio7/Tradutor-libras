import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import TranslatorPage from './pages/TranslatorPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
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
      default:
        return <NotFoundPage navigateTo={navigateTo} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] text-[#1f2937] font-sans antialiased">
      {renderPage()}
    </div>
  );
}
