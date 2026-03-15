import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import { ShieldAlert, X } from 'lucide-react';
import { UserRole } from '../../types';

interface SecurityMigrationBannerProps {
    clientId: string;
}

export const SecurityMigrationBanner: React.FC<SecurityMigrationBannerProps> = ({ clientId }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSecurityStatus = async () => {
            if (!clientId) return;

            try {
                // Check if a user with this ID exists in the public.users table (synced with Auth)
                const { data, error } = await supabase
                    .from('users')
                    .select('id')
                    .eq('id', clientId)
                    .single();

                // If check fails (no row found), it means they don't have a secure User entry
                if (error || !data) {
                    setIsVisible(true);
                }
            } catch (err) {
                // If error, assume legacy to be safe? Or hide?
            } finally {
                setLoading(false);
            }
        };

        checkSecurityStatus();
    }, [clientId]);

    if (loading || !isVisible) return null;

    return (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg shadow-sm animate-in slide-in-from-top-2">
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <ShieldAlert className="h-5 w-5 text-amber-500" aria-hidden="true" />
                </div>
                <div className="ml-3 flex-1 md:flex md:justify-between">
                    <p className="text-sm text-amber-800">
                        <span className="font-bold">Mejora tu seguridad:</span> Estás accediendo con el método antiguo (Teléfono).
                        Por favor, contacta con tu coach para configurar un acceso seguro con Email y Contraseña.
                    </p>
                    <p className="mt-3 text-sm md:mt-0 md:ml-6">
                        <button
                            onClick={() => setIsVisible(false)}
                            className="whitespace-nowrap font-medium text-amber-800 hover:text-amber-900"
                        >
                            Ocultar aviso <span aria-hidden="true">&rarr;</span>
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};
