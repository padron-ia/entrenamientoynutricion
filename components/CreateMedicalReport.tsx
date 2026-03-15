import React, { useState, useEffect, useMemo } from 'react';
import { User, Client, UserRole } from '../types';
import { mockDb } from '../services/mockSupabase';
import { supabase } from '../services/supabaseClient';
import {
  FileText, Search, User as UserIcon, Save, X, Video,
  Stethoscope, Pill, ClipboardList, CheckCircle2, Download,
  AlertCircle, Loader2, ChevronRight
} from 'lucide-react';
import { generateMedicalReportPdf } from '../utils/medicalReportPdf';

interface CreateMedicalReportProps {
  currentUser: User;
}

interface ReportForm {
  doctorName: string;
  collegiateNumber: string;
  diagnosis: string;
  recommendations: string;
  proposedMedication: string;
  notes: string;
  videoUrl: string;
}

const CreateMedicalReport: React.FC<CreateMedicalReportProps> = ({ currentUser }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);

  const [form, setForm] = useState<ReportForm>({
    doctorName: currentUser.name || '',
    collegiateNumber: currentUser.collegiate_number || '',
    diagnosis: '',
    recommendations: '',
    proposedMedication: '',
    notes: '',
    videoUrl: ''
  });

  // Previous reports by this doctor
  const [previousReports, setPreviousReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const data = await mockDb.getClients({ ...currentUser, role: UserRole.ADMIN } as User);
      setClients(data.filter(c => c.status === 'active'));
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally {
      setLoadingClients(false);
    }
  };

  const loadPreviousReports = async (clientId: string) => {
    setLoadingReports(true);
    try {
      const { data, error } = await supabase
        .from('medical_reviews')
        .select('*')
        .eq('client_id', clientId)
        .eq('report_type', 'Informe Médico')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPreviousReports(data);
      }
    } catch (err) {
      console.error('Error loading previous reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const filteredClients = useMemo(() => {
    const sorted = [...clients].sort((a, b) =>
      (a.firstName || a.name || '').localeCompare(b.firstName || b.name || '', 'es')
    );
    if (!searchTerm.trim()) return sorted;
    const term = searchTerm.toLowerCase();
    return sorted.filter(c =>
      c.name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.firstName?.toLowerCase().includes(term) ||
      c.surname?.toLowerCase().includes(term)
    );
  }, [clients, searchTerm]);

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setSearchTerm('');
    setSavedReportId(null);
    setForm(prev => ({ ...prev, diagnosis: '', recommendations: '', proposedMedication: '', notes: '', videoUrl: '' }));
    loadPreviousReports(client.id);
  };

  const handleSave = async () => {
    if (!selectedClient) return;
    if (!form.diagnosis.trim()) {
      alert('Debes rellenar al menos el campo de Valoración/Diagnóstico.');
      return;
    }

    setSaving(true);
    try {
      // Build comprehensive doctor notes from all fields
      const doctorNotes = [
        form.diagnosis && `**VALORACIÓN/DIAGNÓSTICO:**\n${form.diagnosis}`,
        form.recommendations && `**RECOMENDACIONES:**\n${form.recommendations}`,
        form.proposedMedication && `**MEDICACIÓN PROPUESTA:**\n${form.proposedMedication}`,
        form.notes && `**NOTAS ADICIONALES:**\n${form.notes}`
      ].filter(Boolean).join('\n\n');

      const { data, error } = await supabase
        .from('medical_reviews')
        .insert({
          client_id: selectedClient.id,
          coach_id: selectedClient.coach_id || null,
          submission_date: new Date().toISOString(),
          diabetes_type: selectedClient.medical?.diabetesType || 'No especificado',
          insulin_usage: selectedClient.medical?.insulin || 'No',
          insulin_dose: selectedClient.medical?.insulinDose || null,
          medication: selectedClient.medical?.medication || null,
          comments: `Informe médico creado por Dr/a. ${form.doctorName}${form.collegiateNumber ? ` (Col. ${form.collegiateNumber})` : ''} para ${selectedClient.firstName} ${selectedClient.surname}.`,
          report_type: 'Informe Médico',
          status: 'reviewed',
          doctor_notes: doctorNotes,
          doctor_video_url: form.videoUrl || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: form.doctorName
        })
        .select()
        .single();

      if (error) throw error;

      setSavedReportId(data.id);
      loadPreviousReports(selectedClient.id);
      alert('Informe guardado correctamente. El paciente podrá verlo en su portal.');
    } catch (err: any) {
      console.error('Error saving report:', err);
      alert('Error al guardar: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePdf = () => {
    if (!selectedClient) return;

    const patientName = `${selectedClient.firstName || ''} ${selectedClient.surname || ''}`.trim();

    // Build doctor_notes in the same format as handleSave
    const doctorNotes = [
      form.diagnosis && `**VALORACIÓN/DIAGNÓSTICO:**\n${form.diagnosis}`,
      form.recommendations && `**RECOMENDACIONES:**\n${form.recommendations}`,
      form.proposedMedication && `**MEDICACIÓN PROPUESTA:**\n${form.proposedMedication}`,
      form.notes && `**NOTAS ADICIONALES:**\n${form.notes}`
    ].filter(Boolean).join('\n\n');

    generateMedicalReportPdf(
      {
        comments: '',
        doctor_notes: doctorNotes,
        doctor_video_url: form.videoUrl || undefined,
        reviewed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      },
      {
        clientName: patientName,
        doctorName: form.doctorName,
        collegiateNumber: form.collegiateNumber,
        reportDate: new Date()
      }
    );
  };

  const handleNewReport = () => {
    setSavedReportId(null);
    setForm(prev => ({ ...prev, diagnosis: '', recommendations: '', proposedMedication: '', notes: '', videoUrl: '' }));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-xl text-purple-700">
            <FileText className="w-8 h-8" />
          </div>
          Crear Informe Médico
        </h1>
        <p className="text-slate-500 mt-1">Redacta un informe médico para un paciente con valoración, recomendaciones y medicación.</p>
      </div>

      {/* Step 1: Select Patient */}
      {!selectedClient ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-slate-400" />
            Selecciona un Paciente
          </h2>

          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          {loadingClients ? (
            <div className="text-center py-12 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Cargando pacientes...
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No se encontraron pacientes.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
              {filteredClients.map(client => (
                <button
                  key={client.id}
                  onClick={() => handleSelectClient(client)}
                  className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-purple-300 hover:bg-purple-50/50 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0 group-hover:scale-110 transition-transform">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 truncate group-hover:text-purple-700">
                      {client.firstName} {client.surname}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{client.email}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Selected Patient Header */}
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-6 mb-6 text-white flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <UserIcon className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{selectedClient.firstName} {selectedClient.surname}</h2>
                <p className="text-purple-200 text-sm">
                  {selectedClient.email} {selectedClient.age ? `· ${selectedClient.age} años` : ''}
                  {selectedClient.medical?.diabetesType && selectedClient.medical.diabetesType !== 'N/A' ? ` · ${selectedClient.medical.diabetesType}` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => { setSelectedClient(null); setSavedReportId(null); }}
              className="px-4 py-2 bg-white/20 rounded-lg text-sm font-bold hover:bg-white/30 transition-colors"
            >
              Cambiar Paciente
            </button>
          </div>

          {/* Success State */}
          {savedReportId ? (
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Informe Guardado</h3>
              <p className="text-slate-500 mb-6">El paciente podrá ver este informe en su portal, en la sección "Mis Informes".</p>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleGeneratePdf}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                >
                  <Download className="w-5 h-5" /> Descargar PDF
                </button>
                <button
                  onClick={handleNewReport}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
                >
                  <FileText className="w-5 h-5" /> Nuevo Informe
                </button>
              </div>
            </div>
          ) : (
            /* Report Form */
            <div className="space-y-6">
              {/* Doctor Info */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">Nombre del Médico</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none"
                        value={form.doctorName}
                        onChange={e => setForm({ ...form, doctorName: e.target.value })}
                        placeholder="Dr/Dra. Nombre Apellido"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1 block">N° Colegiado</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 outline-none"
                        value={form.collegiateNumber}
                        onChange={e => setForm({ ...form, collegiateNumber: e.target.value })}
                        placeholder="Ej: 282812345"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 shrink-0 hidden md:block">{new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 space-y-6">
                  {/* Diagnosis */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                      <ClipboardList className="w-4 h-4 text-purple-500" />
                      Valoración / Diagnóstico *
                    </label>
                    <textarea
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none min-h-[120px] leading-relaxed"
                      placeholder="Describe la valoración médica, diagnóstico y estado actual del paciente..."
                      value={form.diagnosis}
                      onChange={e => setForm({ ...form, diagnosis: e.target.value })}
                    />
                  </div>

                  {/* Recommendations */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Recomendaciones
                    </label>
                    <textarea
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none min-h-[100px] leading-relaxed"
                      placeholder="Recomendaciones de seguimiento, hábitos, controles..."
                      value={form.recommendations}
                      onChange={e => setForm({ ...form, recommendations: e.target.value })}
                    />
                  </div>

                  {/* Proposed Medication */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                      <Pill className="w-4 h-4 text-blue-500" />
                      Medicación Propuesta
                    </label>
                    <textarea
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none min-h-[80px] leading-relaxed"
                      placeholder="Cambios de medicación propuestos, ajustes de dosis..."
                      value={form.proposedMedication}
                      onChange={e => setForm({ ...form, proposedMedication: e.target.value })}
                    />
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      Notas Adicionales
                    </label>
                    <textarea
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none min-h-[80px] leading-relaxed"
                      placeholder="Cualquier otra observación relevante..."
                      value={form.notes}
                      onChange={e => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>

                  {/* Video URL */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                      <Video className="w-4 h-4 text-red-500" />
                      Video Explicativo (Loom/YouTube)
                    </label>
                    <div className="relative">
                      <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                        placeholder="https://www.loom.com/share/..."
                        value={form.videoUrl}
                        onChange={e => setForm({ ...form, videoUrl: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="bg-slate-50 border-t border-slate-200 p-6 flex items-center justify-between">
                  <button
                    onClick={handleGeneratePdf}
                    disabled={!form.diagnosis.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" /> Vista Previa PDF
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving || !form.diagnosis.trim()}
                    className="flex items-center gap-2 px-8 py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</>
                    ) : (
                      <><Save className="w-5 h-5" /> Guardar y Enviar al Paciente</>
                    )}
                  </button>
                </div>
              </div>

              {/* Previous Reports */}
              {previousReports.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                    Informes Anteriores de este Paciente ({previousReports.length})
                  </h3>
                  <div className="space-y-3">
                    {previousReports.map(report => (
                      <div key={report.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-purple-500" />
                          <div>
                            <p className="text-sm font-bold text-slate-700">
                              Informe del {new Date(report.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            <p className="text-xs text-slate-400">
                              Por {report.reviewed_by || 'Endocrino'}
                            </p>
                          </div>
                        </div>
                        {report.doctor_video_url && (
                          <a href={report.doctor_video_url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1">
                            <Video className="w-3 h-3" /> Video
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CreateMedicalReport;
