/**
 * Toast Notification System
 * Lightweight toast notifications without external dependencies
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastContextType {
    toasts: Toast[];
    showToast: (type: ToastType, message: string, duration?: number) => void;
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number, action?: { label: string, onClick: () => void }) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    // Return the context but ALSO add a 'toast' property for components using destructuring { toast }
    return {
        ...context,
        toast: context
    };
};

interface ToastProviderProps {
    children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const showToast = useCallback((type: ToastType, message: string, duration: number = 4000, action?: { label: string, onClick: () => void }) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        const toast: Toast = { id, type, message, duration, action };

        setToasts(prev => [...prev, toast]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    const success = useCallback((message: string, duration?: number) => {
        showToast('success', message, duration);
    }, [showToast]);

    const error = useCallback((message: string, duration?: number) => {
        showToast('error', message, duration);
    }, [showToast]);

    const warning = useCallback((message: string, duration?: number) => {
        showToast('warning', message, duration);
    }, [showToast]);

    const info = useCallback((message: string, duration?: number, action?: { label: string, onClick: () => void }) => {
        showToast('info', message, duration, action);
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ toasts, showToast, success, error, warning, info, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
};

interface ToastContainerProps {
    toasts: Toast[];
    onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
};

interface ToastItemProps {
    toast: Toast;
    onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
    const config = {
        success: {
            icon: CheckCircle2,
            bgColor: 'bg-green-50',
            borderColor: 'border-green-500',
            textColor: 'text-green-800',
            iconColor: 'text-green-500'
        },
        error: {
            icon: XCircle,
            bgColor: 'bg-red-50',
            borderColor: 'border-red-500',
            textColor: 'text-red-800',
            iconColor: 'text-red-500'
        },
        warning: {
            icon: AlertCircle,
            bgColor: 'bg-amber-50',
            borderColor: 'border-amber-500',
            textColor: 'text-amber-800',
            iconColor: 'text-amber-500'
        },
        info: {
            icon: Info,
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-500',
            textColor: 'text-blue-800',
            iconColor: 'text-blue-500'
        }
    };

    const { icon: Icon, bgColor, borderColor, textColor, iconColor } = config[toast.type];

    return (
        <div
            className={`
        ${bgColor} ${borderColor} ${textColor}
        border-l-4 rounded-lg shadow-lg p-4 pr-12
        min-w-[320px] max-w-md
        pointer-events-auto
        animate-in slide-in-from-right-full duration-300
        backdrop-blur-sm bg-opacity-95
      `}
        >
            <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                    <p className="text-sm font-medium leading-relaxed">
                        {toast.message}
                    </p>
                    {toast.action && (
                        <button
                            onClick={() => {
                                toast.action?.onClick();
                                onRemove(toast.id);
                            }}
                            className="mt-2 text-xs font-black uppercase tracking-widest hover:underline"
                        >
                            {toast.action.label}
                        </button>
                    )}
                </div>
                <button
                    onClick={() => onRemove(toast.id)}
                    className={`${textColor} hover:opacity-70 transition-opacity flex-shrink-0`}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
