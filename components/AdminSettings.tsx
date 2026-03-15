import React, { useState, useEffect } from 'react';
import { User } from '../types';
import {
  Database, CheckCircle2, Send, FileText, Loader2, RefreshCw, DollarSign
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { PaymentMethodsManager } from './PaymentMethodsManager';

interface AdminSettingsProps {
  currentUser: User;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'automation' | 'payments'>('automation');
  const [savingSettings, setSavingSettings] = useState(false);
  const [webhookSettings, setWebhookSettings] = useState({
    n8n_webhook_new_sale: '',
    n8n_webhook_onboarding_completed: '',
    n8n_webhook_enabled: 'false',
    telegram_bot_token: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('*');

      if (data) {
        const settings = { ...webhookSettings };
        data.forEach((s: any) => {
          if (s.setting_key in settings) {
            (settings as any)[s.setting_key] = s.setting_value || '';
          }
        });
        setWebhookSettings(settings);
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const updates = Object.entries(webhookSettings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value
      }));

      const { error } = await supabase
        .from('app_settings')
        .upsert(updates, { onConflict: 'setting_key' });

      if (error) throw error;
      alert('✅ Ajustes de automatización guardados correctamente');
    } catch (error: any) {
      alert('Error al guardar ajustes: ' + error.message);
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Panel de Control Técnico</h1>
          <p className="text-slate-500 text-sm">Configuración global de automatización y finanzas</p>
        </div>
      </div>

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('automation')}
          className={`px-6 py-3 font-semibold text-sm transition-all relative ${activeTab === 'automation' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Automatización (N8N)
          </div>
          {activeTab === 'automation' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />}
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-6 py-3 font-semibold text-sm transition-all relative ${activeTab === 'payments' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Finanzas
          </div>
          {activeTab === 'payments' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600" />}
        </button>
      </div>

      {activeTab === 'automation' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-8 animate-in fade-in duration-300">
          <div className="flex items-center gap-4 border-b pb-6">
            <div className="bg-blue-100 p-3 rounded-2xl">
              <Database className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Configs de Automatización</h2>
              <p className="text-slate-500 text-sm">Gestiona cómo se conecta el CRM con tus flujos de n8n</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">Estado de la Automatización</h3>
                  <p className="text-sm text-slate-500">Activa o desactiva todos los webhooks globalmente</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={webhookSettings.n8n_webhook_enabled === 'true'}
                    onChange={(e) => setWebhookSettings(prev => ({ ...prev, n8n_webhook_enabled: e.target.checked ? 'true' : 'false' }))}
                  />
                  <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="space-y-6 pt-4">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 hover:border-blue-300 transition-colors">
                  <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
                    Webhook: Nueva Venta (Mail Onboarding)
                  </label>
                  <div className="relative text-black">
                    <input
                      type="url"
                      className="w-full pl-4 pr-12 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      placeholder="https://su-n8n.host/webhook/..."
                      value={webhookSettings.n8n_webhook_new_sale}
                      onChange={(e) => setWebhookSettings(prev => ({ ...prev, n8n_webhook_new_sale: e.target.value }))}
                    />
                    <Send className="absolute right-4 top-3.5 w-5 h-5 text-slate-400" />
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 hover:border-blue-300 transition-colors">
                  <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
                    Webhook: Onboarding Completado (Contrato PDF)
                  </label>
                  <div className="relative text-black">
                    <input
                      type="url"
                      className="w-full pl-4 pr-12 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      placeholder="https://su-n8n.host/webhook/..."
                      value={webhookSettings.n8n_webhook_onboarding_completed}
                      onChange={(e) => setWebhookSettings(prev => ({ ...prev, n8n_webhook_onboarding_completed: e.target.value }))}
                    />
                    <FileText className="absolute right-4 top-3.5 w-5 h-5 text-slate-400" />
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 hover:border-blue-300 transition-colors">
                  <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
                    Telegram Bot Token
                  </label>
                  <div className="relative text-black">
                    <input
                      type="password"
                      className="w-full pl-4 pr-12 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono text-sm"
                      placeholder="8165843234:..."
                      value={webhookSettings.telegram_bot_token}
                      onChange={(e) => setWebhookSettings(prev => ({ ...prev, telegram_bot_token: e.target.value }))}
                    />
                    <Send className="absolute right-4 top-3.5 w-5 h-5 text-slate-400" />
                  </div>
                  <p className="mt-2 text-xs text-slate-500 text-pretty">
                    Este token se utiliza para enviar comunicados masivos a los grupos de Telegram de los clientes.
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t flex justify-end">
                <button
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Guardar Configuración
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl animate-in fade-in duration-500">
          <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Finanzas y Comisiones</h2>
            <p className="text-slate-500 mt-2 text-lg">Gestiona las pasarelas de pago y sus comisiones para automatizar los cálculos de los closers.</p>
          </div>
          <PaymentMethodsManager />
        </div>
      )}
    </div>
  );
};

export default AdminSettings;