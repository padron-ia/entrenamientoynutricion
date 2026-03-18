import React, { useState, lazy, Suspense } from 'react';
import { useGymMember } from '../hooks/useGymMember';
import { useGymCredits } from '../hooks/useGymCredits';
import {
  Calendar, Bell, User as UserIcon, Home,
  ChevronRight, CreditCard, ShoppingCart, Tag, BookOpen
} from 'lucide-react';

const GymScheduleView = lazy(() => import('./GymScheduleView'));
const GymReservationsView = lazy(() => import('./GymReservationsView'));
const GymCreditsView = lazy(() => import('./GymCreditsView'));
const GymPurchasesView = lazy(() => import('./GymPurchasesView'));
const GymBonoShop = lazy(() => import('./GymBonoShop'));

type GymTab = 'inicio' | 'horario' | 'notificaciones' | 'perfil';
type GymSubView = 'reservas' | 'saldo' | 'compras' | 'comprar' | null;

interface GymPortalProps {
  userId: string;
  userName: string;
}

const GymPortal: React.FC<GymPortalProps> = ({ userId, userName }) => {
  const { member, isLoading: memberLoading } = useGymMember(userId);
  const { totalRemaining, daysUntilExpiry, refresh: refreshCredits } = useGymCredits(member?.id);
  const [activeTab, setActiveTab] = useState<GymTab>('inicio');
  const [subView, setSubView] = useState<GymSubView>(null);

  if (memberLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-gray-500">No tienes una cuenta de miembro presencial asociada.</p>
      </div>
    );
  }

  const LoadingFallback = () => (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
    </div>
  );

  // Sub-views (rendered full-screen with back button)
  if (subView) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center gap-3 z-10">
          <button onClick={() => setSubView(null)} className="text-gray-500 hover:text-gray-900">
            &larr;
          </button>
          <h1 className="text-lg font-bold">
            {subView === 'reservas' ? 'Reservas' :
             subView === 'saldo' ? 'Saldo' :
             subView === 'compras' ? 'Compras' :
             subView === 'comprar' ? 'Comprar Bono' : ''}
          </h1>
        </div>
        <div className="p-4 max-w-lg mx-auto">
          <Suspense fallback={<LoadingFallback />}>
            {subView === 'reservas' && <GymReservationsView memberId={member.id} onCreditChange={refreshCredits} />}
            {subView === 'saldo' && <GymCreditsView memberId={member.id} />}
            {subView === 'compras' && <GymPurchasesView memberId={member.id} />}
            {subView === 'comprar' && <GymBonoShop />}
          </Suspense>
        </div>

        {/* Bottom nav */}
        <BottomNav activeTab={activeTab} setActiveTab={(t) => { setSubView(null); setActiveTab(t); }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Suspense fallback={<LoadingFallback />}>
        {activeTab === 'inicio' && (
          <div>
            {/* Header con imagen */}
            <div className="bg-gray-900 text-white p-6 pb-8">
              <p className="text-sm text-gray-400 mb-1">Mis centros</p>
              <h1 className="text-xl font-bold">La muralla fit boutique</h1>
            </div>

            <div className="p-4 max-w-lg mx-auto -mt-4">
              {/* Boton reservar */}
              <button
                onClick={() => setActiveTab('horario')}
                className="w-full py-3 bg-blue-600 text-white rounded-xl text-lg font-semibold hover:bg-blue-700 transition mb-4"
              >
                Reservar
              </button>

              {/* Creditos resumen */}
              {totalRemaining > 0 && (
                <div className="p-4 bg-white rounded-xl border mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Sesiones disponibles</p>
                      <p className="text-2xl font-bold text-blue-600">{totalRemaining}</p>
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      {daysUntilExpiry > 0 ? `Caducan en ${daysUntilExpiry} dias` : 'Caducan hoy'}
                    </div>
                  </div>
                </div>
              )}

              {/* Menu items */}
              <div className="bg-white rounded-xl border divide-y">
                <MenuItem icon={Calendar} label="Horario" onClick={() => setActiveTab('horario')} />
                <MenuItem icon={BookOpen} label="Mas informacion" onClick={() => {}} />
              </div>

              {/* Comprar mas */}
              {totalRemaining === 0 && (
                <button
                  onClick={() => setSubView('comprar')}
                  className="w-full mt-4 py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition"
                >
                  Comprar Bono
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'horario' && (
          <div className="p-4 max-w-lg mx-auto">
            <GymScheduleView memberId={member.id} onCreditChange={refreshCredits} />
          </div>
        )}

        {activeTab === 'notificaciones' && (
          <div className="p-4 max-w-lg mx-auto">
            <h2 className="text-xl font-bold mb-4">Notificaciones</h2>
            <p className="text-gray-500 text-sm text-center py-12">Las notificaciones se muestran en el panel principal.</p>
          </div>
        )}

        {activeTab === 'perfil' && (
          <div className="p-4 max-w-lg mx-auto">
            <div className="flex items-center gap-4 mb-6 p-4 bg-white rounded-xl border">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                {member.first_name[0]}{member.last_name[0]}
              </div>
              <div>
                <h2 className="text-xl font-bold">{member.first_name}</h2>
                <p className="text-sm text-gray-500">{member.email}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border divide-y">
              <MenuItem icon={Calendar} label="Reservas" onClick={() => setSubView('reservas')} />
              <MenuItem icon={Tag} label="Saldo" onClick={() => setSubView('saldo')} />
              <MenuItem icon={ShoppingCart} label="Compras" onClick={() => setSubView('compras')} />
              <MenuItem icon={CreditCard} label="Comprar Bono" onClick={() => setSubView('comprar')} />
            </div>
          </div>
        )}
      </Suspense>

      {/* Bottom nav */}
      <BottomNav activeTab={activeTab} setActiveTab={(t) => { setSubView(null); setActiveTab(t); }} />
    </div>
  );
};

// Componente item del menu (como en las capturas)
const MenuItem: React.FC<{ icon: React.FC<any>; label: string; onClick: () => void }> = ({ icon: Icon, label, onClick }) => (
  <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition">
    <Icon className="w-5 h-5 text-blue-600" />
    <span className="flex-1 text-left font-medium text-gray-900">{label}</span>
    <ChevronRight className="w-4 h-4 text-gray-400" />
  </button>
);

// Bottom navigation (replica del diseno de la app)
const BottomNav: React.FC<{ activeTab: GymTab; setActiveTab: (t: GymTab) => void }> = ({ activeTab, setActiveTab }) => (
  <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 safe-area-bottom z-20">
    {([
      { id: 'inicio' as GymTab, icon: Home, label: 'Inicio' },
      { id: 'horario' as GymTab, icon: Calendar, label: 'Horario' },
      { id: 'notificaciones' as GymTab, icon: Bell, label: 'Avisos' },
      { id: 'perfil' as GymTab, icon: UserIcon, label: 'Perfil' },
    ]).map(tab => (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={`flex flex-col items-center gap-0.5 px-4 py-1 ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-400'}`}
      >
        <tab.icon className="w-5 h-5" />
        <span className="text-[10px] font-medium">{tab.label}</span>
      </button>
    ))}
  </div>
);

export default GymPortal;
