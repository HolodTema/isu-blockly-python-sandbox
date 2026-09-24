import { useCallback, useRef, useState } from 'react';

const AUTOSAVE_STORAGE_KEY = 'codeCheff.autosave.blocklyState';
const AUTOSAVE_DEBOUNCE_MS = 500;

export function useAutosave() {
    const [initialState] = useState<Record<string, unknown> | null>(() => {
        const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as Record<string, unknown>;
        } catch {
            return null;
        }
    });

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const saveState = useCallback((state: object) => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(state));
        }, AUTOSAVE_DEBOUNCE_MS);
    }, []);

    return { initialState, saveState };
}
