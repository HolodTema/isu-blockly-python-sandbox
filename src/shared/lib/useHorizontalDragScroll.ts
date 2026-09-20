import { useCallback, useEffect, useRef } from 'react';

/**
 * Adds drag-to-scroll behaviour for horizontal scrolling of element.
 *
 * Returns ref which should be attached to scrollable element, pointer down
 * handler for same element, and predicate which tells if last interaction
 * was a drag. Use this predicate inside onClick handlers to avoid action
 * after user just dragged the container.
 *
 * Only left mouse button starts the drag. Threshold of 3 pixels is used to
 * separate drag from click — if movement is smaller than 3 pixels, drag flag
 * stays false and click works as usual.
 *
 * @typeParam T - Type of scrollable element, for example `HTMLDivElement`.
 *
 * @returns
 * - `elementRef` — ref for scrollable element.
 * - `onPointerDown` — handler for same element.
 * - `wasDragged()` — returns `true` if last pointer sequence moved more than
 *   threshold; call it inside `onClick` to skip the click.
 *
 * @example
 * ```tsx
 * const { elementRef, onPointerDown, wasDragged } = useHorizontalDragScroll<HTMLDivElement>();
 * return (
 *   <div ref={elementRef} onPointerDown={onPointerDown}>
 *     <button onClick={() => { if (wasDragged()) return; handleClick(); }}>
 *       Item
 *     </button>
 *   </div>
 * );
 * ```
 */
export function useHorizontalDragScroll<T extends HTMLElement>() {
    const elementRef = useRef<T>(null);
    const dragParamsRef = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false });

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        if (e.button !== 0 || !elementRef.current) return;

        dragParamsRef.current = {
            active: true,
            startX: e.clientX,
            scrollLeft: elementRef.current.scrollLeft,
            moved: false,
        };
    }, []);

    useEffect(() => {
        const onMove = (e: PointerEvent) => {
            if (!dragParamsRef.current.active || !elementRef.current) return;

            const deltaX = e.clientX - dragParamsRef.current.startX;
            if (Math.abs(deltaX) > 3) {
                dragParamsRef.current.moved = true;
            }
            elementRef.current.scrollLeft = dragParamsRef.current.scrollLeft - deltaX;
        };

        const onUp = () => {
            dragParamsRef.current.active = false;
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);

        return () => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointercancel', onUp);
        };
    }, []);

    const wasDragged = useCallback(() => dragParamsRef.current.moved, []);
    return { elementRef, onPointerDown, wasDragged };
}
