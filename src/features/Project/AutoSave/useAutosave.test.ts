import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutosave } from './useAutosave';

const STORAGE_KEY = 'codeCheff.autosave.blocklyState';

describe('useAutosave', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns null as initialState when localStorage is empty', () => {
        const { result } = renderHook(() => useAutosave());

        expect(result.current.initialState).toBeNull();
    });

    it('returns parsed state as initialState when localStorage has valid saved data', () => {
        const saved = { blocks: { blocks: [{ type: 'start_block' }] } };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

        const { result } = renderHook(() => useAutosave());

        expect(result.current.initialState).toEqual(saved);
    });

    it('returns null as initialState when localStorage has corrupted JSON', () => {
        localStorage.setItem(STORAGE_KEY, 'не json{');

        const { result } = renderHook(() => useAutosave());

        expect(result.current.initialState).toBeNull();
    });

    it('does not write to localStorage immediately after saveState is called', () => {
        const { result } = renderHook(() => useAutosave());

        act(() => {
            result.current.saveState({ foo: 'bar' });
        });

        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('writes state to localStorage after debounce delay passes', () => {
        const { result } = renderHook(() => useAutosave());
        const state = { foo: 'bar' };

        act(() => {
            result.current.saveState(state);
        });
        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(state));
    });

    it('keeps only the latest state when saveState is called multiple times before debounce fires', () => {
        const { result } = renderHook(() => useAutosave());

        act(() => {
            result.current.saveState({ value: 'a' });
        });
        act(() => {
            vi.advanceTimersByTime(200);
        });
        act(() => {
            result.current.saveState({ value: 'b' });
        });
        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify({ value: 'b' }));
    });
});