import { createContext } from 'react';

export type ToastType = 'info' | 'error';

export interface ToastApi {
    showInfo: (message: string, durationMs?: number) => void;
    showError: (message: string, durationMs?: number) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);
