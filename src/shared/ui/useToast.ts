import { useContext } from 'react';
import { ToastContext } from './ToastContext';
import type { ToastApi } from './ToastContext';

/**
 * Returns toast API for showing info and error messages. Part of React ContextAPI
 *
 * Should be called only inside {@link ToastProvider}. If context is missing,
 * throws error — this is intentional, because missing provider is a bug, not
 * a valid fallback state.
 *
 * @returns
 * - `showInfo(message, durationMs?)` — shows neutral toast. Default duration
 *   is 3000 ms.
 * - `showError(message, durationMs?)` — shows red toast. Default duration
 *   is 3000 ms.
 */
export function useToast(): ToastApi {
    const api = useContext(ToastContext);
    if (!api) {
        throw new Error('useToast is used outside ToastProvider');
    }
    return api;
}
