
import React, { useState } from 'react';
import { SuccessCase, CaseStatus, AssetType, AssetPeriod, AssetView } from '../types';
import { Camera, MessageCircle, LineChart, FileText, Plus, X, Loader2 } from 'lucide-react';

interface NewCaseProps {
    onAddCase: (newCase: SuccessCase) => void;
    initialName?: string;
}

const NewCase: React.FC<NewCaseProps> = ({ onAddCase, initialName }) => {
    const [patientName, setPatientName] = useState(initialName || '');
    const [initialFear, setInitialFear] = useState('');
    const [lifeAchievement, setLifeAchievement] = useState('');
    const [assets, setAssets] = useState<{ id: string; url: string; type: AssetType; period: AssetPeriod; view: AssetView }[]>([]);

    React.useEffect(() => {
        if (initialName) setPatientName(initialName);
    }, [initialName]);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: AssetType) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        const uploadPromises = Array.from(files).map((file: File) => {
            return new Promise<{ id: string; url: string; type: AssetType; period: AssetPeriod; view: AssetView }>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve({
                        id: Math.random().toString(36).substr(2, 9),
                        url: reader.result as string,
                        type,
                        period: type === AssetType.BEFORE_AFTER ? AssetPeriod.BEFORE : AssetPeriod.NONE,
                        view: type === AssetType.BEFORE_AFTER ? AssetView.FRONT : AssetView.OTHER
                    });
                };
                reader.readAsDataURL(file);
            });
        });

        try {
            const newAssets = await Promise.all(uploadPromises);
            setAssets(prev => [...prev, ...newAssets]);
        } catch (error) {
            console.error("Error al subir:", error);
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const updateAsset = (id: string, updates: Partial<{ period: AssetPeriod; view: AssetView }>) => {
        setAssets(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    };

    const removeAsset = (id: string) => {
        setAssets(prev => prev.filter(a => a.id !== id));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientName || assets.length === 0) return;

        const newCase: SuccessCase = {
            id: Math.random().toString(36).substr(2, 9),
            patientName,
            initialFear,
            lifeAchievement,
            status: CaseStatus.DRAFT,
            createdAt: new Date().toISOString(),
            assets: assets.map(a => ({ id: a.id, url: a.url, type: a.type, period: a.period, view: a.view }))
        };

        onAddCase(newCase);
    };

    const sections = [
        { type: AssetType.BEFORE_AFTER, label: 'Fotos Antes/Después', icon: <Camera className="w-5 h-5 mr-4 text-blue-600" />, help: 'Taggea para comparar Perfil vs Perfil' },
        { type: AssetType.TELEGRAM, label: 'Pantallazos de Chats', icon: <MessageCircle className="w-5 h-5 mr-4 text-blue-600" />, help: 'Evidencia social y sentimientos' },
        { type: AssetType.GRAPH, label: 'Gráficas de Evolución', icon: <LineChart className="w-5 h-5 mr-4 text-blue-600" />, help: 'Validación visual de la mejora' },
        { type: AssetType.HEALTH_DATA, label: 'Analíticas/Exámenes', icon: <FileText className="w-5 h-5 mr-4 text-blue-600" />, help: 'Datos médicos' },
    ];

    return (
        <div className="p-8 max-w-5xl mx-auto bg-slate-50 min-h-full">
            <header className="mb-12 text-center">
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter italic uppercase text-slate-900">Nueva Historia Vital</h2>
                <p className="text-slate-500 mt-4 text-lg">Busca el corazón del caso. Menos números, más sentimientos.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-10">
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 space-y-10 shadow-xl relative overflow-hidden">
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Nombre del Héroe/Heroína</label>
                        <input
                            type="text"
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                            placeholder="Ej. Sonia Fuentes"
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 focus:border-blue-500 outline-none text-2xl font-bold transition-all text-slate-900"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">¿Cuál era su mayor miedo/obstáculo?</label>
                            <textarea
                                value={initialFear}
                                onChange={(e) => setInitialFear(e.target.value)}
                                placeholder="Ej: 'Tenía miedo a comer carbohidratos porque pensaba que engordaban y se sentía juzgada...'"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 focus:border-rose-400 outline-none h-40 resize-none transition-all font-medium text-slate-700"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">¿Qué ha logrado que no sea un número?</label>
                            <textarea
                                value={lifeAchievement}
                                onChange={(e) => setLifeAchievement(e.target.value)}
                                placeholder="Ej: 'Dejar de sentir ansiedad, comer sin culpa y ahora puede jugar con su hijo pequeño en el suelo...'"
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 focus:border-amber-400 outline-none h-40 resize-none transition-all font-medium text-slate-700"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-12">
                    {sections.map((section) => {
                        const sectionAssets = assets.filter(a => a.type === section.type);
                        return (
                            <div key={section.type} className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                    <div>
                                        <h4 className="font-black text-2xl flex items-center italic uppercase tracking-wider text-slate-800">
                                            {section.icon}
                                            {section.label}
                                        </h4>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 ml-9">{section.help}</p>
                                    </div>
                                    <label className="bg-slate-50 hover:bg-slate-100 border border-slate-200 px-6 py-3 rounded-xl cursor-pointer font-black text-xs uppercase tracking-widest transition-all text-center flex items-center justify-center text-slate-600">
                                        <input
                                            type="file"
                                            className="hidden"
                                            multiple
                                            accept="image/*"
                                            onChange={(e) => handleFileUpload(e, section.type)}
                                        />
                                        <Plus className="w-4 h-4 mr-2" /> Añadir Imagen
                                    </label>
                                </div>

                                {sectionAssets.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {sectionAssets.map((asset) => (
                                            <div key={asset.id} className="bg-slate-50 rounded-3xl p-4 border border-slate-100 space-y-4 shadow-sm">
                                                <div className="aspect-[4/5] rounded-2xl overflow-hidden relative group">
                                                    <img src={asset.url} className="w-full h-full object-cover" />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAsset(asset.id)}
                                                        className="absolute top-2 right-2 w-8 h-8 bg-white/80 hover:bg-white text-rose-500 rounded-lg flex items-center justify-center shadow-lg transition-all"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                </div>

                                                {section.type === AssetType.BEFORE_AFTER && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <select
                                                            value={asset.period}
                                                            onChange={(e) => updateAsset(asset.id, { period: e.target.value as AssetPeriod })}
                                                            className="bg-white text-slate-700 text-[10px] font-bold uppercase p-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 cursor-pointer appearance-none text-center"
                                                        >
                                                            <option value={AssetPeriod.BEFORE}>Antes</option>
                                                            <option value={AssetPeriod.AFTER}>Después</option>
                                                        </select>
                                                        <select
                                                            value={asset.view}
                                                            onChange={(e) => updateAsset(asset.id, { view: e.target.value as AssetView })}
                                                            className="bg-white text-slate-700 text-[10px] font-bold uppercase p-2 rounded-lg border border-slate-200 outline-none focus:border-blue-500 cursor-pointer appearance-none text-center"
                                                        >
                                                            <option value={AssetView.FRONT}>Frente</option>
                                                            <option value={AssetView.PROFILE}>Perfil</option>
                                                            <option value={AssetView.BACK}>Espalda</option>
                                                            <option value={AssetView.CLOSEUP}>Detalle</option>
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed border-slate-200 rounded-3xl h-40 flex items-center justify-center text-slate-400">
                                        <p className="font-black text-[10px] uppercase tracking-widest">Sin material adjunto</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="pt-10 pb-20">
                    <button
                        type="submit"
                        disabled={isUploading || !patientName || assets.length === 0}
                        className="w-full bg-blue-600 hover:scale-[1.01] hover:bg-blue-700 disabled:opacity-50 text-white py-6 rounded-[2rem] font-black text-2xl shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center space-x-4"
                    >
                        {isUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <span>TRANSFORMAR EN HISTORIA VISCERAL</span>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NewCase;
