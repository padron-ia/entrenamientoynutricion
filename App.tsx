
import React, { useState, useEffect, useCallback, useMemo, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { User, Client, ClientStatus, UserRole } from './types';
import { mockAuth, mockDb, mockAdmin } from './services/mockSupabase';
import { supabase } from './services/supabaseClient';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ClientList from './components/ClientList';
import ClientDetail from './components/ClientDetail';
import UserProfile from './components/UserProfile';
import Login from './components/Login';
import { ToastProvider, useToast } from './components/ToastProvider';
import { syncRolePermissions } from './utils/permissions';
import { normalizeRole } from './utils/roleUtils';

// Lazy loaded components (reducen carga inicial ~40%)
const AnalyticsView = lazy(() => import('./components/AnalyticsView'));
const RenewalsView = lazy(() => import('./components/RenewalsView'));
const AdminSettings = lazy(() => import('./components/AdminSettings'));
const ClientPortalDashboard = lazy(() => import('./components/client-portal/ClientPortalDashboard').then(m => ({ default: m.ClientPortalDashboard })));
const ClassesManagement = lazy(() => import('./components/ClassesManagement'));
const ReviewsView = lazy(() => import('./components/ReviewsView'));
const FoodPlansLibrary = lazy(() => import('./components/FoodPlansLibrary'));
const MaterialsLibrary = lazy(() => import('./components/MaterialsLibrary'));
const CreateAnnouncement = lazy(() => import('./components/MassCommunication').then(m => ({ default: m.CreateAnnouncement })));
const OnboardingPage = lazy(() => import('./components/onboarding/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const InvoicesManagement = lazy(() => import('./components/InvoicesManagement').then(m => ({ default: m.InvoicesManagement })));
const TestimonialsManager = lazy(() => import('./components/TestimonialsManager').then(m => ({ default: m.TestimonialsManager })));
const PaymentLinksLibrary = lazy(() => import('./components/PaymentLinksLibrary').then(m => ({ default: m.PaymentLinksLibrary })));
const TeamDirectory = lazy(() => import('./components/TeamDirectory'));
const NewSaleForm = lazy(() => import('./components/NewSaleForm').then(m => ({ default: m.NewSaleForm })));
const CloserDashboard = lazy(() => import('./components/CloserDashboard').then(m => ({ default: m.CloserDashboard })));
const CoachCapacityManagement = lazy(() => import('./components/CoachCapacityManagement').then(m => ({ default: m.CoachCapacityManagement })));
const CoachPerformancePanel = lazy(() => import('./components/CoachPerformancePanel'));
const SetterPerformancePanel = lazy(() => import('./components/SetterPerformancePanel'));
const CloserPerformancePanel = lazy(() => import('./components/CloserPerformancePanel'));
const AccountingDashboard = lazy(() => import('./components/AccountingDashboard').then(m => ({ default: m.AccountingDashboard })));
const TeamAnnouncementsView = lazy(() => import('./components/TeamAnnouncementsView').then(m => ({ default: m.TeamAnnouncementsView })));
const ExecutiveDashboard = lazy(() => import('./components/ExecutiveDashboard'));
const RRSSDashboard = lazy(() => import('./components/RRSSDashboard'));
const ContractManager = lazy(() => import('./components/ContractManager').then(m => ({ default: m.ContractManager })));
const SupportTicketsView = lazy(() => import('./components/SupportTicketsView').then(m => ({ default: m.SupportTicketsView })));
const StaffPortalView = lazy(() => import('./components/StaffPortalView').then(m => ({ default: m.StaffPortalView })));
const TeamOnboardingPage = lazy(() => import('./components/TeamOnboardingPage'));
const ActivateAccountPage = lazy(() => import('./components/activation/ActivateAccountPage').then(m => ({ default: m.ActivateAccountPage })));
const LeadsPipeline = lazy(() => import('./components/leads/LeadsPipeline'));
const StaffManagementView = lazy(() => import('./components/StaffManagementView'));
const ChatView = lazy(() => import('./components/chat/ChatView').then(m => ({ default: m.ChatView })));
const AssessmentPortal = lazy(() => import('./components/assessment/AssessmentPortal').then(m => ({ default: m.AssessmentPortal })));
const RegistrationPage = lazy(() => import('./components/registration/RegistrationPage').then(m => ({ default: m.RegistrationPage })));
const AnamnesisPortal = lazy(() => import('./components/anamnesis/AnamnesisPortal').then(m => ({ default: m.AnamnesisPortal })));
const AssessmentManager = lazy(() => import('./components/assessment/AssessmentManager').then(m => ({ default: m.AssessmentManager })));
const AdminAnalytics = lazy(() => import('./components/AdminAnalytics'));
const RolePermissionsManager = lazy(() => import('./components/RolePermissionsManager').then(m => ({ default: m.RolePermissionsManager })));
const SlackSettings = lazy(() => import('./components/SlackSettings').then(m => ({ default: m.SlackSettings })));
const SalesIntelligenceDashboard = lazy(() => import('./components/SalesIntelligenceDashboard'));
const ChurnRetentionView = lazy(() => import('./components/ChurnRetentionView'));
const RiskAlertsView = lazy(() => import('./components/RiskAlertsView').then(m => ({ default: m.RiskAlertsView })));
const CoachAgenda = lazy(() => import('./components/CoachAgenda'));
const NutritionManagement = lazy(() => import('./components/NutritionManagement'));
const DireccionDashboard = lazy(() => import('./components/DireccionDashboard'));
const CRMMEDashboard = lazy(() => import('./components/CRMMEDashboard'));
const CRMMEClientsView = lazy(() => import('./components/CRMMEClientsView'));
const NutritionHub = lazy(() => import('./components/NutritionHub').then(m => ({ default: m.NutritionHub })));
const TrainingManagement = lazy(() => import('./components/training/TrainingManagement').then(m => ({ default: m.TrainingManagement })));
const RenewalCallsManager = lazy(() => import('./components/RenewalCallsManager'));
const HeadCoachWeeklyDashboard = lazy(() => import('./components/HeadCoachWeeklyDashboard'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
      <p className="text-slate-500 text-sm">Cargando...</p>
    </div>
  </div>
);

const SESSION_KEY = 'pt_crm_session';

const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [coaches, setCoaches] = useState<User[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; name: string; platform_fee_percentage: number }[]>([]);
  const [activeView, setActiveView] = useState<'dashboard' | 'clients' | 'renewals' | 'renewal-calls' | 'analytics' | 'analytics-webinars' | 'analytics-profile' | 'analytics-pt' | 'analytics-me' | 'profile' | 'settings' | 'client-portal' | 'classes' | 'reviews' | 'food-plans' | 'materials-library' | 'nutrition-management' | 'nutrition-hub' | 'training-management' | 'invoices' | 'testimonials' | 'payment-links' | 'team-directory' | 'staff-management' | 'medical-reviews' | 'new-sale' | 'closer-dashboard' | 'coach-capacity' | 'coach-performance' | 'setter-performance' | 'closer-performance' | 'accounting-dashboard' | 'team-announcements' | 'contracts' | 'support-tickets' | 'coach-tasks' | 'leads' | 'chat' | 'assessment-manager' | 'role-permissions' | 'slack-settings' | 'staff-metrics' | 'risk-alerts' | 'direccion-dashboard' | 'me-dashboard' | 'me-clients' | 'me-closer-performance' | 'me-setter-performance' | 'head-coach-weekly' | 'churn-retention'>('dashboard');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [previousView, setPreviousView] = useState<string | null>(null);
  const [clientsFilter, setClientsFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | undefined>();
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  const toast = useToast();

  // Restaurar sesión al cargar la app
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedSession = localStorage.getItem(SESSION_KEY);
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          // Verificar que la sesión no haya expirado (30 días)
          const sessionAge = Date.now() - (sessionData.timestamp || 0);
          const thirtyDays = 30 * 24 * 60 * 60 * 1000;

          if (sessionAge < thirtyDays && sessionData.user) {
            const savedUser = sessionData.user as User;

            // Si la sesión guardada NO es mock, debe existir sesión real en Supabase.
            // Evita estado "logeado" en UI pero sin token real (causa errores RLS al subir archivos).
            if (!savedUser.isMockSession) {
              const { data: authSessionData } = await supabase.auth.getSession();
              if (!authSessionData.session?.user) {
                localStorage.removeItem(SESSION_KEY);
                setLoginError('Tu sesión ha expirado. Inicia sesión de nuevo para subir archivos y operar con normalidad.');
                return;
              }
            }

            setUser(savedUser);
            // Restaurar vista según rol
            const role = normalizeRole(savedUser.role);
            if (role === 'closer') setActiveView('closer-dashboard');
            else if (role === 'direccion') setActiveView('direccion-dashboard');
            else if (role === 'contabilidad') setActiveView('accounting-dashboard');
            else if (savedUser.role === UserRole.CLIENT) setActiveView('client-portal');
            else setActiveView('dashboard');
          } else {
            // Sesión expirada, limpiar
            localStorage.removeItem(SESSION_KEY);
          }
        }
      } catch (e) {
        console.error('Error restoring session:', e);
        localStorage.removeItem(SESSION_KEY);
      } finally {
        setIsRestoringSession(false);
      }
    };
    restoreSession();
  }, []);

  // Cargar matriz de permisos dinámica
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const { data, error } = await supabase
          .from('role_permissions_registry')
          .select('*')
          .eq('enabled', true);

        if (error) throw error;

        if (data && data.length > 0) {
          const matrix: Record<string, string[]> = {};
          data.forEach(item => {
            if (!matrix[item.role]) matrix[item.role] = [];
            matrix[item.role].push(item.permission);
          });
          syncRolePermissions(matrix);
        }
      } catch (err) {
        console.error('Error loading dynamic permissions:', err);
      }
    };

    loadPermissions();
  }, [user]);

  // Global Chat Notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global_chat_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id === user.id) return;
          if (activeView === 'chat') return;

          // Check if participant
          const { data: participation } = await supabase
            .from('chat_room_participants')
            .select('*')
            .match({ room_id: msg.room_id, user_id: user.id })
            .maybeSingle();

          if (participation) {
            toast.info(
              `Mensaje de Chat: ${msg.content.substring(0, 40)}${msg.content.length > 40 ? '...' : ''}`,
              5000,
              { label: 'Ver Chat', onClick: () => setActiveView('chat') }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeView, toast]);

  const filteredClients = useMemo(() => {
    if (!user) return [];
    const userRoleLower = normalizeRole(user.role);
    const hasFullVisibility = userRoleLower === 'admin' || userRoleLower === 'head_coach' || userRoleLower === 'contabilidad' || userRoleLower === 'direccion';

    if (hasFullVisibility) return clients;

    const coachId = (user.id || '').toLowerCase();
    const coachName = (user.name || '').toLowerCase();
    const emailPrefix = (user.email || '').split('@')[0].toLowerCase();

    return clients.filter(c => {
      if (!c) return false;
      const cCoachId = (c.coach_id || '').toLowerCase();
      // Prioridad: Match exacto por UUID, luego por nombre, luego por prefijo de email (legacy)
      return cCoachId === coachId ||
        cCoachId === coachName ||
        (emailPrefix.length > 3 && cCoachId.includes(emailPrefix)) ||
        (c.property_coach && (c.property_coach.toLowerCase() === coachName || c.property_coach.toLowerCase() === coachId));
    });
  }, [clients, user]);

  // Fetch clients based on current user role (simulates RLS)
  const fetchClients = useCallback(async (currentUser: User) => {
    setIsLoading(true);
    try {
      const data = await mockDb.getClients(currentUser);
      setClients(data);
      if (currentUser.role === UserRole.CLIENT && data.length > 0) {
        setSelectedClient(data[0]);
        setActiveView('client-portal');
      }

      // Load coaches for performance panel (admin/head_coach only)
      const role = (currentUser.role || '').toLowerCase().replace(' ', '_');
      if (role === 'admin' || role === 'head_coach' || role === 'coach' || role === 'contabilidad' || role === 'direccion') {
        try {
          const allUsers = await mockAdmin.getUsers();
          // Standard: Everyone who is NOT a client can be considered staff/coach for name resolution
          const staffUsers = allUsers.filter((u: User) =>
            u.role !== UserRole.CLIENT && (u.role || '').toLowerCase() !== 'client'
          );
          setCoaches(staffUsers);
        } catch (e) {
          console.error('Error loading coaches:', e);
        }

        // Load payment methods for fee calculations
        try {
          const { data: pmData } = await supabase
            .from('payment_methods')
            .select('id, name, platform_fee_percentage')
            .order('name');
          if (pmData) setPaymentMethods(pmData);
        } catch (e) {
          console.error('Error loading payment methods:', e);
        }
      }
    } catch (error) {
      console.error("Failed to fetch clients", error);
      toast.error("Error al cargar datos");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Cargar clientes cuando se restaura la sesión (solo una vez)
  const hasLoadedClientsRef = React.useRef(false);
  useEffect(() => {
    if (user && !isRestoringSession && !hasLoadedClientsRef.current) {
      hasLoadedClientsRef.current = true;
      fetchClients(user);
    }
  }, [user, isRestoringSession]); // eslint-disable-line react-hooks/exhaustive-deps

  // Refrescar datos cuando la pestaña vuelve a estar visible (crucial para móvil)
  useEffect(() => {
    if (!user) return;

    let lastRefresh = Date.now();
    const MIN_REFRESH_INTERVAL = 60_000; // Mínimo 1 minuto entre refrescos

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRefresh > MIN_REFRESH_INTERVAL) {
        lastRefresh = Date.now();
        fetchClients(user);
      }
    };

    const handleOnline = () => {
      if (Date.now() - lastRefresh > MIN_REFRESH_INTERVAL) {
        lastRefresh = Date.now();
        fetchClients(user);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [user, fetchClients]);

  const handleLogin = async (identifier: string, password?: string, roleType: 'staff' | 'client' = 'staff') => {
    setLoginError(undefined);
    try {
      const loggedUser = await mockAuth.login(identifier, password, roleType);
      if (loggedUser) {
        setUser(loggedUser);

        // Guardar sesión en localStorage para persistencia
        localStorage.setItem(SESSION_KEY, JSON.stringify({
          user: loggedUser,
          timestamp: Date.now()
        }));

        const role = normalizeRole(loggedUser.role);
        // Role-based Redirects
        if (role === 'direccion') {
          setActiveView('direccion-dashboard');
        } else if (role === 'closer') {
          setActiveView('closer-dashboard');
        } else if (role === 'contabilidad') {
          setActiveView('accounting-dashboard');
        } else if (loggedUser.role === UserRole.CLIENT) {
          setActiveView('client-portal');
        } else {
          setActiveView('dashboard');
        }

        // El useEffect se encargará de llamar a fetchClients cuando user cambie
        toast.success(roleType === 'client' ? `¡Bienvenido, ${loggedUser.name}!` : `¡Hola, ${loggedUser.name}!`);
      } else {
        setLoginError("Credenciales incorrectas.");
      }
    } catch (err: any) {
      setLoginError(err.message || "Error al iniciar sesión.");
      toast.error(err.message || "Error al iniciar sesión");
    }
  };

  const handleLogout = () => {
    // Limpiar sesión de localStorage
    localStorage.removeItem(SESSION_KEY);
    hasLoadedClientsRef.current = false; // Reset para próximo login
    setUser(null);
    setClients([]);
    setActiveView('dashboard');
    setSelectedClient(null);
    toast.info("Sesión cerrada correctamente");
  };

  const getErrorMessage = (error: any): string => {
    if (!error) return 'Error desconocido';
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    return "Error no serializable";
  };

  const handleStatusChange = async (clientId: string, newStatus: ClientStatus, additionalData?: Partial<Client>) => {
    try {
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, status: newStatus, ...additionalData } : c));
      if (selectedClient?.id === clientId) setSelectedClient(prev => prev ? { ...prev, status: newStatus, ...additionalData } : null);
      await mockDb.updateClientStatus(clientId, newStatus, additionalData);
      toast.success("Estado actualizado correctamente");
    } catch (error: any) {
      toast.error(`Error al actualizar estado: ${getErrorMessage(error)}`);
      if (user) fetchClients(user);
    }
  };

  const handleClientUpdate = async (updatedClient: Client) => {
    try {
      setSelectedClient(updatedClient);
      setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
      await mockDb.updateClient(updatedClient);
      toast.success("Cliente actualizado correctamente");
    } catch (error: any) {
      toast.error(`Error al guardar cambios: ${getErrorMessage(error)}`);
    }
  };

  const handleUserUpdate = async (updatedUser: User) => {
    try {
      const savedUser = await mockAuth.updateUser(updatedUser);
      setUser(savedUser);
      toast.success("Perfil actualizado correctamente");
    } catch (error) {
      toast.error("Error al actualizar perfil");
    }
  };

  const handleAdminUpdateUser = async (updatedUser: User) => {
    try {
      const result = await mockAdmin.updateUser(updatedUser);
      toast.success("Usuario actualizado correctamente");
      return result;
    } catch (error) {
      toast.error("Error al actualizar usuario");
      throw error;
    }
  };

  const handleViewClient = (client: Client) => {
    setPreviousView(activeView);
    setSelectedClient(client);
  };

  const handleViewAsClient = () => {
    if (selectedClient) {
      setActiveView('client-portal');
      toast.info(`Vista previa del portal de: ${selectedClient.firstName}`);
    }
  };

  const handleBackToListView = () => {
    if (user?.role === UserRole.CLIENT) return;
    setSelectedClient(null);
    // Restaurar la vista anterior si existe (ej: volver a 'reviews' si venía de ahí)
    if (previousView) {
      setActiveView(previousView as any);
      setPreviousView(null);
    }
    // Recargar clientes para reflejar cambios (ej: revisiones actualizadas)
    if (user) fetchClients(user);
  };

  const handleNavigate = (view: string, filter?: string) => {
    if (['dashboard', 'clients', 'renewals', 'renewal-calls', 'analytics', 'analytics-webinars', 'analytics-profile', 'analytics-pt', 'analytics-me', 'profile', 'settings', 'client-portal', 'classes', 'reviews', 'food-plans', 'materials-library', 'nutrition-management', 'nutrition-hub', 'training-management', 'invoices', 'testimonials', 'payment-links', 'team-directory', 'medical-reviews', 'new-sale', 'closer-dashboard', 'coach-capacity', 'coach-performance', 'setter-performance', 'closer-performance', 'accounting-dashboard', 'team-announcements', 'contracts', 'support-tickets', 'coach-tasks', 'leads', 'chat', 'assessment-manager', 'staff-management', 'role-permissions', 'slack-settings', 'staff-metrics', 'risk-alerts', 'coach-agenda', 'direccion-dashboard', 'me-dashboard', 'me-clients', 'me-closer-performance', 'me-setter-performance', 'endocrino-dashboard', 'endocrino-invoices', 'endocrino-initial-reports', 'create-medical-report', 'endocrino-medical-reports', 'head-coach-weekly', 'churn-retention'].includes(view)) {
      setActiveView(view as any);
      // Si se navega a clients con filtro, establecerlo
      if (view === 'clients' && filter) {
        setClientsFilter(filter);
      } else {
        setClientsFilter(null);
      }
      if (user?.role !== UserRole.CLIENT && view !== 'client-portal') {
        setSelectedClient(null);
        // No recargar clientes al navegar - ya están en memoria
      }
    }
  };

  // Mostrar loading mientras se restaura la sesión
  if (isRestoringSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} error={loginError} onRegisterClick={() => { }} />;
  }

  // --- CLIENT RENDER LOGIC ---
  if (user.role === UserRole.CLIENT) {
    if (selectedClient) {
      // Block access for inactive/dropout clients
      if (selectedClient.status === ClientStatus.INACTIVE || selectedClient.status === ClientStatus.DROPOUT) {
        const statusLabel = selectedClient.status === ClientStatus.DROPOUT ? 'abandono' : 'baja';
        return (
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-10 h-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Acceso no disponible</h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Tu cuenta se encuentra actualmente en estado de <strong>{statusLabel}</strong>. El acceso al portal no est\u00e1 disponible en este momento.
                </p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-slate-700 text-sm font-medium mb-1">Si tienes cualquier consulta:</p>
                <p className="text-slate-500 text-xs">
                  Ponte en contacto con <strong>Padron Trainer</strong> y te ayudaremos con lo que necesites.
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors text-sm"
              >
                Cerrar sesi\u00f3n
              </button>
            </div>
          </div>
        );
      }

      // If client needs anamnesis and activeView is 'anamnesis', show the form
      if (!selectedClient.onboarding_phase2_completed && activeView === 'anamnesis') {
        return (
          <AnamnesisPortal
            client={selectedClient}
            onComplete={() => { fetchClients(user); setActiveView('client-portal'); }}
          />
        );
      }

      if (activeView === 'client-portal' || activeView === 'anamnesis') {
        return (
          <div className="relative">
            <ClientPortalDashboard
              client={selectedClient}
              onRefresh={() => user && fetchClients(user)}
              onStartAnamnesis={() => setActiveView('anamnesis')}
            />
            <button
              onClick={handleLogout}
              className="fixed bottom-4 right-4 bg-white/90 backdrop-blur text-gray-500 hover:text-red-500 p-3 rounded-full shadow-lg transition-all z-50 text-xs font-semibold flex items-center gap-2"
            >
              🚪 Salir
            </button>
          </div>
        );
      }
    }
    return (
      <Layout user={user} onLogout={handleLogout} activeView={activeView} onNavigate={handleNavigate}>
        <div className="flex items-center justify-center h-screen">Cargando tu espacio...</div>
      </Layout>
    );
  }

  // --- STAFF RENDER LOGIC ---
  if ((activeView === 'client-portal' || activeView === 'anamnesis') && selectedClient) {
    return (
      <div className="relative min-h-screen bg-gray-100">
        <div className="bg-gray-900 text-white px-4 py-3 sticky top-0 z-50 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2">
            <span className="bg-purple-600 text-xs font-bold px-2 py-1 rounded uppercase">Modo Previsualización</span>
            <span className="text-sm">Viendo portal de: <strong>{selectedClient.firstName}</strong></span>
          </div>
          <button
            onClick={() => setActiveView('clients')}
            className="bg-white text-gray-900 hover:bg-gray-100 px-4 py-1.5 rounded-full text-sm font-bold transition-colors flex items-center gap-2"
          >
            <span>👁️ Volver a CRM</span>
          </button>
        </div>
        {activeView === 'anamnesis' ? (
          <AnamnesisPortal
            client={selectedClient}
            onComplete={() => { if (user) fetchClients(user); setActiveView('client-portal'); }}
          />
        ) : (
          <ClientPortalDashboard
            client={selectedClient}
            onRefresh={() => user && fetchClients(user)}
            onStartAnamnesis={() => setActiveView('anamnesis')}
          />
        )}
      </div>
    );
  }

  return (
    <Layout user={user} onLogout={handleLogout} activeView={activeView} onNavigate={handleNavigate}>
      <Suspense fallback={<LoadingFallback />}>
        {selectedClient ? (
          <ClientDetail
            client={selectedClient}
            onBack={handleBackToListView}
            onUpdateStatus={handleStatusChange}
            onSave={handleClientUpdate}
            onViewAsClient={handleViewAsClient}
            currentUser={user}
            coaches={coaches}
          />

        ) : activeView === 'profile' ? (
          <UserProfile user={user} onSave={handleUserUpdate} />
        ) : activeView === 'settings' ? (
          <AdminSettings
            currentUser={user}
            onFetchUsers={mockAdmin.getUsers}
            onUpdateUser={handleAdminUpdateUser}
            onDeleteUser={mockAdmin.deleteUser}
          />
        ) : activeView === 'renewals' ? (
          <RenewalsView clients={filteredClients} user={user} onNavigateToClient={handleViewClient} coaches={coaches} paymentMethods={paymentMethods} />
        ) : activeView === 'renewal-calls' ? (
          <RenewalCallsManager clients={filteredClients} user={user} coaches={coaches} onNavigateToClient={handleViewClient} />
        ) : activeView === 'classes' ? (
          <ClassesManagement currentUser={user} />
        ) : activeView === 'reviews' ? (
          <ReviewsView clients={filteredClients} onNavigateToClient={handleViewClient} />
        ) : activeView === 'food-plans' ? (
          <FoodPlansLibrary />
        ) : activeView === 'materials-library' ? (
          <MaterialsLibrary currentUser={user} />
        ) : activeView === 'nutrition-hub' ? (
          <NutritionHub user={user} />
        ) : activeView === 'nutrition-management' ? (
          <NutritionManagement currentUser={user} />
        ) : activeView === 'training-management' ? (
          <TrainingManagement currentUser={user} />
        ) : activeView === 'invoices' ? (
          <InvoicesManagement currentUser={user} />
        ) : activeView === 'testimonials' ? (
          <TestimonialsManager currentUser={user} onNavigate={handleNavigate} />
        ) : activeView === 'payment-links' ? (
          <PaymentLinksLibrary />
        ) : activeView === 'team-directory' ? (
          <TeamDirectory currentUser={user} />
        ) : activeView === 'staff-management' ? (
          <StaffManagementView
            currentUser={user}
            onUpdateUser={handleAdminUpdateUser}
            onDeleteUser={mockAdmin.deleteUser}
          />
        ) : activeView === 'new-sale' ? (
          <NewSaleForm currentUser={user} />
        ) : activeView === 'closer-dashboard' ? (
          <CloserDashboard userId={user.id} userName={user.name} />
        ) : activeView === 'coach-capacity' ? (
          <CoachCapacityManagement />
        ) : activeView === 'coach-performance' ? (
          <CoachPerformancePanel
            currentUser={user}
            clients={filteredClients}
            coaches={coaches}
          />
        ) : activeView === 'setter-performance' ? (
          <SetterPerformancePanel currentUser={user} />
        ) : activeView === 'closer-performance' ? (
          <CloserPerformancePanel currentUser={user} />
        ) : activeView === 'accounting-dashboard' ? (
          <AccountingDashboard
            currentUser={user}
            clients={filteredClients}
            onNavigateToClient={handleViewClient}
            coaches={coaches}
          />
        ) : activeView === 'contracts' ? (
          <ContractManager currentUser={user} />
        ) : activeView === 'support-tickets' ? (
          <SupportTicketsView user={user} clients={clients} />
        ) : activeView === 'coach-tasks' ? (
          <StaffPortalView user={user} clients={clients} />
        ) : activeView === 'team-announcements' ? (
          <TeamAnnouncementsView user={user} clients={filteredClients} />
        ) : activeView === 'mass-communication' ? (
          <div className="max-w-3xl mx-auto py-8">
            <h1 className="text-2xl font-black text-slate-800 mb-6">Comunicar a Mis Clientes</h1>
            <CreateAnnouncement
              currentUser={user.id}
              isAdmin={(user.role || '').toLowerCase() === 'admin' || (user.role || '').toLowerCase() === 'head_coach'}
              clients={filteredClients}
              onClose={() => handleNavigate('dashboard')}
              onSuccess={() => handleNavigate('team-announcements')}
              defaultAudience="my_clients"
            />
          </div>
        ) : activeView === 'leads' ? (
          <LeadsPipeline currentUser={user} />
        ) : activeView === 'chat' ? (
          <ChatView user={user} />
        ) : activeView === 'assessment-manager' ? (
          <AssessmentManager />
        ) : activeView === 'role-permissions' ? (
          <RolePermissionsManager />
        ) : activeView === 'slack-settings' ? (
          <SlackSettings />
        ) : (activeView === 'analytics' || activeView === 'analytics-webinars' || activeView === 'analytics-profile' || activeView === 'analytics-pt' || activeView === 'analytics-me') ? (
          (normalizeRole(user.role) === 'admin' || normalizeRole(user.role) === 'head_coach' || normalizeRole(user.role) === 'direccion') ? (
            <AdminAnalytics
              defaultTab={activeView === 'analytics-webinars' ? 'webinars' : activeView === 'analytics-profile' ? 'client-profile' : 'monthly'}
              initialProject={activeView === 'analytics-pt' ? 'PT' : activeView === 'analytics-me' ? 'ME' : 'Global'}
            />
          ) : (
            <div className="flex items-center justify-center h-screen text-slate-400">Acceso denegado</div>
          )
        ) : activeView === 'staff-metrics' ? (
          <SalesIntelligenceDashboard currentUser={user} />
        ) : activeView === 'churn-retention' ? (
          <ChurnRetentionView />
        ) : activeView === 'risk-alerts' ? (
          <RiskAlertsView
            clients={filteredClients}
            coaches={coaches}
            currentUser={user}
            onNavigateToClient={handleViewClient}
          />
        ) : activeView === 'coach-agenda' ? (
          <CoachAgenda clients={filteredClients} user={user} onNavigateToClient={handleViewClient} />
        ) : activeView === 'direccion-dashboard' ? (
          <DireccionDashboard user={user} onNavigate={handleNavigate} />
        ) : activeView === 'me-clients' ? (
          <CRMMEClientsView />
        ) : activeView === 'me-closer-performance' ? (
          <CRMMEDashboard /> // Placeholder - reuse dashboard for now
        ) : activeView === 'me-setter-performance' ? (
          <CRMMEDashboard /> // Placeholder - reuse dashboard for now
        ) : activeView === 'head-coach-weekly' ? (
          <HeadCoachWeeklyDashboard currentUser={user} coaches={coaches} clients={filteredClients} />
        ) : activeView === 'dashboard' ? (
          (normalizeRole(user.role) === 'admin' || normalizeRole(user.role) === 'head_coach') ? (
            <ExecutiveDashboard
              clients={filteredClients}
              user={user}
              onNavigateToView={handleNavigate}
              onNavigateToClient={handleViewClient}
              coaches={coaches}
              onRefreshData={() => user && fetchClients(user)}
            />
          ) : normalizeRole(user.role) === 'rrss' ? (
            <RRSSDashboard
              user={user}
              onNavigateToView={handleNavigate}
              onNavigateToClient={handleViewClient}
            />
          ) : normalizeRole(user.role) === 'closer' ? (
            <CloserDashboard userId={user.id} userName={user.name} onNavigateToView={handleNavigate} />
          ) : normalizeRole(user.role) === 'direccion' ? (
            <AdminAnalytics
              defaultTab="monthly"
              initialProject="PT"
            />
          ) : (
            <Dashboard
              clients={filteredClients}
              user={user}
              onNavigateToClient={handleViewClient}
              onNavigateToView={handleNavigate}
              onRefreshData={() => user && fetchClients(user)}
            />
          )
        ) : (
          <ClientList
            clients={filteredClients}
            currentUser={user}
            onUpdateStatus={handleStatusChange}
            onSelectClient={handleViewClient}
            isLoading={isLoading}
            initialFilter={clientsFilter}
            onFilterChange={() => setClientsFilter(null)}
            coaches={coaches}
          />
        )}
      </Suspense>
    </Layout>
  );
};

