

import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Camera, Mail, Shield, User as UserIcon, Save, X, Edit3, Landmark, CreditCard, FileText, MapPin, Copy, Check } from 'lucide-react';

interface UserProfileProps {
  user: User;
  onSave: (user: User) => Promise<void>;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<User>(user);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);

  const copyIban = () => {
    if (formData.bank_account_iban) {
      navigator.clipboard.writeText(formData.bank_account_iban);
      setCopiedIban(true);
      setTimeout(() => setCopiedIban(false), 2000);
    }
  };

  useEffect(() => {
    setFormData(user);
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setFormData(user);
    setIsEditing(false);
  };

  const handleChange = (field: keyof User, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
         <h1 className="text-2xl font-bold text-slate-800">Mi Ficha Personal</h1>
         
         {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Edit3 className="w-4 h-4" />
              Editar Perfil
            </button>
         ) : (
           <div className="flex items-center gap-2">
              <button 
                onClick={cancelEdit}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                disabled={isSaving}
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70"
                disabled={isSaving}
              >
                {isSaving ? 'Guardando...' : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar Cambios
                  </>
                )}
              </button>
           </div>
         )}
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative"></div>
        
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="relative group">
              <img 
                src={formData.avatarUrl || `https://ui-avatars.com/api/?name=${formData.name}`} 
                alt={formData.name} 
                className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-white object-cover"
              />
              {isEditing && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                   <Camera className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
            <div className="mb-2">
               <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full uppercase border border-blue-100">
                 {user.role}
               </span>
            </div>
          </div>

          {isEditing && (
             <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <label className="block text-xs font-bold text-blue-700 uppercase mb-1">URL Avatar / Foto Perfil</label>
                <input 
                  type="text"
                  value={formData.avatarUrl || ''}
                  onChange={(e) => handleChange('avatarUrl', e.target.value)}
                  className="w-full text-sm p-2 border border-blue-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="https://ejemplo.com/foto.jpg"
                />
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre Completo</label>
                {isEditing ? (
                  <input 
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <UserIcon className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-800 font-medium">{formData.name}</span>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Correo Electrónico</label>
                {isEditing ? (
                  <input 
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <Mail className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-800">{formData.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
               <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Rol & Permisos</label>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 opacity-80">
                  <Shield className="w-5 h-5 text-slate-400" />
                  <div className="flex-1">
                    <p className="text-slate-800 font-medium capitalize">{user.role}</p>
                    <p className="text-xs text-slate-500">
                      {user.role === 'admin' 
                        ? 'Acceso total a configuración y todos los clientes.' 
                        : 'Acceso limitado a clientes asignados.'}
                    </p>
                  </div>
                </div>
              </div>

               <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">ID Usuario</label>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 font-mono text-xs opacity-80">
                  {user.id}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección de Datos Bancarios y Facturación */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Landmark className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Datos Bancarios y Facturación</h2>
              <p className="text-sm text-slate-500">Información para recibir pagos de comisiones</p>
            </div>
          </div>
        </div>

        <div className="px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Titular de la cuenta */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                <UserIcon className="w-3 h-3 inline mr-1" />
                Titular de la Cuenta
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.bank_account_holder || ''}
                  onChange={(e) => handleChange('bank_account_holder', e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  placeholder="Nombre completo del titular"
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-800">{formData.bank_account_holder || <span className="text-slate-400 italic">No configurado</span>}</span>
                </div>
              )}
            </div>

            {/* IBAN */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                <CreditCard className="w-3 h-3 inline mr-1" />
                IBAN
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.bank_account_iban || ''}
                  onChange={(e) => handleChange('bank_account_iban', e.target.value.toUpperCase())}
                  className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-mono"
                  placeholder="ES00 0000 0000 0000 0000 0000"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-sm">
                    <span className="text-slate-800">{formData.bank_account_iban || <span className="text-slate-400 italic font-sans">No configurado</span>}</span>
                  </div>
                  {formData.bank_account_iban && (
                    <button
                      onClick={copyIban}
                      className="p-3 bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-600 rounded-lg border border-slate-200 transition-colors"
                      title="Copiar IBAN"
                    >
                      {copiedIban ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Nombre del Banco */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                <Landmark className="w-3 h-3 inline mr-1" />
                Banco
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.bank_name || ''}
                  onChange={(e) => handleChange('bank_name', e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  placeholder="Ej: Santander, BBVA, CaixaBank..."
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-800">{formData.bank_name || <span className="text-slate-400 italic">No configurado</span>}</span>
                </div>
              )}
            </div>

            {/* SWIFT/BIC (opcional) */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                SWIFT/BIC <span className="text-slate-300 font-normal">(opcional)</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.bank_swift_bic || ''}
                  onChange={(e) => handleChange('bank_swift_bic', e.target.value.toUpperCase())}
                  className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-mono"
                  placeholder="XXXXXXXXXXX"
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-sm">
                  <span className="text-slate-800">{formData.bank_swift_bic || <span className="text-slate-400 italic font-sans">No configurado</span>}</span>
                </div>
              )}
            </div>

            {/* NIF/CIF */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                <FileText className="w-3 h-3 inline mr-1" />
                NIF / DNI / CIF
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.tax_id || ''}
                  onChange={(e) => handleChange('tax_id', e.target.value.toUpperCase())}
                  className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  placeholder="12345678A"
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-800">{formData.tax_id || <span className="text-slate-400 italic">No configurado</span>}</span>
                </div>
              )}
            </div>

            {/* Dirección Fiscal */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                <MapPin className="w-3 h-3 inline mr-1" />
                Dirección Fiscal
              </label>
              {isEditing ? (
                <textarea
                  value={formData.billing_address || ''}
                  onChange={(e) => handleChange('billing_address', e.target.value)}
                  rows={2}
                  className="w-full p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
                  placeholder="Calle, número, piso, código postal, ciudad, provincia"
                />
              ) : (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-800 whitespace-pre-line">{formData.billing_address || <span className="text-slate-400 italic">No configurado</span>}</span>
                </div>
              )}
            </div>
          </div>

          {/* Nota informativa */}
          <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
            <FileText className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-bold mb-1">Información importante</p>
              <p>Estos datos se utilizarán para realizar el pago de tus comisiones. Asegúrate de que el IBAN y el titular coincidan exactamente con los datos de tu cuenta bancaria.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;