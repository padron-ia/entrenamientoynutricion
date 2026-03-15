import { User, UserRole } from "../types";
import { normalizeRole } from "./roleUtils";

// ==========================================
// 🔐 SISTEMA DE PERMISOS (PERMISSIONS SYSTEM)
// ==========================================

// Definición de Permisos Disponibles
export const PERMISSIONS = {
    VIEW_FINANCE: 'access:accounting',   // Ver panel contable y facturas
    VIEW_SALES: 'access:sales',          // Ver panel de closers y nuevas ventas
    VIEW_CLIENTS: 'access:clients',      // Ver lista de clientes (más allá de los propios)
    VIEW_RENEWALS: 'access:renewals',    // Ver gestión de renovaciones
    VIEW_MEDICAL: 'access:medical',      // Ver datos médicos sensibles
    MANAGE_MEDICAL: 'manage:medical',    // Editar revisiones y responder como doctor
    MANAGE_TEAM: 'manage:team',          // Invitar usuarios y ver directorio
    MANAGE_SETTINGS: 'access:settings',  // Ver configuración global
    VIEW_CLASSES: 'view:classes',        // Ver y gestionar clases
    ASSIGN_COACH: 'manage:assignments',  // Reasignar clientes
    ACCESS_NUTRITION: 'access:nutrition', // Gestionar planes nutricionales
};

// Permisos implícitos por Rol (Default / Fallback)
// Estos se usan como base si la base de datos no tiene configuración
let ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    [UserRole.ADMIN]: Object.values(PERMISSIONS), // Admin tiene TODO
    [UserRole.HEAD_COACH]: [
        PERMISSIONS.VIEW_CLIENTS,
        PERMISSIONS.VIEW_RENEWALS,
        PERMISSIONS.VIEW_CLASSES,
        PERMISSIONS.VIEW_MEDICAL,
        PERMISSIONS.MANAGE_MEDICAL,
        PERMISSIONS.MANAGE_TEAM,
        PERMISSIONS.VIEW_SALES,
        PERMISSIONS.MANAGE_SETTINGS,
        PERMISSIONS.ASSIGN_COACH,
        PERMISSIONS.ACCESS_NUTRITION
    ],
    [UserRole.COACH]: [
        PERMISSIONS.VIEW_CLASSES,
        PERMISSIONS.VIEW_MEDICAL,
        PERMISSIONS.MANAGE_MEDICAL,
        PERMISSIONS.VIEW_RENEWALS,
        PERMISSIONS.ACCESS_NUTRITION
    ],
    [UserRole.CLOSER]: [
        PERMISSIONS.VIEW_SALES,
        PERMISSIONS.VIEW_CLIENTS
    ],
    [UserRole.SETTER]: [
        PERMISSIONS.VIEW_SALES
    ],
    [UserRole.CONTABILIDAD]: [
        PERMISSIONS.VIEW_FINANCE
    ],
    [UserRole.RRSS]: [
        PERMISSIONS.VIEW_CLASSES
    ],
    [UserRole.DIRECCION]: [
        PERMISSIONS.VIEW_CLIENTS,
        PERMISSIONS.VIEW_RENEWALS,
        PERMISSIONS.VIEW_SALES,
        PERMISSIONS.VIEW_FINANCE,
        PERMISSIONS.MANAGE_TEAM
    ],
    [UserRole.CLIENT]: []
};

/**
 * Permite actualizar la matriz de permisos en tiempo de ejecución
 * (Usado por el App.tsx tras cargar de Supabase)
 */
export const syncRolePermissions = (newMatrix: Record<string, string[]>) => {
    const updated = { ...ROLE_PERMISSIONS };
    Object.entries(newMatrix).forEach(([role, perms]) => {
        const roleKey = Object.values(UserRole).find(r => r === role) as UserRole;
        if (roleKey) {
            const defaults = ROLE_PERMISSIONS[roleKey] || [];
            updated[roleKey] = [...new Set([...defaults, ...perms])];
        }
    });
    ROLE_PERMISSIONS = updated;
};

/**
 * Verifica si un usuario tiene un permiso específico.
 * 1. Revisa si es ADMIN (siempre true).
 * 2. Revisa sus permisos explícitos en DB (user.permissions).
 * 3. Revisa los permisos implícitos de su rol.
 */
export const checkPermission = (user: User, permission: string): boolean => {
    if (!user) return false;

    const roleLower = normalizeRole(user.role);
    if (roleLower === 'admin' || roleLower === UserRole.ADMIN) return true;

    // 1. Permisos Explícitos (DB overrides)
    if (user.permissions && user.permissions.includes(permission)) {
        return true;
    }

    // 2. Permisos Implícitos del Rol
    // We try to find the role in ROLE_PERMISSIONS by normalizing the keys
    const roleKey = Object.keys(ROLE_PERMISSIONS).find(k => k.toLowerCase() === roleLower) as UserRole;
    const rolePerms = roleKey ? ROLE_PERMISSIONS[roleKey] : [];

    if (rolePerms.includes(permission)) {
        return true;
    }

    return false;
};

/**
 * Verifica si un usuario tiene AL MENOS UNO de los permisos listados
 */
export const checkAnyPermission = (user: User, permissions: string[]): boolean => {
    return permissions.some(p => checkPermission(user, p));
};
