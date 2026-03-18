import React, { useState, useEffect } from 'react';
import { gymService } from '../../../services/gymService';
import type { GymBonoPurchase } from '../../../types';
import { ShoppingCart } from 'lucide-react';

interface GymPurchasesViewProps {
  memberId: string;
}

const GymPurchasesView: React.FC<GymPurchasesViewProps> = ({ memberId }) => {
  const [purchases, setPurchases] = useState<GymBonoPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    gymService.getPurchaseHistory(memberId)
      .then(data => { setPurchases(data); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, [memberId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-200" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Sin compras</h3>
        <p className="text-gray-500 text-sm">No tienes compras registradas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {purchases.map(p => (
        <div key={p.id} className="p-4 bg-white rounded-xl border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500 mb-0.5">La muralla fit boutique</div>
              <div className="font-semibold text-gray-900">{p.bono_name}</div>
              <div className="text-xs text-gray-500">
                Bono {p.bono_sessions} sesiones
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-gray-900">{p.amount} {p.currency}</div>
              <div className="text-xs text-gray-400">
                {new Date(p.purchased_at).toLocaleDateString('es-ES')}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GymPurchasesView;
