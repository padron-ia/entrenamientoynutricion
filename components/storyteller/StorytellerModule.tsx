import React, { useState, useEffect } from 'react';
import { SuccessCase, CaseStatus } from './types';
import { User as CRMUser, UserRole } from '../../types';
import Dashboard from './pages/Dashboard';
import NewCase from './pages/NewCase';
import Analyze from './pages/Analyze';
import Briefing from './pages/Briefing';
import Sidebar from './components/Sidebar';
import { storytellerService } from './services/storytellerService';

interface StorytellerModuleProps {
    clientId?: string;
    clientName?: string;
    currentUser?: CRMUser;
}

const StorytellerModule: React.FC<StorytellerModuleProps> = ({ clientId, clientName, currentUser }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'new-case' | 'analyze' | 'briefing' | 'pricing'>('dashboard');
    const [cases, setCases] = useState<SuccessCase[]>([]);
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadCases();
    }, [clientId]);

    const loadCases = async () => {
        setLoading(true);
        try {
            const data = await storytellerService.getCases(clientId);
            setCases(data);
        } catch (error) {
            console.error("Error loading cases:", error);
        } finally {
            setLoading(false);
        }
    };

    const addCase = async (newCase: SuccessCase) => {
        try {
            const saved = await storytellerService.saveCase(newCase, clientId);
            setCases(prev => [saved, ...prev]);
            setSelectedCaseId(saved.id);
            setActiveTab('analyze');
        } catch (error) {
            console.error("Error saving case:", error);
            alert("Error al guardar el caso. Inténtalo de nuevo.");
        }
    };

    const updateCase = async (updated: SuccessCase) => {
        try {
            const saved = await storytellerService.saveCase(updated, clientId);
            setCases(prev => prev.map(c => c.id === saved.id ? saved : c));
        } catch (error) {
            console.error("Error updating case:", error);
        }
    };

    const canCreate = currentUser?.role === UserRole.COACH ||
        currentUser?.role === UserRole.HEAD_COACH ||
        currentUser?.role === UserRole.ADMIN;

    const renderContent = () => {
        if (loading && cases.length === 0) return <div className="p-10 text-center text-slate-500">Cargando casos...</div>;

        switch (activeTab) {
            case 'dashboard':
                return <Dashboard
                    cases={cases}
                    onNewCase={() => setActiveTab('new-case')}
                    canCreate={canCreate}
                    onViewCase={(id) => {
                        const c = cases.find(item => item.id === id);
                        setSelectedCaseId(id);
                        if (c?.aiOutput) setActiveTab('briefing');
                        else setActiveTab('analyze');
                    }}
                />;
            case 'new-case':
                if (!canCreate) return <div className="p-10 text-center">Permiso denegado</div>;
                return <NewCase
                    onAddCase={addCase}
                    initialName={clientName}
                />;
            case 'analyze':
                const caseToAnalyze = cases.find(c => c.id === selectedCaseId);
                if (!caseToAnalyze) return <Dashboard cases={cases} onNewCase={() => setActiveTab('new-case')} onViewCase={setSelectedCaseId} canCreate={canCreate} />;
                return <Analyze
                    successCase={caseToAnalyze}
                    onAnalysisComplete={(output) => {
                        updateCase({ ...caseToAnalyze, aiOutput: output, status: CaseStatus.READY });
                        setActiveTab('briefing');
                    }}
                />;
            case 'briefing':
                const caseForBriefing = cases.find(c => c.id === selectedCaseId);
                if (!caseForBriefing || !caseForBriefing.aiOutput) return <Dashboard cases={cases} onNewCase={() => setActiveTab('new-case')} onViewCase={setSelectedCaseId} canCreate={canCreate} />;
                return <Briefing successCase={caseForBriefing} />;
            case 'pricing':
                return (
                    <div className="p-8 max-w-4xl mx-auto text-center mt-20">
                        <h2 className="text-4xl font-bold mb-4 text-slate-800">Suscripción Premium</h2>
                        <p className="text-slate-500">
                            Esta funcionalidad está incluida en tu paquete CRM de Padron Trainer.
                        </p>
                    </div>
                );
            default:
                return <Dashboard cases={cases} onNewCase={() => setActiveTab('new-case')} onViewCase={setSelectedCaseId} canCreate={canCreate} />;
        }
    };

    return (
        <div className="flex bg-slate-50 min-h-full h-full">
            <div className="border-r border-slate-200 bg-white">
                <Sidebar activeTab={activeTab} onTabChange={setActiveTab} currentUser={currentUser} />
            </div>
            <main className="flex-1 overflow-y-auto">
                <div className="p-6">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default StorytellerModule;
