import React, { useState } from 'react';
import LandingPage from './pages/LandingPage';
import TranslatorPage from './pages/TranslatorPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState('/');

  const navigateTo = (path) => {
    setCurrentPage(path);
    window.scrollTo(0, 0);
  };

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
