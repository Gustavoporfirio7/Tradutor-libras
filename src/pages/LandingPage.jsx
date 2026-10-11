import React, { useEffect } from 'react';
import { FiArrowRight, FiAward, FiClock, FiUser, FiCamera, FiType, FiVolume2 } from 'react-icons/fi';
import { FaHandPaper } from 'react-icons/fa'; 
import { motion, useAnimation } from 'framer-motion';
import { useInView } from 'react-intersection-observer'; 

// Componente de Card Animado para as funcionalidades/diferenciais
const FeatureCard = ({ icon, title, description, color }) => {
  const controls = useAnimation();
  // useInView para animar o card quando ele entra na viewport
  const [ref, inView] = useInView({
    threshold: 0.1, // Começa a animar quando 10% do card está visível
    triggerOnce: true // Anima apenas uma vez
  });

  useEffect(() => {
    if (inView) {
      controls.start("visible");
    }
  }, [controls, inView]);

  const variants = {
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    },
    hidden: { 
      opacity: 0, 
      y: 30 
    }
  };

  // Mapeamento de cores para gradientes de fundo dos cards
  const bgColors = {
    blue: 'from-blue-500 to-blue-600',
    purple: 'from-purple-500 to-purple-600',
    indigo: 'from-indigo-500 to-indigo-600',
    pink: 'from-pink-500 to-pink-600'
  };

  const iconColors = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    pink: 'bg-pink-100 text-pink-600'
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={variants}
      whileHover={{ scale: 1.03 }} // Efeito de zoom no hover
      className={`bg-gradient-to-br ${bgColors[color]} p-0.5 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300`}
    >
      <div className="bg-white rounded-xl p-8 h-full">
        <div className={`w-16 h-16 ${iconColors[color]} rounded-xl flex items-center justify-center mb-6`}>
          {React.cloneElement(icon, { className: 'text-3xl' })} {/* Clona o ícone para aplicar cor e tamanho dinamicamente */}
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};

