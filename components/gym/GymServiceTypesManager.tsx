import React, { useState, useEffect } from 'react';
import { gymService } from '../../services/gymService';
import type { GymServiceType } from '../../types';
import {
  Dumbbell, Plus, Edit, Trash2, Save, X, Check, Ban,
  HeartPulse, Apple, Users, User as UserIcon
} from 'lucide-react';
import { useToast } from '../ToastProvider';

const ICON_OPTIONS = [
  { value: 'users', label: 'Grupo', icon: Users },
  { value: 'user', label: 'Personal', icon: UserIcon },
  { value: 'dumbbell', label: 'Pesas', icon: Dumbbell },
  { value: 'heart-pulse', label: 'Salud', icon: HeartPulse },
  { value: 'apple', label: 'Nutricion', icon: Apple },
];

const COLOR_OPTIONS = [
  '#3B82F6', '#8B5CF6', '#D4A44C', '#10B981',
  '#EF4444', '#F59E0B', '#EC4899', '#06B6D4',
];

const GymServiceTypesManager: React.FC = () => {
  const [types, setTypes] = useState<GymServiceType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<GymServiceType> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => { fetchTypes(); }, []);

  const fetchTypes = async () => {
    setIsLoading(true);
    try {
      const data = await gymService.getServiceTypes();
      setTypes(data);
    } catch (e: any) {
      toast.error('Error cargando tipos de servicio');
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name?.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    try {
      if (editing.id) {
        await gymService.updateServiceType(editing.id, editing);
        toast.success('Tipo actualizado');
      } else {
        await gymService.createServiceType(editing);
        toast.success('Tipo creado');
      }
      setEditing(null);
      fetchTypes();
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await gymService.deleteServiceType(deleteId);
      toast.success('Tipo eliminado');
      setDeleteId(null);
      fetchTypes();
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar');
      setDeleteId(null);
    }
  };

  const getIconComponent = (iconName: string) => {
    const opt = ICON_OPTIONS.find(o => o.value === iconName);
    return opt ? opt.icon : Dumbbell;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tipos de Servicio</h1>
          <p className="text-gray-500 mt-1">Configura los servicios que ofrece tu centro</p>
        </div>
        <button
          onClick={() => setEditing({ name: '', color: '#3B82F6', icon: 'dumbbell', is_bookable_by_client: true, is_active: true })}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" /> Nuevo Servicio
        </button>
      </div>

      {/* Modal edicion */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {editing.id ? 'Editar Servicio' : 'Nuevo Servicio'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={editing.name || ''}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ej: Entrenamiento Grupo Reducido"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
                <textarea
                  value={editing.description || ''}
                  onChange={e => setEditing({ ...editing, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c}
                      onClick={() => setEditing({ ...editing, color: c })}
                      className={`w-8 h-8 rounded-full border-2 transition ${editing.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Icono</label>
                <div className="flex gap-2">
                  {ICON_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setEditing({ ...editing, icon: opt.value })}
                        className={`p-2 rounded-lg border-2 transition ${editing.icon === opt.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}
                        title={opt.label}
                      >
                        <Icon className="w-5 h-5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.is_bookable_by_client ?? true}
                    onChange={e => setEditing({ ...editing, is_bookable_by_client: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">El cliente puede reservar solo</span>
                </label>
              </div>

              <p className="text-xs text-gray-500">
                {editing.is_bookable_by_client
                  ? 'Clases grupales: el cliente ve el horario y reserva.'
                  : 'Sesiones asignadas: solo el admin puede agendar (personal, osteopatia, etc.).'}
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(null)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={handleSave} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                <Save className="w-4 h-4 inline mr-1" /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar borrado */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
            <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Eliminar servicio</h3>
            <p className="text-gray-500 mb-4">Esta accion no se puede deshacer. Los bonos asociados dejaran de funcionar.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de tipos */}
      <div className="space-y-3">
        {types.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Dumbbell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay tipos de servicio creados</p>
          </div>
        ) : (
          types.map(t => {
            const Icon = getIconComponent(t.icon);
            return (
              <div key={t.id} className="flex items-center gap-4 p-4 bg-white rounded-xl border hover:shadow-sm transition">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: t.color + '20' }}>
                  <Icon className="w-5 h-5" style={{ color: t.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{t.name}</span>
                    {!t.is_active && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Inactivo</span>}
                  </div>
                  {t.description && <p className="text-sm text-gray-500">{t.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {t.is_bookable_by_client ? 'Reserva libre por el cliente' : 'Asignacion por admin'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(t)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                    <Edit className="w-4 h-4 text-gray-500" />
                  </button>
                  <button onClick={() => setDeleteId(t.id)} className="p-2 hover:bg-red-50 rounded-lg transition">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GymServiceTypesManager;
