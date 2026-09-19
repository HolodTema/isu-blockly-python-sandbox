import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadBlob } from "./download.ts";

describe('downloadBlob', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        URL.createObjectURL = vi.fn(() => 'blob:mocked-url');
        URL.revokeObjectURL = vi.fn();
    })

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('Creates BLOB-URL, clicks the link element and removes it', () => {
        const blob = new Blob(['hello'], { type: 'text/plain' });
        const clickSpy = vi
            .spyOn(HTMLAnchorElement.prototype, 'click')
            .mockImplementation(() => {});

        const appendChildSpy = vi.spyOn(document.body, 'appendChild');
        const removeChildSpy = vi.spyOn(document.body, 'removeChild');

        downloadBlob(blob, 'test.txt');

        expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
        expect(appendChildSpy).toHaveBeenCalledTimes(1);
        expect(clickSpy).toHaveBeenCalledTimes(1);
        expect(removeChildSpy).toHaveBeenCalledTimes(1);

        const link = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
        expect(link.href).toBe('blob:mocked-url');
        expect(link.download).toBe('test.txt');
    });

    it('Delays call of revokeObjectUrl() on 5 seconds timer', () => {
        const blob = new Blob(['hello'], { type: 'text/plain' });
        downloadBlob(blob, 'test.txt');
        expect(URL.revokeObjectURL).not.toHaveBeenCalled();
        vi.advanceTimersByTime(5000);
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mocked-url');
    });
});
