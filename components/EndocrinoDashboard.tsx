import React, { useState, useEffect, useMemo } from 'react';
import { User, Client, MedicalReview, UserRole } from '../types';
import { mockDb } from '../services/mockSupabase';
import { supabase } from '../services/supabaseClient';
import { checkPermission, PERMISSIONS } from '../utils/permissions';
import { Stethoscope, Search, Clock, CheckCircle2, Video, User as UserIcon, Save, X, Lock, FileText, Image, ExternalLink, Download, ClipboardList } from 'lucide-react';
import { jsPDF } from 'jspdf';
import InitialPatientReport from './InitialPatientReport';

interface EndocrinoDashboardProps {
    currentUser: User;
    onNavigateToClient?: (clientId: string) => void;
    mode?: 'reviews' | 'initial-reports';
}

const EndocrinoDashboard: React.FC<EndocrinoDashboardProps> = ({ currentUser, onNavigateToClient, mode = 'reviews' }) => {
    const [reviews, setReviews] = useState<MedicalReview[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReview, setSelectedReview] = useState<MedicalReview | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'reviewed'>(mode === 'initial-reports' ? 'all' : 'pending');
    const [searchTerm, setSearchTerm] = useState('');

    // Response Form
    const [doctorNotes, setDoctorNotes] = useState('');
    const [doctorVideo, setDoctorVideo] = useState('');
    const [saving, setSaving] = useState(false);

    // Full client data for initial assessments
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [loadingClient, setLoadingClient] = useState(false);

    const canManage = checkPermission(currentUser, PERMISSIONS.MANAGE_MEDICAL);
    const isCoach = currentUser.role === UserRole.COACH || currentUser.role === UserRole.HEAD_COACH;
    const isEndocrino = currentUser.role === UserRole.ENDOCRINO;

    const isInitialReportsMode = mode === 'initial-reports';

    useEffect(() => {
        loadData();
    }, [mode]);

    const loadData = async () => {
        setLoading(true);
        try {
            let data = await mockDb.medical.getAll();

            // If coach, filter to only see their own clients' reviews
            if (isCoach) {
                data = data.filter(r => r.coach_id === currentUser.id);
            }

            // Filter by mode
            if (isInitialReportsMode) {
                data = data.filter(r => r.report_type === 'Valoración Inicial');
            } else {
                data = data.filter(r => r.report_type !== 'Valoración Inicial' && r.report_type !== 'Informe Médico');
            }

            setReviews(data);
        } catch (err) {
            console.error('Error loading medical reviews:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredReviews = useMemo(() => {
        return reviews.filter(r => {
            const matchesStatus = filterStatus === 'all' ? true : r.status === filterStatus;
            const searchLower = searchTerm.toLowerCase();
            const clientName = (r as any).client_name || '';
            const matchesSearch = clientName.toLowerCase().includes(searchLower) ||
                (r.diabetes_type || '').toLowerCase().includes(searchLower) ||
                (r.report_type || '').toLowerCase().includes(searchLower);
            return matchesStatus && matchesSearch;
        });
    }, [reviews, filterStatus, searchTerm]);

    const handleOpenReview = async (review: MedicalReview) => {
        setSelectedReview(review);
        setDoctorNotes(review.doctor_notes || '');
        setDoctorVideo(review.doctor_video_url || '');
        setSelectedClient(null);

        // For initial assessments, load full client data
        if (review.report_type === 'Valoración Inicial' && review.client_id) {
            setLoadingClient(true);
            try {
                const { data, error } = await supabase
                    .from('clientes_pt_notion')
                    .select('*')
                    .eq('id', review.client_id)
                    .single();

                if (!error && data) {
                    // Use the same mapper as mockDb to get a proper Client object
                    const allClients = await mockDb.getClients({ id: 'temp', name: 'temp', email: 'temp', role: UserRole.ADMIN } as User);
                    const foundClient = allClients.find(c => c.id === review.client_id);
                    if (foundClient) {
                        setSelectedClient(foundClient);
                    }
                }
            } catch (err) {
                console.error('Error loading client for initial assessment:', err);
            } finally {
                setLoadingClient(false);
            }
        }
    };

    const handleSaveResponse = async () => {
        if (!selectedReview) return;
        setSaving(true);
        try {
            await mockDb.medical.update(selectedReview.id, {
                status: 'reviewed',
                doctor_notes: doctorNotes,
                doctor_video_url: doctorVideo,
                reviewed_at: new Date().toISOString(),
                reviewed_by: currentUser.name
            });

            setReviews(prev => prev.map(r => r.id === selectedReview.id ? {
                ...r,
                status: 'reviewed',
                doctor_notes: doctorNotes,
                doctor_video_url: doctorVideo,
                reviewed_at: new Date().toISOString(),
                reviewed_by: currentUser.name
            } : r));

            setSelectedReview(null);
        } catch (err) {
            console.error('Error saving review:', err);
            alert('Error al guardar la respuesta');
        } finally {
            setSaving(false);
        }
    };

    const generateMedicalReport = () => {
        if (!selectedReview) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let yPos = 20;

        // HEADER
        doc.setFillColor(16, 185, 129); // Emerald 500
        doc.rect(0, 0, pageWidth, 5, 'F');

        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42); // Slate 900
        doc.setFont('helvetica', 'bold');
        doc.text('INFORME MÉDICO', pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;

        doc.setFontSize(12);
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.text('Padron Trainer', pageWidth / 2, yPos, { align: 'center' });
        yPos += 20;

        // DOCTOR INFO
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text(`Dr/Dra. ${currentUser.name}`, margin, yPos);

        if (currentUser.collegiate_number) {
            doc.setFont('helvetica', 'normal');
            doc.text(`Nº Colegiado: ${currentUser.collegiate_number}`, margin, yPos + 5);
        }

        doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - margin - 40, yPos);
        yPos += 20;

        // LINE
        doc.setDrawColor(226, 232, 240); // Slate 200
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;

        // PATIENT INFO
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Datos del Paciente', margin, yPos);
        yPos += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Nombre: ${(selectedReview as any).client_name || 'Paciente'}`, margin, yPos);
        yPos += 6;
        doc.text(`Tipo de Diabetes: ${selectedReview.diabetes_type || 'N/A'}`, margin, yPos);
        yPos += 6;
        doc.text(`Insulina: ${selectedReview.insulin_usage === 'Si' ? `Sí (${selectedReview.insulin_dose})` : 'No'}`, margin, yPos);
        yPos += 6;
        doc.text(`Medicación: ${selectedReview.medication || 'No reportada'}`, margin, yPos);
        yPos += 15;

        // CONSULTA
        doc.setFillColor(248, 250, 252); // Slate 50
        doc.rect(margin, yPos, pageWidth - (margin * 2), 30, 'F');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85);
        doc.text('Motivo de Consulta / Síntomas', margin + 5, yPos + 8);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(71, 85, 105);

        const splitComments = doc.splitTextToSize(selectedReview.comments || 'Sin comentarios', pageWidth - (margin * 2) - 10);
        doc.text(splitComments, margin + 5, yPos + 16);
        yPos += 40;

        // INFORME / RESPUESTA
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); // Reset color
        doc.text('Valoración Médica', margin, yPos);
        yPos += 10;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        const reviewText = doctorNotes || 'Pendiente de redacción';
        const splitReview = doc.splitTextToSize(reviewText, pageWidth - (margin * 2));
        doc.text(splitReview, margin, yPos);

        // FOOTER
        const footerY = doc.internal.pageSize.getHeight() - 20;
        doc.setDrawColor(16, 185, 129);
        doc.line(margin, footerY, pageWidth - margin, footerY);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // Slate 400
        doc.text('Este documento es un informe médico informativo de Padron Trainer.', pageWidth / 2, footerY + 5, { align: 'center' });
        doc.text('No sustituye una consulta presencial de urgencia.', pageWidth / 2, footerY + 9, { align: 'center' });

        doc.save(`Informe_Medico_${(selectedReview as any).client_name || 'Paciente'}.pdf`);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isInitialReportsMode ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {isInitialReportsMode ? <ClipboardList className="w-8 h-8" /> : <Stethoscope className="w-8 h-8" />}
                        </div>
                        {isInitialReportsMode ? 'Informes Iniciales' : 'Revisiones Médicas'}
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {isInitialReportsMode
                            ? 'Valoraciones iniciales de nuevos pacientes pendientes de revisión.'
                            : 'Gestiona las revisiones médicas de los alumnos.'}
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        <button
                            onClick={() => setFilterStatus('pending')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filterStatus === 'pending' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Pendientes ({reviews.filter(r => r.status === 'pending').length})
                        </button>
                        <button
                            onClick={() => setFilterStatus('reviewed')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filterStatus === 'reviewed' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Revisados
                        </button>
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${filterStatus === 'all' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Todos
                        </button>
                    </div>
                </div>
            </div>

            <div className="mb-6 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Buscar por alumno, tipo de diabetes..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 outline-none shadow-sm"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="text-center py-20 text-slate-400">Cargando revisiones...</div>
            ) : filteredReviews.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-slate-300" />
                    </div>
                    <h3 className="text-slate-600 font-bold mb-2">No hay revisiones que mostrar</h3>
                    <p className="text-slate-400 text-sm mb-6">Prueba cambiar los filtros o verificar la conexión.</p>

                    <div className="max-w-md mx-auto p-4 bg-amber-50 rounded-xl border border-amber-100 text-left">
                        <p className="text-xs font-bold text-amber-800 uppercase mb-2">Guía de Resolución de Problemas:</p>
                        <ul className="text-[11px] text-amber-700 space-y-1 list-disc pl-4">
                            <li><strong>SQL Script:</strong> ¿Has ejecutado <code>database/20260205_update_medical_reviews.sql</code> en Supabase?</li>
                            <li><strong>Sesión:</strong> El RLS requiere login real. Si usas Master Pass, Supabase bloquea los datos.</li>
                            <li><strong>Datos:</strong> Abre la consola (F12) para ver si hay errores 406 o de red.</li>
                        </ul>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredReviews.map(review => (
                        <div
                            key={review.id}
                            onClick={() => handleOpenReview(review)}
                            className={`bg-white p-6 rounded-2xl shadow-sm border cursor-pointer transition-all hover:shadow-md group ${review.report_type === 'Valoración Inicial' ? 'border-indigo-200 hover:border-indigo-400 ring-1 ring-indigo-50' : review.status === 'pending' ? 'border-amber-200 bg-amber-50/10 hover:border-emerald-200' : 'border-slate-100 hover:border-emerald-200'}`}
                        >
                            {review.report_type === 'Valoración Inicial' && (
                                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-indigo-100">
                                    <ClipboardList className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Informe Inicial del Paciente</span>
                                </div>
                            )}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${review.report_type === 'Valoración Inicial' ? 'bg-indigo-100 text-indigo-600' : review.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {review.report_type === 'Valoración Inicial' ? <ClipboardList className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">{(review as any).client_name}</h3>
                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> Enviado: {new Date(review.submission_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${review.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {review.status === 'pending' ? 'Pendiente' : 'Completado'}
                                </span>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Diabetes:</span>
                                    <span className="font-medium text-slate-800">{review.diabetes_type}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Tipo Informe:</span>
                                    <span className="font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded">{review.report_type}</span>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600 line-clamp-2 bg-slate-50 p-3 rounded-lg italic border border-slate-100">
                                "{review.comments}"
                            </p>
                            {review.file_urls && review.file_urls.length > 0 && (
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                                    <FileText className="w-4 h-4 text-slate-400" />
                                    <span className="text-xs font-medium text-slate-500">
                                        {review.file_urls.length} archivo{review.file_urls.length > 1 ? 's' : ''} adjunto{review.file_urls.length > 1 ? 's' : ''}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {selectedReview && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSelectedReview(null)}></div>
                    <div className={`relative w-full bg-white h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 ${selectedReview.report_type === 'Valoración Inicial' ? 'max-w-4xl' : 'max-w-2xl'}`}>
                        <div className="sticky top-0 bg-white/90 backdrop-blur-md z-10 border-b border-slate-100 p-6 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                {selectedReview.report_type === 'Valoración Inicial' ? (
                                    <ClipboardList className="w-5 h-5 text-indigo-600" />
                                ) : (
                                    <Stethoscope className="w-5 h-5 text-emerald-600" />
                                )}
                                {selectedReview.report_type === 'Valoración Inicial' ? 'Valoración Inicial' : 'Revisión'} — {(selectedReview as any).client_name}
                            </h2>
                            <div className="flex items-center gap-2">
                                {(selectedReview.status === 'reviewed' || (isEndocrino && doctorNotes)) && (
                                    <button
                                        onClick={generateMedicalReport}
                                        className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                                        title="Descargar Informe PDF"
                                    >
                                        <Download className="w-4 h-4" /> Informe
                                    </button>
                                )}
                                <button onClick={() => setSelectedReview(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* INITIAL ASSESSMENT: Show full patient report */}
                            {selectedReview.report_type === 'Valoración Inicial' ? (
                                <section className="space-y-4">
                                    {loadingClient ? (
                                        <div className="text-center py-12">
                                            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                                            <p className="text-slate-500 text-sm">Cargando informe del paciente...</p>
                                        </div>
                                    ) : selectedClient ? (
                                        <InitialPatientReport client={selectedClient} />
                                    ) : (
                                        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
                                            <div className="flex items-center gap-3 mb-3">
                                                <ClipboardList className="w-5 h-5 text-amber-600" />
                                                <h3 className="font-bold text-amber-900">Valoración Inicial</h3>
                                            </div>
                                            <div className="bg-white rounded-xl p-4 border border-amber-100 space-y-3">
                                                <div>
                                                    <label className="text-xs text-slate-500 block mb-1">Diabetes</label>
                                                    <p className="font-semibold text-slate-800">{selectedReview.diabetes_type}</p>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-500 block mb-1">Insulina</label>
                                                    <p className="font-semibold text-slate-800">{selectedReview.insulin_usage === 'Si' ? `Sí (${selectedReview.insulin_dose})` : 'No'}</p>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-500 block mb-1">Medicación</label>
                                                    <p className="font-semibold text-slate-800">{selectedReview.medication || 'No reportada'}</p>
                                                </div>
                                                <div className="pt-3 border-t border-slate-100">
                                                    <label className="text-xs text-slate-500 block mb-1">Comentarios</label>
                                                    <p className="text-slate-700 italic leading-relaxed">"{selectedReview.comments}"</p>
                                                </div>
                                            </div>
                                            <p className="text-xs text-amber-600 mt-3 italic">No se pudo cargar el informe completo del paciente.</p>
                                        </div>
                                    )}
                                </section>
                            ) : (
                                <section className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Datos del Paciente</h3>
                                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-xs text-slate-500 block mb-1">Diabetes</label>
                                            <p className="font-semibold text-slate-800">{selectedReview.diabetes_type}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 block mb-1">Insulina</label>
                                            <p className="font-semibold text-slate-800">{selectedReview.insulin_usage === 'Si' ? `Sí (${selectedReview.insulin_dose})` : 'No'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-xs text-slate-500 block mb-1">Medicación</label>
                                            <p className="font-semibold text-slate-800">{selectedReview.medication || 'No reportada'}</p>
                                        </div>
                                        <div className="col-span-2 pt-4 border-t border-slate-200">
                                            <label className="text-xs text-slate-500 block mb-1">Comentarios / Síntomas</label>
                                            <p className="text-slate-700 italic leading-relaxed">"{selectedReview.comments}"</p>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* ARCHIVOS ADJUNTOS */}
                            {selectedReview.file_urls && selectedReview.file_urls.length > 0 && (
                                <section className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        Documentos Adjuntos ({selectedReview.file_urls.length})
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {selectedReview.file_urls.map((url, idx) => {
                                            const isPdf = url.toLowerCase().includes('.pdf');
                                            const isImage = /\.(jpg|jpeg|png|gif|webp)/i.test(url);
                                            return (
                                                <a
                                                    key={idx}
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="group relative bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isPdf ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                                            {isPdf ? <FileText className="w-5 h-5" /> : <Image className="w-5 h-5" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-slate-700 text-sm truncate">
                                                                {isPdf ? 'Documento PDF' : 'Imagen'} {idx + 1}
                                                            </p>
                                                            <p className="text-xs text-slate-400">Click para abrir</p>
                                                        </div>
                                                        <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                                    </div>
                                                    {isImage && (
                                                        <div className="mt-3 rounded-lg overflow-hidden border border-slate-200">
                                                            <img
                                                                src={url}
                                                                alt={`Documento ${idx + 1}`}
                                                                className="w-full h-24 object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                </a>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            <section className={`space-y-4 pt-4 border-t border-slate-100 ${!canManage ? 'opacity-75' : ''}`}>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                    <Stethoscope className="w-4 h-4" />
                                    Valoración Médica {canManage && '(Editable)'}
                                </h3>

                                <textarea
                                    className="w-full h-40 p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none leading-relaxed"
                                    placeholder="Escribe aquí tu valoración médica, recomendaciones y pautas..."
                                    value={doctorNotes}
                                    onChange={e => setDoctorNotes(e.target.value)}
                                    disabled={!canManage}
                                />

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Video Respuesta (Loom/YouTube)</label>
                                    <div className="relative">
                                        <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                                            placeholder="https://..."
                                            value={doctorVideo}
                                            onChange={e => setDoctorVideo(e.target.value)}
                                            disabled={!canManage}
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>

                        {canManage && (
                            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-6 flex justify-end gap-3 z-10">
                                <button
                                    onClick={() => setSelectedReview(null)}
                                    className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveResponse}
                                    disabled={saving || !doctorNotes}
                                    className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? 'Guardando...' : (
                                        <>
                                            <Save className="w-5 h-5" /> Guardar Respuesta
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EndocrinoDashboard;
