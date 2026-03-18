import React, { useState, useEffect } from 'react';
import { gymService } from '../../services/gymService';
import type { GymBono, GymServiceType } from '../../types';
import { CreditCard, Plus, Edit, Save, Trash2, Link, ExternalLink } from 'lucide-react';
import { useToast } from '../ToastProvider';

const GymBonosManager: React.FC = () => {
  const [bonos, setBonos] = useState<GymBono[]>([]);
  const [serviceTypes, setServiceTypes] = useState<GymServiceType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<GymBono> | null>(null);
  const toast = useToast();

  useEffect(() => {
    Promise.all([
      gymService.getBonos(),
      gymService.getServiceTypes(),
    ]).then(([b, st]) => {
      setBonos(b);
      setServiceTypes(st);
      setIsLoading(false);
    }).catch(() => {
      toast.error('Error cargando datos');
      setIsLoading(false);
    });
  }, []);

  const fetchBonos = async () => {
    const data = await gymService.getBonos();
    setBonos(data);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name?.trim() || !editing.sessions_count || !editing.price) {
      toast.error('Nombre, sesiones y precio son obligatorios');
      return;
    }
    try {
      if (editing.id) {
        await gymService.updateBono(editing.id, editing);
        toast.success('Bono actualizado');
      } else {
        await gymService.createBono(editing);
        toast.success('Bono creado');
      }
      setEditing(null);
      fetchBonos();
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar');
    }
  };

  const getServiceName = (id: string) => serviceTypes.find(s => s.id === id)?.name || id;

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
          <h1 className="text-2xl font-bold text-gray-900">Bonos</h1>
          <p className="text-gray-500 mt-1">Packs de sesiones que los clientes pueden comprar</p>
        </div>
        <button
          onClick={() => setEditing({
            name: '', sessions_count: 9, price: 99, currency: 'EUR',
            compatible_service_type_ids: [], is_active: true, sort_order: bonos.length,
          })}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" /> Nuevo Bono
        </button>
      </div>

      {/* Modal edicion */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editing.id ? 'Editar Bono' : 'Nuevo Bono'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del bono</label>
                <input
                  type="text"
                  value={editing.name || ''}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ej: Bono 9 Sesiones Grupo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion (opcional)</label>
                <input
                  type="text"
                  value={editing.description || ''}
                  onChange={e => setEditing({ ...editing, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sesiones</label>
                  <input
                    type="number"
                    min="1"
                    value={editing.sessions_count || ''}
                    onChange={e => setEditing({ ...editing, sessions_count: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio (EUR)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editing.price || ''}
                    onChange={e => setEditing({ ...editing, price: parseFloat(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Servicios compatibles</label>
                <div className="space-y-2">
                  {serviceTypes.filter(s => s.is_active).map(st => (
                    <label key={st.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editing.compatible_service_type_ids?.includes(st.id) || false}
                        onChange={e => {
                          const ids = editing.compatible_service_type_ids || [];
                          setEditing({
                            ...editing,
                            compatible_service_type_ids: e.target.checked
                              ? [...ids, st.id]
                              : ids.filter(id => id !== st.id),
                          });
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: st.color }} />
                      <span className="text-sm">{st.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <hr />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Link className="w-4 h-4 inline mr-1" />Link de pago Stripe
                </label>
                <input
                  type="url"
                  value={editing.stripe_payment_link || ''}
                  onChange={e => setEditing({ ...editing, stripe_payment_link: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="https://buy.stripe.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Price ID (para webhooks)</label>
                <input
                  type="text"
                  value={editing.stripe_price_id || ''}
                  onChange={e => setEditing({ ...editing, stripe_price_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="price_..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Link className="w-4 h-4 inline mr-1" />Link de pago PayPal
                </label>
                <input
                  type="url"
                  value={editing.paypal_payment_link || ''}
                  onChange={e => setEditing({ ...editing, paypal_payment_link: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="https://www.paypal.com/..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editing.is_active ?? true}
                  onChange={e => setEditing({ ...editing, is_active: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Bono activo (visible para clientes)</span>
              </div>
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

      {/* Lista de bonos */}
      <div className="space-y-3">
        {bonos.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay bonos creados</p>
          </div>
        ) : (
          bonos.map(b => (
            <div key={b.id} className={`p-4 bg-white rounded-xl border hover:shadow-sm transition ${!b.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{b.name}</span>
                    {!b.is_active && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Inactivo</span>}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span>{b.sessions_count} sesiones</span>
                    <span className="font-medium text-gray-900">{b.price} {b.currency}</span>
                  </div>
                  {b.compatible_service_type_ids?.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {b.compatible_service_type_ids.map(id => (
                        <span key={id} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                          {getServiceName(id)}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3 mt-2">
                    {b.stripe_payment_link && (
                      <a href={b.stripe_payment_link} target="_blank" rel="noopener" className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
                        <ExternalLink className="w-3 h-3" /> Stripe
                      </a>
                    )}
                    {b.paypal_payment_link && (
                      <a href={b.paypal_payment_link} target="_blank" rel="noopener" className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
                        <ExternalLink className="w-3 h-3" /> PayPal
                      </a>
                    )}
                  </div>
                </div>
                <button onClick={() => setEditing(b)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                  <Edit className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GymBonosManager;
