
/**
 * Normaliza un número de teléfono asegurando que comience con '+'
 * y eliminando caracteres no deseados exceptuando números y el '+' inicial.
 */
export const normalizePhone = (value: string): string => {
    let cleaned = value.trim();
    if (!cleaned) return '';

    // Si no empieza con +, lo añadimos (solo si tiene contenido)
    if (!cleaned.startsWith('+')) {
        // Si el usuario escribió un número de España sin prefijo, podríamos asumir +34, 
        // pero es mejor obligar al usuario a ponerlo para ser internacional.
        // Por ahora solo aseguramos el +
        cleaned = '+' + cleaned;
    }

    // Mantener el '+' inicial y solo números después
    const prefix = cleaned.startsWith('+') ? '+' : '';
    const numbers = cleaned.replace(/\D/g, '');

    return prefix + numbers;
};

/**
 * Valida si un teléfono tiene un formato internacional básico: + seguido de al menos 7 dígitos
 */
export const isValidPhone = (value: string): boolean => {
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    // Quitamos espacios para la validación
    const cleanValue = value.replace(/\s/g, '');
    return phoneRegex.test(cleanValue);
};

export const PHONE_HELP_TEXT = "Debe incluir el prefijo del país (ej: +34 para España)";
export const PHONE_PLACEHOLDER = "+34 600 000 000";
