import imageCompression from 'browser-image-compression';

export async function compressReceiptImage(file: File): Promise<File> {
    // PDFs y archivos que no son imagen pasan sin comprimir
    if (!file.type.startsWith('image/')) return file;
    // Archivos menores a 1MB no necesitan compresión
    if (file.size <= 1 * 1024 * 1024) return file;

    const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
    };

    try {
        const compressedBlob = await imageCompression(file, options);
        return new File([compressedBlob], file.name, { type: file.type });
    } catch (error) {
        console.error('Error compressing receipt image:', error);
        // Si falla la compresión, devolver el archivo original
        return file;
    }
}

export async function compressTeamPhoto(file: File): Promise<File> {
    // 1. Basic Validation
    if (!file.type.startsWith('image/')) {
        throw new Error('El archivo seleccionado no es una imagen válida.');
    }

    // Max 10MB before compression
    if (file.size > 10 * 1024 * 1024) {
        throw new Error('La imagen es demasiado grande. Por favor, selecciona una de menos de 10MB.');
    }

    const options = {
        maxSizeMB: 0.5,           // 500 KB max
        maxWidthOrHeight: 1200,   // Reasonable resolution for profile photos
        useWebWorker: true,
        fileType: 'image/webp'    // Convert to WebP for better compression
    };

    try {
        const compressedBlob = await imageCompression(file, options);
        // Convert Blob back to File to maintain filename (but with .webp extension)
        const name = file.name.split('.')[0] + '.webp';
        return new File([compressedBlob], name, { type: 'image/webp' });
    } catch (error) {
        console.error('Error compressing image:', error);
        throw error; // Rethrow to let the UI handle the error
    }
}