function LandingPage({ navigateTo }) {
  // Controles de animação para seções principais (Hero)
  const controls = useAnimation();
  const [ref, inView] = useInView({
    threshold: 0.1, // Anima quando 10% da seção está visível
    triggerOnce: true // Anima apenas uma vez
  });

  useEffect(() => {
    if (inView) {
      controls.start("visible");
    } else {
      controls.start("hidden");
    }
  }, [controls, inView]);

  // Variantes de animação para o container e itens do Hero
  const containerVariants = {
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2, // Atraso entre a animação dos filhos
        delayChildren: 0.3 // Atraso para o início da animação dos filhos
      }
    },
    hidden: { opacity: 0 }
  };

  const itemVariants = {
    visible: { 
      y: 0, 
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: [0.6, -0.05, 0.01, 0.99] // Curva de easing personalizada
      }
    },
    hidden: { y: 50, opacity: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white overflow-x-hidden">
      {/* Header Flutuante e Animado */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ 
          type: "spring", // Animação tipo mola
          damping: 20, // Amortecimento
          stiffness: 100 // Rigidez
        }}
        className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md z-50 py-4 px-6 sm:px-8 lg:px-12 shadow-sm"
      >
        <div className="container mx-auto flex justify-between items-center">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="flex items-center space-x-3 cursor-pointer"
          >
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
              <FaHandPaper className="text-white text-xl" /> {/* CORRIGIDO: Ícone da mão */}
            </div>
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              SignaWeb
            </h1>
          </motion.div>
          
          <motion.button 
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.4)" // Sombra no hover
            }}
            whileTap={{ scale: 0.95 }} // Efeito de clique
            onClick={() => navigateTo('/tradutor')}
            className="relative overflow-hidden px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold group"
          >
            <span className="relative z-10 flex items-center">
              Experimentar <FiArrowRight className="ml-2 transition-transform group-hover:translate-x-1" /> {/* Ícone de seta */}
            </span>
            {/* Efeito de brilho no botão */}
            <motion.span 
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 400, opacity: 0.4 }}
              transition={{
                repeat: Infinity,
                duration: 3,
                ease: "linear"
              }}
              className="absolute top-0 left-0 w-20 h-full bg-white/30 skew-x-12"
            />
          </motion.button>
        </div>
      </motion.header>

      {/* Seção Hero/Introdução com Efeitos Visuais e Animações */}
      <section className="relative min-h-screen flex items-center justify-center pt-24 pb-16 px-4 sm:px-8 lg:px-16 overflow-hidden">
        {/* Elementos decorativos animados de fundo (bolhas de cor) */}
        <motion.div 
          animate={{
            x: [0, 20, 0],
            y: [0, 30, 0],
            rotate: [0, 5, 0]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
        />
        
        <motion.div 
          animate={{
            x: [0, -30, 0],
            y: [0, 40, 0],
            rotate: [0, -8, 0]
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute top-1/3 right-1/4 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
        />
        
        <motion.div 
          animate={{
            x: [0, 25, 0],
            y: [0, -30, 0],
            rotate: [0, 3, 0]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute bottom-1/4 left-1/2 w-64 h-64 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
        />

        {/* Conteúdo principal do Hero com animações de entrada */}
        <motion.div 
          ref={ref}
          initial="hidden"
          animate={controls}
          variants={containerVariants}
          className="relative max-w-6xl mx-auto text-center z-10"
        >
          <motion.div variants={itemVariants} className="mb-8">
            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold shadow-sm">
              PROTÓTIPO EM DESENVOLVIMENTO
            </span>
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-tight mb-8">
            Explorando a <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">comunicação</span> por gestos
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-xl sm:text-2xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto">
            Duas formas de experimentar: texto ou voz em português para sinais com o VLibras, e câmera para reconhecer gestos e testar palavras cadastradas.
          </motion.p>
          
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-center gap-4">
            <motion.button
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.4)" 
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigateTo('/tradutor')}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl text-lg shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Abrir tradutor
            </motion.button>
            <motion.button
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" 
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => document.getElementById('demonstracao')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-white text-gray-700 font-bold rounded-xl text-lg border-2 border-gray-200 hover:border-blue-400 transition-all duration-300"
            >
              Ver gestos disponíveis
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      <section id="demonstracao" className="scroll-mt-24 px-6 py-12 bg-blue-50 text-center">
        <h2 className="text-2xl font-bold mb-4">Gestos disponíveis no protótipo</h2>
        <p className="text-gray-700 mb-4">Mão aberta · Mão fechada (punho) · Positivo · Vitória / Paz</p>
        <p className="text-gray-600">Use uma mão por vez e mantenha o gesto estável por um instante. O reconhecimento da câmera ainda é experimental. Para português em sinais, use a opção Texto ou voz → Libras.</p>
      </section>
      {/* Seção de Diferenciais (Por que escolher?) */}
      <section className="py-20 px-4 sm:px-8 lg:px-16 bg-white">
        <div className="container mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true, margin: "-100px" }} // Anima quando entra na view, uma vez
            className="text-center mb-16"
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Por que escolher o SignaWeb?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Conheça os recursos disponíveis nesta etapa do projeto.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<FiAward />} // Ícone de prêmio
              title="Gestos Básicos"
              description="Teste quatro gestos básicos e cadastre exemplos de sinais estáticos de uma mão para reconhecer palavras."
              color="blue"
            />
            <FeatureCard
              icon={<FiClock />} // Ícone de relógio
              title="Tempo Real"
              description="Acompanha a mão pela webcam e aguarda o gesto ficar estável antes de mostrar o resultado."
              color="purple"
            />
            <FeatureCard
              icon={<FiUser />} // Ícone de usuário
              title="Acessível"
              description="Use um navegador compatível com acesso à webcam. Os resultados podem variar conforme o dispositivo."
              color="indigo"
            />
          </div>
        </div>
      </section>

      {/* Seção de Funcionalidades Detalhadas */}
      <section className="py-20 px-4 sm:px-8 lg:px-16 bg-gradient-to-b from-white to-blue-50">
        <div className="container mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold mb-4">
              TECNOLOGIA
            </span>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Como transformamos gestos em voz
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A câmera acompanha a mão para testar palavras cadastradas. Na outra direção, texto digitado ou ditado pode ser exibido em sinais pelo avatar do VLibras.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<FiCamera />} // Ícone de câmera
              title="Captura pela Câmera"
              description="Para melhores resultados, mantenha a mão visível e use um ambiente bem iluminado."
              color="blue"
            />
            <FeatureCard
              icon={<FaHandPaper />} // CORRIGIDO: Ícone de mão
              title="Reconhecimento 3D"
              description="O detector estima pontos das mãos; o protótipo reconhece um gesto de uma mão por vez."
              color="purple"
            />
            <FeatureCard
              icon={<FiType />} // Ícone de texto
              title="Reconhecimento de Gestos"
              description="O reconhecimento experimental compara a mão com exemplos cadastrados. Ainda não há um modelo geral de Libras."
              color="indigo"
            />
            <FeatureCard
              icon={<FiVolume2 />} // Ícone de volume
              title="Leitura em Voz"
              description="Leitura em português do Brasil usando as vozes disponíveis no navegador."
              color="pink"
            />
          </div>
        </div>
      </section>

      {/* Rodapé Aprimorado */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="container mx-auto flex flex-col sm:flex-row justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold mb-3">SignaWeb</h3>
            <p className="text-gray-400">Projeto em desenvolvimento para apoiar a comunicação em Libras.</p>
          </div>
          <p className="text-gray-400 text-sm">&copy; {new Date().getFullYear()} SignaWeb. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
