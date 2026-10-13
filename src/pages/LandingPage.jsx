import React from 'react';
import { ArrowRight, Camera, MessageCircle, Hand, BookOpen } from 'lucide-react';

export default function LandingPage({ navigateTo }) {
  return <div className="efata-home">
    <section className="efata-hero">
      <span className="efata-tag">PROTÓTIPO EM DESENVOLVIMENTO</span>
      <h1>Éfata.<br /><span>Abra caminhos para a comunicação.</span></h1>
      <p>Um espaço para aproximar pessoas por meio de Libras, texto e voz. Experimente o alfabeto manual, ensine sinais e acompanhe cada reconhecimento.</p>
      <div className="efata-actions">
        <button onClick={() => navigateTo('/tradutor')} className="efata-primary">Abrir tradutor <ArrowRight size={20} /></button>
        <button onClick={() => document.getElementById('historia-efata')?.scrollIntoView({ behavior: 'smooth' })} className="efata-secondary">Por que Éfata?</button>
      </div>
      <div className="efata-feature-grid">
        <article><Hand /><h2>Alfabeto manual</h2><p>Referência de A a Z e Ç, leitura de configurações iniciais e cadastro de letras que precisam de exemplos.</p></article>
        <article><Camera /><h2>Sinais pela câmera</h2><p>Acompanhe letras e sinais reconhecidos no histórico. Cadastre posturas e movimentos para ampliar seu vocabulário.</p></article>
        <article><MessageCircle /><h2>Texto e voz em Libras</h2><p>Digite ou fale em português e use o avatar do VLibras para visualizar os sinais.</p></article>
      </div>
    </section>
    <section id="historia-efata" className="efata-story">
      <div><span className="efata-tag"><BookOpen size={16} /> A inspiração do nome</span><h2>Éfata: um convite a abrir-se.</h2></div>
      <div className="efata-story-copy">
        <p>O nome Éfata se inspira na expressão bíblica “Efatá”, apresentada em Marcos 7:31–37. Nessa passagem, Jesus encontra um homem surdo que tinha dificuldade para falar e lhe diz: “Efatá, isto é, abre-te” (Marcos 7:34).</p>
        <p>Para o nosso aplicativo, essa inspiração representa abrir caminhos para o diálogo, a escuta e o encontro entre pessoas. A tecnologia pode ajudar a diminuir barreiras e criar mais oportunidades de comunicação.</p>
        <p>Libras é uma língua completa. O Éfata valoriza a identidade surda e a autonomia de cada pessoa; sua proposta é apoiar a comunicação, respeitando diferentes formas de se expressar.</p>
        <a href="https://www.biblegateway.com/passage/?search=Marcos%207%3A31-37&version=ARC" target="_blank" rel="noreferrer">Ler a passagem de Marcos 7:31–37 <ArrowRight size={16} /></a>
      </div>
    </section>
    <section className="efata-note"><h2>Uma construção em andamento</h2><p>O reconhecimento pela câmera ainda é experimental. Letras e sinais parecidos exigem exemplos e validação com usuários de Libras; frases completas também envolvem movimento, rosto, corpo e contexto.</p></section>
    <footer className="efata-footer"><strong>Éfata</strong><p>Abrindo caminhos para a comunicação.</p><span>© {new Date().getFullYear()} Éfata</span></footer>
  </div>;
}
