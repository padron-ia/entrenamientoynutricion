/**
 * Status Helper Functions
 * Centralized status configuration and utilities
 */

import { ClientStatus } from '../types';
import {
    CheckCircle2,
    XCircle,
    Pause,
    AlertOctagon,
    Trophy
} from 'lucide-react';

export interface StatusConfig {
    color: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    label: string;
    icon: any;
    description: string;
}

/**
 * Get complete status configuration
 */
export const getStatusConfig = (status: ClientStatus): StatusConfig => {
    const configs: Record<ClientStatus, StatusConfig> = {
        [ClientStatus.ACTIVE]: {
            color: 'green',
            bgColor: 'bg-green-50',
            textColor: 'text-green-700',
            borderColor: 'border-green-200',
            label: 'Activo',
            icon: CheckCircle2,
            description: 'Cliente activo en programa'
        },
        [ClientStatus.INACTIVE]: {
            color: 'slate',
            bgColor: 'bg-slate-50',
            textColor: 'text-slate-700',
            borderColor: 'border-slate-200',
            label: 'Baja',
            icon: XCircle,
            description: 'Baja normal del servicio'
        },
        [ClientStatus.PAUSED]: {
            color: 'amber',
            bgColor: 'bg-amber-50',
            textColor: 'text-amber-700',
            borderColor: 'border-amber-200',
            label: 'Pausado',
            icon: Pause,
            description: 'Programa temporalmente pausado'
        },
        [ClientStatus.DROPOUT]: {
            color: 'red',
            bgColor: 'bg-red-50',
            textColor: 'text-red-700',
            borderColor: 'border-red-200',
            label: 'Abandono',
            icon: AlertOctagon,
            description: 'Abandono prematuro del programa'
        },
        [ClientStatus.COMPLETED]: {
            color: 'purple',
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-700',
            borderColor: 'border-purple-200',
            label: 'Completado',
            icon: Trophy,
            description: 'Programa completado exitosamente'
        }
    };

    return configs[status];
};

/**
 * Get status color class (legacy support)
 */
export const getStatusColor = (status: ClientStatus): string => {
    return getStatusConfig(status).color;
};

/**
 * Get status label (legacy support)
 */
export const getStatusLabel = (status: ClientStatus): string => {
    return getStatusConfig(status).label;
};

/**
 * Get all available statuses
 */
export const getAllStatuses = (): ClientStatus[] => {
    return Object.values(ClientStatus);
};

/**
 * Check if status is active
 */
export const isActiveStatus = (status: ClientStatus): boolean => {
    return status === ClientStatus.ACTIVE;
};

/**
 * Check if status represents a departure
 */
export const isDepartureStatus = (status: ClientStatus): boolean => {
    return status === ClientStatus.INACTIVE || status === ClientStatus.DROPOUT;
};
