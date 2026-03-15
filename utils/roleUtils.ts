/**
 * Normaliza el rol del usuario para comparaciones consistentes.
 * Elimina acentos, espacios y convierte a minúsculas.
 * Ejemplo: 'Dirección' -> 'direccion'
 */
export const normalizeRole = (role: string | null | undefined): string => {
    if (!role) return '';
    return role
        .toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Elimina acentos
        .replace(/\s+/g, '_');          // Espacios por guiones bajos
};
