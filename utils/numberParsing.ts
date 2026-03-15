export const parseLocalizedNumber = (value: string): number | null => {
    if (!value) return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    const normalized = trimmed.replace(/\s/g, '');
    const hasComma = normalized.includes(',');
    const hasDot = normalized.includes('.');

    let canonical = normalized;

    if (hasComma && hasDot) {
        const lastComma = normalized.lastIndexOf(',');
        const lastDot = normalized.lastIndexOf('.');
        const decimalSeparator = lastComma > lastDot ? ',' : '.';
        const thousandSeparator = decimalSeparator === ',' ? /\./g : /,/g;
        canonical = normalized.replace(thousandSeparator, '');
        if (decimalSeparator === ',') {
            canonical = canonical.replace(',', '.');
        }
    } else if (hasComma) {
        if (/^\d{1,3}(,\d{3})+$/.test(normalized)) {
            canonical = normalized.replace(/,/g, '');
        } else {
            canonical = normalized.replace(',', '.');
        }
    } else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(normalized)) {
        canonical = normalized.replace(/\./g, '');
    }

    const cleaned = canonical.replace(/[^0-9.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
};

export const parseIntegerFromInput = (value: string): number | null => {
    const digitsOnly = value.replace(/\D/g, '');
    if (!digitsOnly) return null;
    const parsed = Number(digitsOnly);
    return Number.isFinite(parsed) ? Math.round(parsed) : null;
};

export const parseStepsFromInput = (value: string): number | null => {
    const parsed = parseIntegerFromInput(value);
    if (!parsed || parsed <= 0) return null;
    return parsed;
};
