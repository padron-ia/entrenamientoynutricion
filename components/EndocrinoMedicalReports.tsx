import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';
import {
  FileText, Search, Download, Stethoscope, Calendar, User as UserIcon,
  Loader2, Video
} from 'lucide-react';
import { parseDoctorInfo, parseClientNameFromComments, generateMedicalReportPdf } from '../utils/medicalReportPdf';

interface EndocrinoMedicalReportsProps {
  currentUser: User;
}

interface MedicalReport {
  id: string;
  client_id: string;
  client_name?: string;
  submission_date: string;
  comments: string;
  doctor_notes?: string;
  doctor_video_url?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  created_at: string;
}

const EndocrinoMedicalReports: React.FC<EndocrinoMedicalReportsProps> = ({ currentUser }) => {
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('medical_reviews')
        .select('*')
        .eq('report_type', 'Informe Médico')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Enrich with client names
        const clientIds = [...new Set(data.map((r: any) => r.client_id))];
        const clientNames: Record<string, string> = {};

        if (clientIds.length > 0) {
          const { data: clients } = await supabase
            .from('clientes_pt_notion')
            .select('id, property_nombre')
            .in('id', clientIds);

          if (clients) {
            clients.forEach((c: any) => {
              clientNames[c.id] = c.property_nombre || '';
            });
          }
        }

        setReports(data.map((r: any) => ({
          ...r,
          client_name: clientNames[r.client_id] || parseClientNameFromComments(r.comments || '')
        })));
      }
    } catch (err) {
      console.error('Error loading medical reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    if (!searchTerm.trim()) return reports;
    const term = searchTerm.toLowerCase();
    return reports.filter(r =>
      (r.client_name || '').toLowerCase().includes(term) ||
      (r.reviewed_by || '').toLowerCase().includes(term) ||
      (r.comments || '').toLowerCase().includes(term)
    );
  }, [reports, searchTerm]);

  return (
    <div className="p-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-xl text-purple-700">
              <FileText className="w-8 h-8" />
            </div>
            Informes Médicos
          </h1>
          <p className="text-slate-500 mt-1">
            Todos los informes médicos creados. Total: {reports.length}
          </p>
        </div>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por paciente, doctor..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 outline-none shadow-sm"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
          Cargando informes...
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
          <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-slate-600 font-bold mb-2">No hay informes médicos</h3>
          <p className="text-slate-400 text-sm">Los informes que crees aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map(report => {
            const { doctorName } = parseDoctorInfo(report.comments);
            const reportDate = new Date(report.reviewed_at || report.created_at);

            return (
              <div
                key={report.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <UserIcon className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-800 truncate">
                        {report.client_name || 'Paciente'}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="text-sm text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {reportDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {doctorName && (
                          <span className="text-sm text-slate-400 flex items-center gap-1">
                            <Stethoscope className="w-3.5 h-3.5" />
                            Dr/a. {doctorName}
                          </span>
                        )}
                        {report.doctor_video_url && (
                          <a
                            href={report.doctor_video_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium"
                            onClick={e => e.stopPropagation()}
                          >
                            <Video className="w-3.5 h-3.5" /> Video
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => generateMedicalReportPdf(report, { clientName: report.client_name || 'Paciente' })}
                    className="flex items-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all hover:scale-105 shadow-lg shadow-purple-200 shrink-0"
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
  );
};

export default EndocrinoMedicalReports;
