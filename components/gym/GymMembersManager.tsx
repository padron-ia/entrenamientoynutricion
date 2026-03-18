import React, { useState, useEffect } from 'react';
import { gymService } from '../../services/gymService';
import type { GymMember, GymBono, GymMemberCredit, User } from '../../types';
import {
  Users, Plus, Edit, Save, Search, CreditCard, ChevronRight,
  Phone, Mail, AlertCircle
} from 'lucide-react';
import { useToast } from '../ToastProvider';

interface GymMembersManagerProps {
  currentUser: User;
}

const MEMBER_TYPES: { value: string; label: string }[] = [
  { value: 'presencial_grupo', label: 'Grupo' },
  { value: 'presencial_personal', label: 'Personal' },
  { value: 'presencial_nutricion', label: 'Nutricion' },
  { value: 'mixto', label: 'Mixto' },
  { value: 'online', label: 'Online' },
];

const GymMembersManager: React.FC<GymMembersManagerProps> = ({ currentUser }) => {
  const [members, setMembers] = useState<GymMember[]>([]);
  const [bonos, setBonos] = useState<GymBono[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<GymMember> | null>(null);
  const [selectedMember, setSelectedMember] = useState<GymMember | null>(null);
  const [memberCredits, setMemberCredits] = useState<{ vigente: GymMemberCredit[]; caducado: GymMemberCredit[] } | null>(null);
  const [addingCredits, setAddingCredits] = useState(false);
  const [selectedBonoId, setSelectedBonoId] = useState('');
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      gymService.getMembers(),
      gymService.getBonos(),
    ]).then(([m, b]) => {
      setMembers(m);
      setBonos(b);
      setIsLoading(false);
    });
  }, []);

  const fetchMembers = async () => {
    const data = await gymService.getMembers();
    setMembers(data);
  };

  const filteredMembers = members.filter(m => {
    const q = search.toLowerCase();
    return !q || m.first_name.toLowerCase().includes(q)
      || m.last_name.toLowerCase().includes(q)
      || m.email.toLowerCase().includes(q);
  });

  const handleSaveMember = async () => {
    if (!editing) return;
    if (!editing.first_name?.trim() || !editing.last_name?.trim() || !editing.email?.trim()) {
      toast.error('Nombre, apellidos y email son obligatorios');
      return;
    }
    try {
      if (editing.id) {
        await gymService.updateMember(editing.id, editing);
        toast.success('Miembro actualizado');
      } else {
        await gymService.createMember(editing);
        toast.success('Miembro creado');
      }
      setEditing(null);
      fetchMembers();
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    }
  };

  const openMemberDetail = async (member: GymMember) => {
    setSelectedMember(member);
    try {
      const credits = await gymService.getMemberCreditSummary(member.id);
      setMemberCredits(credits);
    } catch {
      setMemberCredits({ vigente: [], caducado: [] });
    }
  };

  const handleAddCredits = async () => {
    if (!selectedMember || !selectedBonoId) return;
    try {
      await gymService.addManualCredits(selectedMember.id, selectedBonoId, 'manual');
      toast.success('Creditos asignados');
      setAddingCredits(false);
      setSelectedBonoId('');
      const credits = await gymService.getMemberCreditSummary(selectedMember.id);
      setMemberCredits(credits);
    } catch (e: any) {
      toast.error(e.message || 'Error al asignar creditos');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Miembros</h1>
          <p className="text-gray-500 mt-1">{members.length} miembros registrados</p>
        </div>
        <button
          onClick={() => setEditing({
            first_name: '', last_name: '', email: '', member_type: 'presencial_grupo', status: 'active',
          })}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" /> Nuevo Miembro
        </button>
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filteredMembers.map(m => (
          <div
            key={m.id}
            onClick={() => openMemberDetail(m)}
            className="flex items-center gap-4 p-4 bg-white rounded-xl border hover:shadow-sm transition cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
              {m.first_name[0]}{m.last_name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900">{m.first_name} {m.last_name}</div>
              <div className="text-sm text-gray-500 truncate">{m.email}</div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              m.status === 'active' ? 'bg-green-100 text-green-700' :
              m.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-500'
            }`}>
              {MEMBER_TYPES.find(t => t.value === m.member_type)?.label || m.member_type}
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        ))}
        {filteredMembers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No se encontraron miembros</p>
          </div>
        )}
      </div>

      {/* Modal editar/crear miembro */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editing.id ? 'Editar Miembro' : 'Nuevo Miembro'}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input type="text" value={editing.first_name || ''} onChange={e => setEditing({ ...editing, first_name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                  <input type="text" value={editing.last_name || ''} onChange={e => setEditing({ ...editing, last_name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={editing.email || ''} onChange={e => setEditing({ ...editing, email: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                  <input type="tel" value={editing.phone || ''} onChange={e => setEditing({ ...editing, phone: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DNI</label>
                  <input type="text" value={editing.dni || ''} onChange={e => setEditing({ ...editing, dni: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de miembro</label>
                <select value={editing.member_type || 'presencial_grupo'} onChange={e => setEditing({ ...editing, member_type: e.target.value as any })}
                  className="w-full border rounded-lg px-3 py-2">
                  {MEMBER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contacto de emergencia</label>
                <input type="text" value={editing.emergency_contact || ''} onChange={e => setEditing({ ...editing, emergency_contact: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" placeholder="Nombre y telefono" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas medicas</label>
                <textarea value={editing.medical_notes || ''} onChange={e => setEditing({ ...editing, medical_notes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2" rows={2} placeholder="Lesiones, alergias, etc." />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(null)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSaveMember} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Save className="w-4 h-4 inline mr-1" /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle miembro */}
      {selectedMember && memberCredits && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{selectedMember.first_name} {selectedMember.last_name}</h2>
              <button onClick={() => { setSelectedMember(null); setMemberCredits(null); }} className="p-1 hover:bg-gray-100 rounded-lg">
                <span className="text-gray-500 text-xl">&times;</span>
              </button>
            </div>

            <div className="text-sm text-gray-500 space-y-1 mb-4">
              <p><Mail className="w-4 h-4 inline mr-1" />{selectedMember.email}</p>
              {selectedMember.phone && <p><Phone className="w-4 h-4 inline mr-1" />{selectedMember.phone}</p>}
            </div>

            {/* Creditos vigentes */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">Creditos Vigentes</h3>
                <button onClick={() => setAddingCredits(true)} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Asignar creditos
                </button>
              </div>

              {memberCredits.vigente.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Sin creditos activos</p>
              ) : (
                <div className="space-y-2">
                  {memberCredits.vigente.map(c => (
                    <div key={c.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{c.bono_name}</span>
                        <span className="font-bold text-green-700">{c.remaining_sessions} / {c.total_sessions}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Caduca: {new Date(c.valid_until).toLocaleDateString('es-ES')}
                        {c.payment_provider && <span className="ml-2">({c.payment_provider})</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Creditos caducados */}
            {memberCredits.caducado.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-500 mb-2 text-sm">Historial caducado</h3>
                <div className="space-y-1">
                  {memberCredits.caducado.slice(0, 5).map(c => (
                    <div key={c.id} className="p-2 bg-gray-50 rounded-lg text-sm text-gray-500 flex justify-between">
                      <span>{c.bono_name}</span>
                      <span>{c.used_sessions}/{c.total_sessions} usadas</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setEditing(selectedMember); setSelectedMember(null); setMemberCredits(null); }}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1"
              >
                <Edit className="w-4 h-4" /> Editar datos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal asignar creditos */}
      {addingCredits && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Asignar creditos manualmente</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar bono</label>
              <select
                value={selectedBonoId}
                onChange={e => setSelectedBonoId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Seleccionar...</option>
                {bonos.filter(b => b.is_active).map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.sessions_count} sesiones - {b.price} EUR)</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              Los creditos caducaran el ultimo dia del mes actual.
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setAddingCredits(false); setSelectedBonoId(''); }} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleAddCredits} disabled={!selectedBonoId} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                Asignar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GymMembersManager;
