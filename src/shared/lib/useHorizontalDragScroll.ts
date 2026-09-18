import {useCallback, useEffect, useRef} from 'react';

export function useHorizontalDragScroll<T extends HTMLElement>() {
    const elementRef = useRef<T>(null);
    const dragParamsRef = useRef({active: false, startX: 0, scrollLeft: 0, moved: false});

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        if (e.buttons !== 0 || !elementRef.current) {
            return;
        }

        dragParamsRef.current = {
            active: true,
            startX: e.clientX,
            scrollLeft: elementRef.current.scrollLeft,
            moved: false
        }
    }, []);

    useEffect(() => {
        const onMove = (e: PointerEvent) => {
            if (!dragParamsRef.current.active || !elementRef.current) {
                return;
            }

            const deltaX = e.clientX - dragParamsRef.current.startX;
            if (Math.abs(deltaX) > 3) {
                dragParamsRef.current.moved = true;
            }
            elementRef.current.scrollLeft = dragParamsRef.current.scrollLeft - deltaX;
        };

        const onUp = () => {
            dragParamsRef.current.active = false;
        }

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);

        return () => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointercancel', onUp);
        }
    }, []);

    const wasDragged = useCallback(() => dragParamsRef.current.moved, []);
    return { elementRef, onPointerDown, wasDragged };
}
