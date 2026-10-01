import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Camera, History, Volume2, AlertCircle } from 'lucide-react';
import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands';
import { Camera as CameraUtils } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { classifyHandGesture } from '../utils/utilities';

export default function TranslatorPage({ navigateTo }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraInstanceRef = useRef(null);

  const [translatedText, setTranslatedText] = useState("");
  const [history, setHistory] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState("Aguardando ativação...");

  // Fala o texto traduzido via Web Speech API
  const speakText = (textToSpeak) => {
    const text = textToSpeak || translatedText;
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    window.speechSynthesis.speak(utterance);
  };

  // Inicializa o MediaPipe Hands
  const startDetection = () => {
    setStatus("A carregar modelo de IA...");
    setIsCapturing(true);

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });

    hands.onResults((results) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        setStatus("Mão detetada!");
        const landmarks = results.multiHandLandmarks[0];

        // Desenha o esqueleto e os nós da mão
        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#3b82f6', lineWidth: 4 });
        drawLandmarks(ctx, landmarks, { color: '#ffffff', fillColor: '#1d4ed8', lineWidth: 2, radius: 4 });

        // Identifica o sinal
        const detectedGesture = classifyHandGesture(landmarks);
        if (detectedGesture && detectedGesture !== translatedText) {
          setTranslatedText(detectedGesture);
          setHistory((prev) => [detectedGesture, ...prev.filter(item => item !== detectedGesture)].slice(0, 5));
          speakText(detectedGesture);
        }
      } else {
        setStatus("Posicione a mão no centro da câmara");
      }

      ctx.restore();
    });

    if (videoRef.current) {
      const camera = new CameraUtils(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current) {
            await hands.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480
      });

      camera.start();
      cameraInstanceRef.current = camera;
    }
  };

  const stopDetection = () => {
    if (cameraInstanceRef.current) {
      cameraInstanceRef.current.stop();
      cameraInstanceRef.current = null;
    }
    setIsCapturing(false);
    setStatus("Câmara desligada");
    setTranslatedText("");

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#f0f4f8]">
      {/* Cabeçalho */}
      <header className="bg-white shadow-sm p-4 flex justify-between items-center px-6 border-b border-gray-200">
        <button 
          onClick={() => { stopDetection(); navigateTo('/'); }} 
          className="flex items-center text-gray-500 hover:text-blue-600 font-bold gap-2 group transition-all"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1" /> Voltar
        </button>
        <h2 className="text-xl font-black">Área do <span className="text-blue-500">Tradutor</span></h2>
        <div className="w-10"></div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col lg:flex-row p-6 gap-6 overflow-hidden">
        {/* Painel do Vídeo */}
        <div className="flex-1 bg-black rounded-[2.5rem] overflow-hidden relative border-8 border-white shadow-2xl flex items-center justify-center">
          <video 
            ref={videoRef} 
            playsInline 
            className={`w-full h-full object-cover transform -scale-x-100 ${!isCapturing ? 'hidden' : 'block'}`} 
          />
          <canvas 
            ref={canvasRef} 
            className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none ${!isCapturing ? 'hidden' : 'block'}`} 
          />

          {!isCapturing ? (
            <div className="flex flex-col items-center justify-center text-white p-8 text-center">
              <Camera className="w-20 h-20 mb-6 opacity-25" />
              <h3 className="text-2xl font-bold mb-4">A câmara está desligada</h3>
              <p className="text-gray-400 mb-6 max-w-sm">Ativa a webcam para que a IA possa desenhar o esqueleto da mão e traduzir os teus gestos.</p>
              <button 
                onClick={startDetection} 
                className="bg-blue-500 hover:bg-blue-600 px-10 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-blue-500/30"
              >
                Ativar Câmara
              </button>
            </div>
          ) : (
            <div className="absolute top-6 left-6 bg-black/50 backdrop-blur-md text-white px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 border border-white/20">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
              {status}
            </div>
          )}
        </div>

        {/* Painel de Resultados */}
        <div className="w-full lg:w-[400px] flex flex-col gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 text-center">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Tradução Atual</h4>
            <p className="text-4xl font-black text-[#1f2937] min-h-[60px] italic">
              {translatedText ? `"${translatedText}"` : "..."}
            </p>
            {translatedText && (
              <button 
                onClick={() => speakText()} 
                className="mt-4 inline-flex items-center gap-2 text-blue-500 hover:text-blue-700 font-bold text-sm"
              >
                <Volume2 className="w-4 h-4" /> Repetir Áudio
              </button>
            )}
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <History className="w-4 h-4" /> Histórico Recente
            </h4>
            <div className="space-y-3 overflow-y-auto pr-2">
              {history.length > 0 ? (
                history.map((h, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-2xl font-bold flex justify-between items-center border border-transparent hover:border-blue-100 transition-colors">
                    <span className="text-[#1f2937]">{h}</span>
                    <Volume2 
                      className="w-4 h-4 text-gray-400 cursor-pointer hover:text-blue-500" 
                      onClick={() => speakText(h)} 
                    />
                  </div>
                ))
              ) : (
                <p className="text-gray-300 text-sm text-center py-16 italic">Aguardando sinais...</p>
              )}
            </div>
          </div>

          {isCapturing && (
            <button 
              onClick={stopDetection} 
              className="bg-red-50 text-red-600 hover:bg-red-100 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors border border-red-200"
            >
              <AlertCircle className="w-4 h-4" /> Parar Reconhecimento
            </button>
          )}
        </div>
      </main>
    </div>
  );
}