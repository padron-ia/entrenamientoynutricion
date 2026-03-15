import React from 'react';
import {
    Stethoscope, CreditCard, ExternalLink, Upload, ChevronRight, CheckCircle2,
    FileText, Award, Video
} from 'lucide-react';
import { Client } from '../../../types';
import { SecurityMigrationBanner } from '../SecurityMigrationBanner';

interface BannersSectionProps {
    client: Client;
    hasMigratedSecurity: boolean;
    handleSecurityMigration: (email: string, pass: string) => Promise<void>;
    onStartAnamnesis?: () => void;
    setActiveView: (view: string) => void;
    setIsPaymentModalOpen: (open: boolean) => void;
    shouldShowCheckinReminder: boolean;
    unreadReportsCount: number;
    unreadReviewsCount: number;
    unreadMedicalReviewsCount: number;
    unreadCoachReviewsCount: number;
}

export function BannersSection({
    client,
    hasMigratedSecurity,
    handleSecurityMigration,
    onStartAnamnesis,
    setActiveView,
    setIsPaymentModalOpen,
    shouldShowCheckinReminder,
    unreadReportsCount,
    unreadReviewsCount,
    unreadMedicalReviewsCount,
    unreadCoachReviewsCount,
}: BannersSectionProps) {
    // If there's nothing to show, don't render the wrapper to avoid empty space
    const hasAnyBanner =
        !hasMigratedSecurity ||
        !client.onboarding_phase2_completed ||
        (client.renewal_payment_link && client.renewal_payment_status === 'pending') ||
        (client.renewal_payment_status === 'uploaded' || (client as any).renewal_payment_status === 'uploaded') ||
        (client.program?.contract_visible_to_client && !client.program?.contract_signed) ||
        shouldShowCheckinReminder ||
        (unreadReportsCount > 0 || unreadReviewsCount > 0) ||
        (client.renewal_payment_status === 'verified' && (() => {
            if (!client.renewal_verified_at) return true;
            const verifiedDate = new Date(client.renewal_verified_at);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - verifiedDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 7;
        })());

    if (!hasAnyBanner) return null;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 flex flex-col gap-4">
            {/* Security Migration */}
            {!hasMigratedSecurity && (
                <SecurityMigrationBanner clientName={client.firstName} onMigrate={handleSecurityMigration} />
            )}

            {/* Anamnesis Banner */}
            {!client.onboarding_phase2_completed && (
                <div className="bg-gradient-to-r from-sea-700 to-sea-500 rounded-3xl p-6 text-white shadow-xl shadow-sea-200 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shrink-0">
                            <Stethoscope className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Completa tu anamnesis médica</h3>
                            <p className="text-sea-100 text-sm mt-1">
                                Necesitamos más información sobre tu historial médico para que tu coach y nuestros endocrinos puedan personalizar tu tratamiento.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => onStartAnamnesis?.()}
                        className="bg-white text-sea-700 hover:bg-sea-50 px-6 py-3 rounded-xl font-bold text-sm transition-colors shrink-0 flex items-center justify-center gap-2 w-full md:w-auto"
                    >
                        Completar ahora <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Renewal Payment Banner */}
            {client.renewal_payment_link && client.renewal_payment_status === 'pending' && (
                <div className="rounded-3xl p-6 text-white shadow-xl shadow-sea-200 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden animate-in slide-in-from-top-4" style={{ background: 'var(--gradient-primary)' }}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shrink-0">
                            <CreditCard className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                Renovación Disponible <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-normal">Pendiente de Pago</span>
                            </h2>
                            <p className="text-sea-100 text-sm max-w-xl leading-relaxed mt-1">
                                Tu plan para la fase <strong>{client.renewal_phase || 'siguiente'}</strong> está listo.
                                Realiza el pago para asegurar tu plaza y continuar tu progreso sin interrupciones.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto relative z-10 shrink-0">
                        <a
                            href={client.renewal_payment_link}
                            target="_blank"
                            rel="noreferrer"
                            className="px-6 py-3 bg-white text-sea-700 font-bold rounded-xl shadow-lg hover:bg-sea-50 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            Pagar Ahora <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl border border-white/20 hover:bg-white/20 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            <Upload className="w-4 h-4" /> Subir Comprobante
                        </button>
                    </div>
                </div>
            )}

            {/* Pending Verification Banner */}
            {(client.renewal_payment_status === 'uploaded' || (client as any).renewal_payment_status === 'uploaded') && (
                <div className="bg-accent-50 border border-accent-100 rounded-3xl p-4 flex items-center gap-4 animate-in fade-in">
                    <div className="bg-accent-100 p-2 rounded-full text-accent-600 shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-bold text-accent-900 text-sm">Comprobante enviado</p>
                        <p className="text-accent-700 text-xs">Tu coach revisará el pago en breve y activará tu nueva fase.</p>
                    </div>
                </div>
            )}

            {/* Pending Contract Signature Banner */}
            {client.program?.contract_visible_to_client && !client.program?.contract_signed && (
                <div
                    onClick={() => setActiveView('contract')}
                    className="rounded-3xl p-5 text-white shadow-xl shadow-sea-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:shadow-2xl hover:scale-[1.01] transition-all animate-in slide-in-from-top-4"
                    style={{ background: 'var(--gradient-accent)' }}
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shrink-0">
                            <FileText className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Contrato Pendiente de Firma</h2>
                            <p className="text-white/80 text-sm mt-1">Tu contrato está listo para ser revisado y firmado digitalmente.</p>
                        </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-white/60 shrink-0 hidden sm:block" />
                </div>
            )}

            {/* Weekly Check-in Reminder Banner */}
            {shouldShowCheckinReminder && (
                <div
                    onClick={() => setActiveView('checkin')}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-5 text-white shadow-xl shadow-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:shadow-2xl hover:scale-[1.01] transition-all animate-in slide-in-from-top-4"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shrink-0">
                            <CheckCircle2 className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                ¡Es hora de tu Check-in Semanal!
                            </h2>
                            <p className="text-amber-100 text-sm mt-0.5">
                                Cuéntale a tu coach cómo ha ido tu semana. Solo te llevará 2 minutos.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl font-bold text-sm shrink-0 w-full sm:w-auto justify-center">
                        Rellenar ahora <ChevronRight className="w-4 h-4" />
                    </div>
                </div>
            )}

            {/* New Medical Content Banner */}
            {(unreadReportsCount > 0 || unreadReviewsCount > 0) && (
                <div className={`rounded-3xl p-5 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-4
                    ${(unreadCoachReviewsCount > 0 && unreadReportsCount === 0 && unreadMedicalReviewsCount === 0)
                        ? 'shadow-sea-200'
                        : 'shadow-sea-200'}`}
                    style={{ background: 'var(--gradient-primary)' }}
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shrink-0">
                            {(unreadCoachReviewsCount > 0 && unreadReportsCount === 0 && unreadMedicalReviewsCount === 0)
                                ? <Video className="w-7 h-7 text-white" />
                                : <Stethoscope className="w-7 h-7 text-white" />
                            }
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">
                                {(unreadCoachReviewsCount > 0 && unreadReportsCount === 0 && unreadMedicalReviewsCount === 0)
                                    ? "Tienes novedades de tu Coach"
                                    : (unreadCoachReviewsCount === 0 && (unreadReportsCount > 0 || unreadMedicalReviewsCount > 0))
                                        ? "Tienes novedades del endocrino"
                                        : "Tienes nuevas actualizaciones"
                                }
                            </h2>
                            <p className="text-white/70 text-sm mt-0.5">
                                {[
                                    unreadReportsCount > 0 && `${unreadReportsCount} informe${unreadReportsCount > 1 ? 's' : ''} médico${unreadReportsCount > 1 ? 's' : ''}`,
                                    unreadMedicalReviewsCount > 0 && `${unreadMedicalReviewsCount} revisión${unreadMedicalReviewsCount > 1 ? 'es' : ''} médica${unreadMedicalReviewsCount > 1 ? 's' : ''}`,
                                    unreadCoachReviewsCount > 0 && `${unreadCoachReviewsCount} mensaje${unreadCoachReviewsCount > 1 ? 's' : ''} de tu coach`
                                ].filter(Boolean).join(' y ')}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
                        {unreadReviewsCount > 0 && (
                            <button
                                onClick={() => setActiveView('reviews')}
                                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                Ver Revisiones <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                        {unreadReportsCount > 0 && (
                            <button
                                onClick={() => setActiveView('reports')}
                                className="px-4 py-2 bg-white text-sea-700 font-bold rounded-xl text-sm hover:bg-sea-50 transition-colors flex items-center justify-center gap-2"
                            >
                                Ver Informes <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Renewal Success Banner (Show for 7 days) */}
            {client.renewal_payment_status === 'verified' && (() => {
                if (!client.renewal_verified_at) return true;
                const verifiedDate = new Date(client.renewal_verified_at);
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - verifiedDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 7;
            })() && (
                    <div className="rounded-3xl p-6 text-white shadow-xl shadow-accent-100 flex items-center justify-between gap-6 relative overflow-hidden animate-in zoom-in-95 duration-500" style={{ background: 'var(--gradient-accent)' }}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                        <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
                            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shrink-0">
                                <Award className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">¡Renovación Confirmada! 🚀</h2>
                                <p className="text-white/80 text-sm mt-1">
                                    Tu pago ha sido verificado con éxito. ¡Ya tienes acceso completo a tu nueva fase de programa!
                                </p>
                            </div>
                        </div>
                        <div className="shrink-0 hidden sm:block relative z-10">
                            <CheckCircle2 className="w-12 h-12 text-white/50" />
                        </div>
                    </div>
                )}
        </div>
    );
}
