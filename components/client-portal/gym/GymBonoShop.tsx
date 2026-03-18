import React, { useState, useEffect } from 'react';
import { gymService } from '../../../services/gymService';
import type { GymBono } from '../../../types';
import { CreditCard, ExternalLink, ShoppingBag } from 'lucide-react';

const GymBonoShop: React.FC = () => {
  const [bonos, setBonos] = useState<GymBono[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    gymService.getActiveBonos()
      .then(data => { setBonos(data); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (bonos.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-200" />
        <p className="text-gray-500">No hay bonos disponibles en este momento.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">Selecciona un bono y realiza el pago. Los creditos se activaran automaticamente.</p>

      <div className="space-y-3">
        {bonos.map(b => (
          <div key={b.id} className="p-4 bg-white rounded-xl border">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">{b.name}</h3>
                {b.description && <p className="text-sm text-gray-500">{b.description}</p>}
                <p className="text-sm text-gray-500 mt-1">{b.sessions_count} sesiones</p>
              </div>
              <div className="text-xl font-bold text-gray-900">{b.price} {b.currency}</div>
            </div>

            <div className="flex gap-2">
              {b.stripe_payment_link && (
                <a
                  href={b.stripe_payment_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                >
                  <CreditCard className="w-4 h-4" /> Pagar con Tarjeta
                </a>
              )}
              {b.paypal_payment_link && (
                <a
                  href={b.paypal_payment_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm font-medium"
                >
                  <ExternalLink className="w-4 h-4" /> PayPal
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GymBonoShop;
