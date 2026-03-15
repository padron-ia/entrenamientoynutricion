import React, { useState, useEffect } from 'react';
import { Client, MedicalReview, UserRole } from '../types';
import { mockDb } from '../services/mockSupabase';
import { supabase } from '../services/supabaseClient';
import { Stethoscope, FileText, Send, Clock, CheckCircle2, AlertCircle, Video, Plus, X, UploadCloud, ChevronDown, ChevronUp, Zap } from 'lucide-react';

interface MedicalReviewsProps {
    client: Client;
    currentUserRole?: UserRole;
}

const MedicalReviews: React.FC<MedicalReviewsProps> = ({ client, currentUserRole }) => {
    const [reviews, setReviews] = useState<MedicalReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCheckingBucket, setIsCheckingBucket] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [hasValidAuthSession, setHasValidAuthSession] = useState<boolean | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<MedicalReview>>({
        diabetes_type: client.medical?.diabetesType || 'No diabético',
        insulin_usage: client.medical?.insulin,
        insulin_dose: client.medical?.insulinDose,
        medication: client.medical?.medication,
        comments: '',
        report_type: 'Analítica',
        file_urls: []
    });

    const refreshAuthSessionStatus = async () => {
        if (client?.isMockSession) {
            setHasValidAuthSession(false);
            return;
        }

        const { data: authSessionData } = await supabase.auth.getSession();
        setHasValidAuthSession(!!authSessionData.session?.user);
    };

    useEffect(() => {
        if (client?.id) {
            console.log('👤 [DEBUG] Cliente:', client.name, '(ID:', client.id, ')');
            console.log('🔑 [DEBUG] Sesión:', client.isMockSession ? '🚧 MOCK (Backdoor)' : '✅ REAL (Supabase Auth)');
            if (client.isMockSession) {
                console.warn('⚠️ ATENCIÓN: Estás en sesión Mock. Las subidas a Supabase Storage y el RLS fallarán porque Supabase no reconoce tu identidad sin un login real.');
            }
            loadReviews();
            refreshAuthSessionStatus();
        }
    }, [client?.id]);

    const runDiagnostic = async () => {
        setIsCheckingBucket(true);
        console.log('🧪 Iniciando diagnóstico de conexión...');

        try {
            // 1. Check REST / Tables (406 debug)
            const { error: restError } = await supabase.from('medical_reviews').select('count', { count: 'exact', head: true });
            if (restError) {
                console.error('❌ Error REST (medical_reviews):', restError);
            } else {
                console.log('✅ Conexión REST a medical_reviews estable.');
            }

            // 2. Check Storage / Bucket (400 debug)
            const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
            if (bucketError) {
                console.error('❌ Error Storage (listBuckets):', bucketError);
                alert(`Error al verificar buckets: ${bucketError.message}`);
            } else {
                const medicalBucket = buckets?.find(b => b.id === 'medical-reports');
                if (medicalBucket) {
                    console.log('✅ Bucket "medical-reports" encontrado y accesible.');
                    alert('Conexión Correcta: El bucket "medical-reports" existe y es accesible.');
                } else {
                    console.error('❌ Bucket "medical-reports" NO ENCONTRADO.');
                    alert('Error Grave: El bucket "medical-reports" no existe en Supabase. Debes crearlo manualmente.');
                }
            }
        } catch (err: any) {
            console.error('❌ Error inesperado en diagnóstico:', err);
            alert(`Error inesperado: ${err.message}`);
        } finally {
            setIsCheckingBucket(false);
        }
    };

    const loadReviews = async () => {
        setLoading(true);
        try {
            const data = await mockDb.medical.getByClient(client.id);
            setReviews(data.filter(r => r.report_type !== 'Informe Médico'));
        } catch (err) {
            console.error('Error loading reviews:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (client?.isMockSession) {
            alert('No se puede enviar en sesión de demostración. Inicia sesión real para continuar.');
            return;
        }

        const { data: authSessionData } = await supabase.auth.getSession();
        if (!authSessionData.session?.user) {
            setHasValidAuthSession(false);
            alert('Tu sesión ha expirado. Cierra sesión e inicia de nuevo para enviar la solicitud.');
            return;
        }

        setSubmitting(true);
        try {
            await mockDb.medical.create({
                client_id: client.id,
                coach_id: client.coach_id,
                ...formData
            });
            await loadReviews();
            setShowForm(false);
            // Reset form but keep some defaults
            setFormData({
                diabetes_type: client.medical?.diabetesType || 'No diabético',
                insulin_usage: client.medical?.insulin,
                insulin_dose: client.medical?.insulinDose,
                medication: client.medical?.medication,
                comments: '',
                report_type: 'Analítica',
                file_urls: []
            });
        } catch (err) {
            alert('Error al enviar la solicitud.');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        if (status === 'reviewed') return <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-bold border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Revisado</span>;
        return <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-bold border border-amber-200"><Clock className="w-3 h-3" /> Pendiente</span>;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* HEADER */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="bg-purple-100 p-2 rounded-xl text-purple-600">
                            <Stethoscope className="w-6 h-6" />
                        </div>
                        Revisiones Médicas (Endocrino)
                    </h2>
                    <p className="text-slate-500 mt-2 max-w-xl">
                        Espacio privado para compartir tus analíticas y consultas médicas con nuestro equipo de endocrinología.
                    </p>
                    <div className="mt-3">
                        {client?.isMockSession || hasValidAuthSession === false ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full border border-red-200">
                                <AlertCircle className="w-3.5 h-3.5" /> Sesión no válida para subir archivos
                            </span>
                        ) : hasValidAuthSession === true ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Sesión verificada
                            </span>
                        ) : null}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={runDiagnostic}
                        disabled={isCheckingBucket}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors text-xs font-bold"
                    >
                        <Zap className={`w-4 h-4 ${isCheckingBucket ? 'animate-pulse text-amber-500' : ''}`} />
                        {isCheckingBucket ? 'Verificando...' : 'Verificar Conexión'}
                    </button>
                    {!showForm && currentUserRole !== UserRole.COACH && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-purple-200 flex items-center gap-2 transition-transform hover:scale-105"
                        >
                            <Plus className="w-5 h-5" /> Nueva Solicitud
                        </button>
                    )}
                </div>
            </div>

            {/* FORMULARIO */}
            {showForm && (
                <div className="bg-white rounded-3xl shadow-lg border border-purple-100 overflow-hidden relative">
                    <div className="bg-purple-50 p-6 border-b border-purple-100 flex justify-between items-center">
                        <h3 className="font-bold text-purple-900 flex items-center gap-2">
                            <FileText className="w-5 h-5" /> Nueva Solicitud de Revisión
                        </h3>
                        <button onClick={() => setShowForm(false)} className="text-purple-400 hover:text-purple-700 transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* COL 1 */}
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Tipo de Informe</label>
                                    <select
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none transition-all font-medium"
                                        value={formData.report_type}
                                        onChange={e => setFormData({ ...formData, report_type: e.target.value })}
                                    >
                                        <option value="Analítica">Analítica</option>
                                        <option value="Revisión General">Revisión General</option>
                                        <option value="Consulta Específica">Consulta Específica</option>
                                        <option value="Urgencia">Urgencia</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">¿Eres Diabético?</label>
                                    <select
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                        value={formData.diabetes_type}
                                        onChange={e => setFormData({ ...formData, diabetes_type: e.target.value })}
                                    >
                                        <option value="No diabético">No soy diabético</option>
                                        <option value="Tipo 1">Tipo 1</option>
                                        <option value="Tipo 2">Tipo 2</option>
                                        <option value="Gestacional">Gestacional</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">¿Usas Insulina?</label>
                                        <select
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                            value={formData.insulin_usage}
                                            onChange={e => setFormData({ ...formData, insulin_usage: e.target.value })}
                                        >
                                            <option value="No">No</option>
                                            <option value="Si">Sí</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700">Dosis</label>
                                        <input
                                            type="text"
                                            placeholder="Ej: 10u Lantus"
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                                            value={formData.insulin_dose || ''}
                                            onChange={e => setFormData({ ...formData, insulin_dose: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* COL 2 */}
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Medicación Actual</label>
                                    <textarea
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[80px]"
                                        placeholder="Lista tu medicación..."
                                        value={formData.medication || ''}
                                        onChange={e => setFormData({ ...formData, medication: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 mb-1 flex justify-between">
                                        Subir Informes (PDF/Jpg)
                                        <span className={`text-xs font-bold uppercase ${formData.file_urls && formData.file_urls.length >= 4
                                            ? 'text-amber-500'
                                            : formData.file_urls && formData.file_urls.length > 0
                                                ? 'text-emerald-500'
                                                : 'text-slate-400'
                                            }`}>
                                            {formData.file_urls?.length || 0}/4 archivos
                                        </span>
                                    </label>
                                    <div className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${formData.file_urls && formData.file_urls.length >= 4
                                        ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
                                        : 'border-slate-200 hover:bg-slate-50 cursor-pointer group'
                                        }`}>
                                        {client?.isMockSession && (
                                            <div className="absolute inset-0 z-[60] bg-white/90 flex flex-col items-center justify-center p-4 rounded-xl">
                                                <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
                                                <p className="text-xs font-bold text-amber-900 text-center">
                                                    Modo Demostración Detectado
                                                </p>
                                                <p className="text-[10px] text-amber-700 text-center mt-1">
                                                    Para subir archivos reales a Supabase necesitas iniciar sesión con una cuenta real (no Master Pass).
                                                </p>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            multiple
                                            disabled={formData.file_urls && formData.file_urls.length >= 4}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-50"
                                            onChange={async (e) => {
                                                console.log('📎 Cambio detectado en input de archivos');

                                                if (client?.isMockSession) {
                                                    alert('No se puede subir archivos en sesión de demostración. Inicia sesión real para continuar.');
                                                    return;
                                                }

                                                const { data: authSessionData } = await supabase.auth.getSession();
                                                if (!authSessionData.session?.user) {
                                                    alert('Tu sesión ha expirado. Cierra sesión e inicia de nuevo para poder subir analíticas.');
                                                    return;
                                                }

                                                const files = e.target.files;
                                                if (!files) {
                                                    console.log('⚠️ No hay archivos seleccionados');
                                                    return;
                                                }
                                                console.log(`📂 ${files.length} archivos detectados.`);

                                                const currentCount = formData.file_urls?.length || 0;
                                                const maxFiles = 4;
                                                const availableSlots = maxFiles - currentCount;

                                                if (availableSlots <= 0) {
                                                    alert('Ya has alcanzado el máximo de 4 archivos.');
                                                    return;
                                                }

                                                // Limit files to available slots
                                                const filesToUpload = Array.from(files).slice(0, availableSlots);
                                                if (files.length > availableSlots) {
                                                    alert(`Solo se subirán ${availableSlots} archivo(s). Máximo 4 en total.`);
                                                }

                                                const newUrls = [...(formData.file_urls || [])];
                                                for (const fileObj of filesToUpload) {
                                                    const file = fileObj as File;
                                                    // Limpia el nombre del archivo de caracteres especiales que rompan la URL (acentos, en-dash, etc)
                                                    const sanitizedFileName = (file.name || 'document')
                                                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita acentos
                                                        .replace(/[^a-zA-Z0-9.-]/g, "_") // Quita todo lo que no sea letra, numero, punto o guion
                                                        .replace(/_{2,}/g, "_"); // Quita guiones bajos seguidos

                                                    const fileName = `${client.id}/${Date.now()}_${sanitizedFileName}`;

                                                    console.log(`📤 Subiendo archivo: ${fileName}...`);
                                                    const { data: uploadData, error: uploadError } = await supabase.storage
                                                        .from('medical-reports')
                                                        .upload(fileName, file);

                                                    if (uploadError) {
                                                        console.error('❌ Error en upload:', uploadError);
                                                        let errorMsg = uploadError.message;
                                                        if (uploadError.message.includes('400') || uploadError.message === 'Bad Request') {
                                                            errorMsg = "Error 400: El servidor rechazó la subida. Esto suele ocurrir si el bucket 'medical-reports' no existe o la sesión no es válida.";
                                                        }
                                                        alert(`Error al subir ${file.name}: ${errorMsg}`);
                                                        continue;
                                                    }

                                                    if (uploadData) {
                                                        const { data: { publicUrl } } = supabase.storage
                                                            .from('medical-reports')
                                                            .getPublicUrl(fileName);
                                                        newUrls.push(publicUrl);
                                                        console.log('✅ URL obtenida:', publicUrl);
                                                    }
                                                }
                                                setFormData({ ...formData, file_urls: newUrls });
                                            }}
                                        />
                                        <div className={`rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2 transition-transform ${formData.file_urls && formData.file_urls.length >= 4
                                            ? 'bg-slate-100 text-slate-400'
                                            : 'bg-purple-50 text-purple-600 group-hover:scale-110'
                                            }`}>
                                            <UploadCloud className="w-5 h-5" />
                                        </div>
                                        {formData.file_urls && formData.file_urls.length >= 4 ? (
                                            <>
                                                <p className="text-sm text-slate-400 font-medium">Máximo alcanzado</p>
                                                <p className="text-xs text-slate-400 mt-1">Elimina algún archivo para subir más</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-sm text-slate-500 font-medium">Click para subir o arrastra aquí</p>
                                                <p className="text-xs text-slate-400 mt-1">PDF, JPG o PNG (máx. 4 archivos)</p>
                                            </>
                                        )}
                                    </div>
                                    {formData.file_urls && formData.file_urls.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {formData.file_urls.map((url, idx) => (
                                                <div key={idx} className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-600">
                                                    <FileText size={10} /> Doc {idx + 1}
                                                    <button type="button" onClick={() => setFormData({ ...formData, file_urls: formData.file_urls?.filter((_, i) => i !== idx) })} className="text-red-500 hover:text-red-700 ml-1">
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* FULL WIDTH */}
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-sm font-bold text-slate-700">Comentarios / Dudas para el Endocrino</label>
                                <textarea
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none min-h-[120px] focus:ring-2 focus:ring-purple-500/20"
                                    placeholder="Explica qué tal duermes, niveles de energía, dolores, o preguntas específicas..."
                                    value={formData.comments}
                                    onChange={e => setFormData({ ...formData, comments: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || client?.isMockSession || hasValidAuthSession === false}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-purple-200 flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <Send className="w-5 h-5" />}
                                Enviar Solicitud
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* LISTA DE REVISIONES */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-12 text-slate-400">Cargando historial...</div>
                ) : reviews.length === 0 ? (
                    <div className="bg-slate-50 rounded-3xl p-12 text-center border border-slate-200 border-dashed">
                        <div className="bg-white p-4 rounded-full shadow-sm w-16 h-16 flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-1">Sin Revisiones</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">
                            No has enviado ninguna solicitud todavía. Usa el botón "Nueva Solicitud" cuando necesites revisión.
                        </p>
                    </div>
                ) : (
                    reviews.map(review => (
                        <div key={review.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded uppercase tracking-wide">
                                            {review.report_type}
                                        </span>
                                        <span className="text-sm text-slate-400 flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(review.submission_date).toLocaleDateString()}
                                        </span>
                                        {getStatusBadge(review.status)}
                                    </div>
                                    <p className="text-slate-800 font-medium line-clamp-2">"{review.comments}"</p>
                                </div>
                            </div>

                            {/* ARCHIVOS ADJUNTOS */}
                            {review.file_urls && review.file_urls.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {review.file_urls.map((url, idx) => (
                                        <a
                                            key={idx}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 transition-colors"
                                        >
                                            <FileText size={12} className="text-purple-500" />
                                            Doc {idx + 1}
                                        </a>
                                    ))}
                                </div>
                            )}

                            {/* RESPUESTA DEL DOCTOR */}
                            {review.status === 'reviewed' && (
                                <div className="mt-4 bg-emerald-50/50 rounded-xl p-5 border border-emerald-100 animate-in fade-in">
                                    <h4 className="font-bold text-emerald-900 flex items-center gap-2 mb-3">
                                        <Stethoscope className="w-4 h-4" /> Respuesta del Endocrino
                                    </h4>

                                    {review.doctor_video_url && (
                                        <a
                                            href={review.doctor_video_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-emerald-700 transition-colors shadow-sm mb-3"
                                        >
                                            <Video className="w-4 h-4" /> Ver Video Respuesta
                                        </a>
                                    )}

                                    <p className="text-emerald-800/80 text-sm leading-relaxed whitespace-pre-wrap">
                                        {review.doctor_notes || 'Sin notas adicionales.'}
                                    </p>
                                    <p className="text-xs text-emerald-400 mt-3 flex items-center gap-1">
                                        Revisado el {review.reviewed_at ? new Date(review.reviewed_at).toLocaleDateString() : '-'}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

function Calendar(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
    )
}


export default MedicalReviews;
