/**
 * Formatting Helper Functions
 * Centralized data formatting utilities
 */

/**
 * Format number with Spanish locale
 */
export const formatNumber = (value: number | undefined, decimals: number = 0): string => {
    if (value === undefined || value === null) return '-';

    return new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
};

/**
 * Format currency (EUR)
 */
export const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || value === null) return '-';

    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(value);
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number | undefined, decimals: number = 0): string => {
    if (value === undefined || value === null) return '-';

    return `${formatNumber(value, decimals)}%`;
};

/**
 * Format weight (kg)
 */
export const formatWeight = (value: number | undefined): string => {
    if (value === undefined || value === null) return '-';

    return `${formatNumber(value, 1)} kg`;
};

/**
 * Format height (cm)
 */
export const formatHeight = (value: number | undefined): string => {
    if (value === undefined || value === null) return '-';

    return `${formatNumber(value, 0)} cm`;
};

/**
 * Format phone number
 */
export const formatPhone = (phone: string | undefined): string => {
    if (!phone) return '-';

    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');

    // Format as Spanish phone number (XXX XXX XXX)
    if (cleaned.length === 9) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }

    return phone;
};

/**
 * Format email (truncate if too long)
 */
export const formatEmail = (email: string | undefined, maxLength: number = 30): string => {
    if (!email) return '-';

    if (email.length <= maxLength) return email;

    return `${email.slice(0, maxLength - 3)}...`;
};

/**
 * Truncate text with ellipsis
 */
export const truncate = (text: string | undefined, maxLength: number = 50): string => {
    if (!text) return '-';

    if (text.length <= maxLength) return text;

    return `${text.slice(0, maxLength - 3)}...`;
};

/**
 * Capitalize first letter
 */
export const capitalize = (text: string | undefined): string => {
    if (!text) return '';

    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Get initials from name
 */
export const getInitials = (name: string | undefined): string => {
    if (!name) return '??';

    const parts = name.trim().split(' ');

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/**
 * Format duration in months to readable string
 */
export const formatDuration = (months: number | undefined): string => {
    if (!months) return '-';

    if (months === 1) return '1 mes';
    if (months < 12) return `${months} meses`;

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (remainingMonths === 0) {
        return years === 1 ? '1 año' : `${years} años`;
    }

    return `${years} año${years > 1 ? 's' : ''} y ${remainingMonths} mes${remainingMonths > 1 ? 'es' : ''}`;
};

/**
 * Format BMI (Body Mass Index)
 */
export const formatBMI = (weight: number | undefined, height: number | undefined): string => {
    if (!weight || !height) return '-';

    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);

    return formatNumber(bmi, 1);
};

/**
 * Get BMI category
 */
export const getBMICategory = (weight: number | undefined, height: number | undefined): string => {
    if (!weight || !height) return '-';

    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);

    if (bmi < 18.5) return 'Bajo peso';
    if (bmi < 25) return 'Peso normal';
    if (bmi < 30) return 'Sobrepeso';
    if (bmi < 35) return 'Obesidad I';
    if (bmi < 40) return 'Obesidad II';
    return 'Obesidad III';
};
