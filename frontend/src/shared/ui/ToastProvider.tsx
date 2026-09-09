import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import './Toast.css';

type ToastType = 'info' | 'error';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
    isHiding: boolean;
}

interface ToastApi {
    showInfo: (message: string, durationMs?: number) => void;
    showError: (message: string, durationMs?: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DEFAULT_DURATION_MS = 3000;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const nextIdRef = useRef(0);
    const timersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());

    // Сначала помечаем тост скрывающимся, чтобы отработала анимация ухода,
    // и удаляем его уже по её окончании.
    const hide = useCallback((id: number) => {
        const timer = timersRef.current.get(id);
        if (timer !== undefined) {
            clearTimeout(timer);
            timersRef.current.delete(id);
        }
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, isHiding: true } : t)));
    }, []);

    const remove = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const show = useCallback((message: string, type: ToastType, durationMs: number) => {
        const id = nextIdRef.current++;
        setToasts((prev) => [...prev, { id, message, type, isHiding: false }]);
        timersRef.current.set(id, setTimeout(() => hide(id), durationMs));
    }, [hide]);

    const api = useMemo<ToastApi>(() => ({
        showInfo: (message, durationMs = DEFAULT_DURATION_MS) => show(message, 'info', durationMs),
        showError: (message, durationMs = DEFAULT_DURATION_MS) => show(message, 'error', durationMs),
    }), [show]);

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div id="toast_container">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`toast${toast.type === 'error' ? ' error' : ''}${toast.isHiding ? ' hiding' : ''}`}
                        onClick={() => hide(toast.id)}
                        onAnimationEnd={() => {
                            if (toast.isHiding) remove(toast.id);
                        }}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastApi {
    const api = useContext(ToastContext);
    if (!api) {
        throw new Error('useToast используется вне ToastProvider');
    }
    return api;
}