import { ForgotPasswordPage } from './components/ForgotPasswordPage';
import { UpdatePasswordPage } from './components/UpdatePasswordPage';
import { LandingPage } from './components/landing/LandingPage';
import { ClientAccessLanding } from './components/landing/ClientAccessLanding';
import { RequestInfoPage } from './components/landing/RequestInfoPage';

const App: React.FC = () => {
  return (
    <HashRouter>
      <ToastProvider>
        <Routes>
          {/* Password Recovery Routes */}
          <Route path="/acceso-clientes" element={<Navigate to="/login" replace />} />
          <Route path="/ayuda-clientes" element={<Navigate to="/forgot-password" replace />} />
          <Route path="/solicitar-informacion" element={<RequestInfoPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />

          {/* Public registration route (no token needed) */}
          <Route path="/registro" element={<Suspense fallback={<LoadingFallback />}><RegistrationPage /></Suspense>} />

          {/* Client onboarding route */}
          <Route path="/bienvenida/:token" element={<Suspense fallback={<LoadingFallback />}><OnboardingPage /></Suspense>} />

          {/* Team member onboarding route - public, no auth required */}
          <Route path="/equipo/unirse/:token" element={<Suspense fallback={<LoadingFallback />}><TeamOnboardingPage /></Suspense>} />

          {/* Client account activation route - public */}
          <Route path="/activar-cuenta/:token" element={<Suspense fallback={<LoadingFallback />}><ActivateAccountPage /></Suspense>} />

          {/* Main app */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AppContent />} />
          <Route path="/app/*" element={<AppContent />} />
          <Route path="/*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ToastProvider>
    </HashRouter>
  );
};

export default App;
