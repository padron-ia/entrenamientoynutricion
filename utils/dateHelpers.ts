/**
 * Date Helper Functions
 * Centralized date formatting and manipulation utilities
 */

/**
 * Format date to Spanish locale
 */
export const formatDate = (date: string | Date | undefined, options?: Intl.DateTimeFormatOptions): string => {
    if (!date) return '-';

    const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        ...options
    };

    try {
        return new Date(date).toLocaleDateString('es-ES', defaultOptions);
    } catch {
        return '-';
    }
};

/**
 * Format date to long format (e.g., "12 de diciembre de 2025")
 */
export const formatDateLong = (date: string | Date | undefined): string => {
    return formatDate(date, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};

/**
 * Format time to Spanish locale
 */
export const formatTime = (date: string | Date | undefined): string => {
    if (!date) return '-';

    try {
        return new Date(date).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return '-';
    }
};

/**
 * Check if a date is expired (before today)
 */
export const isExpired = (date: string | Date | undefined): boolean => {
    if (!date) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    return checkDate < today;
};

/**
 * Check if a date is in the current month
 */
export const isCurrentMonth = (date: string | Date | undefined): boolean => {
    if (!date) return false;

    const now = new Date();
    const checkDate = new Date(date);

    return checkDate.getMonth() === now.getMonth() &&
        checkDate.getFullYear() === now.getFullYear();
};

/**
 * Get days remaining until a date
 */
export const getDaysRemaining = (date: string | Date | undefined): number => {
    if (!date) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Get relative time string (e.g., "hace 2 días", "en 3 días")
 */
export const getRelativeTime = (date: string | Date | undefined): string => {
    if (!date) return '-';

    const days = getDaysRemaining(date);

    if (days === 0) return 'Hoy';
    if (days === 1) return 'Mañana';
    if (days === -1) return 'Ayer';
    if (days > 0) return `En ${days} días`;
    return `Hace ${Math.abs(days)} días`;
};

/**
 * Get date range for current month
 */
export const getCurrentMonthRange = (): { start: Date; end: Date } => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return { start, end };
};

/**
 * Convert date to ISO string (YYYY-MM-DD)
 */
export const toISODateString = (date: Date | string | undefined): string => {
    if (!date) return '';

    try {
        return new Date(date).toISOString().split('T')[0];
    } catch {
        return '';
    }
};
