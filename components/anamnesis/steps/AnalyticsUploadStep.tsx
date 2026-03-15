import React, { useState, useRef } from 'react';
import { Upload, FileText, X, Image, Loader2, CheckCircle2, Info } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';

interface Props {
    clientId: string;
    uploadedUrls: string[];
    onUrlsChange: (urls: string[]) => void;
}

export function AnalyticsUploadStep({ clientId, uploadedUrls, onUrlsChange }: Props) {
    const [isUploading, setIsUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFiles = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        setIsUploading(true);
        const newUrls: string[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                alert(`El archivo "${file.name}" supera los 10MB permitidos.`);
                continue;
            }

            const ext = file.name.split('.').pop()?.toLowerCase();
            const allowed = ['jpg', 'jpeg', 'png', 'pdf', 'webp', 'heic'];
            if (!allowed.includes(ext || '')) {
                alert(`Formato no permitido: .${ext}. Usa JPG, PNG, PDF o WebP.`);
                continue;
            }

            const timestamp = Date.now();
            const fileName = `analytics/${clientId}/${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

            try {
                const { data, error } = await supabase.storage
                    .from('medical-reports')
                    .upload(fileName, file);

                if (error) {
                    console.error('Error subiendo archivo:', error);
                    alert(`Error al subir "${file.name}": ${error.message}`);
                    continue;
                }

                if (data) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('medical-reports')
                        .getPublicUrl(fileName);
                    newUrls.push(publicUrl);
                }
            } catch (err) {
                console.error('Error inesperado:', err);
            }
        }

        if (newUrls.length > 0) {
            onUrlsChange([...uploadedUrls, ...newUrls]);
        }
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (index: number) => {
        const updated = uploadedUrls.filter((_, i) => i !== index);
        onUrlsChange(updated);
    };

    const getFileType = (url: string): 'pdf' | 'image' => {
        return url.toLowerCase().includes('.pdf') ? 'pdf' : 'image';
    };

    const getFileName = (url: string) => {
        const parts = url.split('/');
        const full = parts[parts.length - 1];
        // Remove timestamp prefix
        const withoutTimestamp = full.replace(/^\d+_/, '');
        return decodeURIComponent(withoutTimestamp).replace(/_/g, ' ');
    };

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Analíticas Recientes</h3>
                <p className="text-slate-600">
                    Sube tu última analítica de sangre para que tu coach y el endocrino puedan revisarla.
                </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                    <p className="font-bold mb-1">Formatos aceptados</p>
                    <p>JPG, PNG, PDF o WebP (máx. 10MB por archivo). Puedes subir varias páginas o archivos.</p>
                    <p className="mt-1">Si no tienes analítica reciente, puedes saltar este paso y subirla más adelante desde tu portal.</p>
                </div>
            </div>

            {/* Drop zone */}
            <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                    dragOver
                        ? 'border-accent-500 bg-accent-50'
                        : 'border-slate-300 hover:border-accent-400 hover:bg-slate-50'
                } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    handleFiles(e.dataTransfer.files);
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf,.webp,.heic"
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                />

                {isUploading ? (
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-10 h-10 text-accent-600 animate-spin" />
                        <p className="font-bold text-slate-700">Subiendo archivos...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-accent-100 flex items-center justify-center">
                            <Upload className="w-8 h-8 text-accent-600" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-700">
                                Arrastra tus archivos aquí o haz clic para seleccionar
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                                Fotos de la analítica, PDF del laboratorio...
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Uploaded files */}
            {uploadedUrls.length > 0 && (
                <div className="space-y-3">
                    <p className="text-sm font-bold text-slate-700">
                        <CheckCircle2 className="w-4 h-4 inline mr-1 text-accent-600" />
                        {uploadedUrls.length} archivo{uploadedUrls.length > 1 ? 's' : ''} subido{uploadedUrls.length > 1 ? 's' : ''}
                    </p>
                    {uploadedUrls.map((url, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-3">
                            {getFileType(url) === 'pdf' ? (
                                <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                                    <FileText className="w-6 h-6 text-red-500" />
                                </div>
                            ) : (
                                <img
                                    src={url}
                                    alt={`Analítica ${idx + 1}`}
                                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center"><svg class="w-6 h-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';
                                    }}
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">
                                    {getFileName(url)}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {getFileType(url) === 'pdf' ? 'Documento PDF' : 'Imagen'}
                                </p>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                title="Eliminar"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
