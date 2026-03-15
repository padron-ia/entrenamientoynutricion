import React, { useState } from 'react';
import { X, Copy, CheckCircle2, Link2, Mail } from 'lucide-react';

interface InvitationLinkModalProps {
    clientName: string;
    invitationLink: string;
    onClose: () => void;
}

export function InvitationLinkModal({ clientName, invitationLink, onClose }: InvitationLinkModalProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(invitationLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Error copying to clipboard:', err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <Link2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Link de Invitacion</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                        <p className="text-sm text-emerald-800">
                            Se ha generado un enlace de activacion para <strong>{clientName}</strong>.
                            Enviale este enlace para que pueda crear su contrasena y acceder al portal.
                        </p>
                    </div>

                    {/* Link Display */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Enlace de activacion
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={invitationLink}
                                readOnly
                                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 font-mono"
                            />
                            <button
                                onClick={handleCopy}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${copied
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-gray-900 text-white hover:bg-gray-800'
                                    }`}
                            >
                                {copied ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        Copiado
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" />
                                        Copiar
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            Instrucciones
                        </h4>
                        <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                            <li>Copia el enlace usando el boton de arriba</li>
                            <li>Envia el enlace al cliente por email o WhatsApp</li>
                            <li>El cliente creara su contrasena y podra acceder al portal</li>
                        </ol>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
