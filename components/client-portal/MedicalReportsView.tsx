import React, { useEffect, useState } from 'react';
import { ArrowLeft, FileText, Download, Calendar, Stethoscope, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { parseDoctorInfo, generateMedicalReportPdf } from '../../utils/medicalReportPdf';

interface MedicalReport {
    id: string;
    client_id: string;
    submission_date: string;
    comments: string;
    doctor_notes?: string;
    doctor_video_url?: string;
    reviewed_at?: string;
    reviewed_by?: string;
    created_at: string;
}

interface MedicalReportsViewProps {
    clientId: string;
    clientName: string;
    onBack: () => void;
}

export function MedicalReportsView({ clientId, clientName, onBack }: MedicalReportsViewProps) {
    const [reports, setReports] = useState<MedicalReport[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadReports();
    }, [clientId]);

    const loadReports = async () => {
        try {
            const { data, error } = await supabase
                .from('medical_reviews')
                .select('*')
                .eq('client_id', clientId)
                .eq('report_type', 'Informe Médico')
                .order('created_at', { ascending: false });

            if (!error && data) {
                setReports(data);
            }
        } catch (err) {
            console.error('Error loading medical reports:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={onBack}
                    className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors font-medium"
                >
                    <ArrowLeft className="w-5 h-5" /> Volver al Dashboard
                </button>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-sea-600 to-sea-700 p-8 text-white">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                                <FileText className="w-8 h-8" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">Mis Informes Médicos</h1>
                                <p className="text-sea-200">Informes del endocrino disponibles para descarga</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8">
                        {loading ? (
                            <div className="text-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-sea-500 mx-auto mb-4" />
                                <p className="text-slate-500">Cargando informes...</p>
                            </div>
                        ) : reports.length === 0 ? (
                            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText className="w-8 h-8 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700 mb-2">Sin informes médicos</h3>
                                <p className="text-slate-500 max-w-sm mx-auto">
                                    Aquí aparecerán los informes que tu endocrino elabore para ti. Podrás descargarlos en formato PDF.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {reports.map(report => {
                                    const { doctorName } = parseDoctorInfo(report.comments);
                                    const reportDate = new Date(report.reviewed_at || report.created_at);

                                    return (
                                        <div
                                            key={report.id}
                                            className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-all"
                                        >
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-sea-50 text-sea-600 flex items-center justify-center shrink-0">
                                                        <Stethoscope className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800">
                                                            Informe del {reportDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                        </h4>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            {doctorName && (
                                                                <span className="text-sm text-slate-500 flex items-center gap-1">
                                                                    <Stethoscope className="w-3.5 h-3.5" />
                                                                    Dr/a. {doctorName}
                                                                </span>
                                                            )}
                                                            <span className="text-sm text-slate-400 flex items-center gap-1">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                {reportDate.toLocaleDateString('es-ES')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => generateMedicalReportPdf(report, { clientName })}
                                                    className="flex items-center gap-2 px-5 py-3 bg-sea-600 hover:bg-sea-700 text-white rounded-xl font-bold transition-all hover:scale-105 shadow-lg shadow-sea-200 shrink-0"
                                                >
                                                    <Download className="w-5 h-5" />
                                                    Descargar PDF
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
