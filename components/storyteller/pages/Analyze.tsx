
import React, { useEffect, useState, useCallback } from 'react';
import { SuccessCase, AIOutput } from '../types';
import { analyzeCase } from '../services/geminiService';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface AnalyzeProps {
    successCase: SuccessCase;
    onAnalysisComplete: (output: AIOutput) => void;
}

const Analyze: React.FC<AnalyzeProps> = ({ successCase, onAnalysisComplete }) => {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Iniciando análisis multimodal...');
    const [error, setError] = useState<string | null>(null);

    const runAnalysis = useCallback(async () => {
        setError(null);
        setProgress(5);
        try {
            setStatus('Extrayendo métricas de analíticas...');
            setProgress(20);

            // Simulación de pasos para feedback visual mejorado
            await new Promise(r => setTimeout(r, 800));
            setStatus('Detectando frases de impacto emocional...');
            setProgress(45);

            await new Promise(r => setTimeout(r, 800));
            setStatus('Gemini está estructurando tu narrativa visceral...');
            setProgress(70);

            const result = await analyzeCase(successCase);

            setProgress(100);
            setStatus('¡Todo listo! Generando briefing...');

            setTimeout(() => {
                onAnalysisComplete(result);
            }, 1000);
        } catch (err: any) {
            console.error("Analysis failed:", err);
            setError(err.message || 'Error desconocido durante el análisis.');
            setStatus('El análisis se ha detenido.');
        }
    }, [successCase, onAnalysisComplete]);

    useEffect(() => {
        runAnalysis();
    }, [runAnalysis]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-8 bg-slate-900 rounded-2xl m-4">
            {error ? (
                <div className="text-center space-y-6 max-w-md">
                    <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Vaya, algo ha fallado</h2>
                    <p className="text-gray-400">{error}</p>
                    <button
                        onClick={runAnalysis}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition flex items-center justify-center space-x-2 w-full"
                    >
                        <RotateCcw className="w-5 h-5" />
                        <span>Reintentar Análisis</span>
                    </button>
                </div>
            ) : (
                <>
                    <div className="relative w-48 h-48 mb-12">
                        <div className="absolute inset-0 border-8 border-white/5 rounded-full"></div>
                        <div
                            className="absolute inset-0 border-8 border-blue-500 rounded-full border-t-transparent animate-spin transition-all duration-500"
                            style={{ animationDuration: '1.5s' }}
                        ></div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-white">{progress}%</span>
                            <span className="text-[10px] uppercase font-bold text-blue-500 tracking-widest mt-1">IA PROCESANDO</span>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold mb-4 text-center text-white">{status}</h2>
                    <p className="text-gray-400 text-center max-w-sm leading-relaxed">
                        Nuestros modelos están analizando tus evidencias para extraer el máximo valor emocional y clínico.
                    </p>

                    <div className="mt-12 flex space-x-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${progress >= i * 25 ? 'bg-blue-500 scale-125 shadow-lg shadow-blue-500/40' : 'bg-white/10'
                                    }`}
                            ></div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default Analyze;
