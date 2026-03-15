import React from 'react';
import { CheckCircle2, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../../../components/ToastProvider';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    paymentFile: File | null;
    setPaymentFile: (f: File | null) => void;
    isUploadingPayment: boolean;
    handlePaymentUpload: (e: React.FormEvent) => void;
}

export function PaymentModal({ isOpen, onClose, paymentFile, setPaymentFile, isUploadingPayment, handlePaymentUpload }: PaymentModalProps) {
    const toast = useToast();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-surface-overlay backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-premium scale-100 animate-in zoom-in-95 duration-200">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-sea-50 text-sea-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <ImageIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-sea-900">Subir Comprobante</h3>
                    <p className="text-sea-400 text-sm mt-2">Sube una captura de pantalla o foto del recibo de pago para que tu coach pueda validarlo.</p>
                </div>

                <form onSubmit={handlePaymentUpload}>
                    <div className="mb-6">
                        <label
                            htmlFor="receipt-upload"
                            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${paymentFile ? 'border-accent-500 bg-accent-50' : 'border-sea-200 hover:border-accent-300 hover:bg-sea-50'}`}
                        >
                            {paymentFile ? (
                                <>
                                    <CheckCircle2 className="w-10 h-10 text-accent-600 mb-2" />
                                    <p className="font-bold text-accent-800 text-sm">{paymentFile.name}</p>
                                    <p className="text-accent-500 text-xs mt-1">Click para cambiar</p>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-10 h-10 text-sea-300 mb-2" />
                                    <p className="font-bold text-sea-600 text-sm">Click para seleccionar</p>
                                    <p className="text-sea-400 text-xs mt-1">JPG, PNG, PDF</p>
                                </>
                            )}
                            <input
                                type="file"
                                id="receipt-upload"
                                className="hidden"
                                accept="image/*,application/pdf"
                                capture="environment"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    if (file.size > 10 * 1024 * 1024) {
                                        toast.error('El archivo es demasiado grande. Máximo 10MB.');
                                        e.target.value = '';
                                        return;
                                    }
                                    setPaymentFile(file);
                                }}
                            />
                        </label>
                    </div>

                    <div className="space-y-3">
                        <button
                            type="submit"
                            disabled={!paymentFile || isUploadingPayment}
                            className="w-full py-4 bg-sea-700 text-white font-bold rounded-2xl hover:bg-sea-800 shadow-lg shadow-sea-200 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {isUploadingPayment ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Subiendo...</>
                            ) : (
                                'Enviar Comprobante'
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-4 text-sea-400 font-bold hover:bg-sea-50 rounded-2xl transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
