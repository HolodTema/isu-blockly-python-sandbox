import {render, fireEvent} from '@testing-library/react';
import {useEffect} from 'react';
import {describe, it, expect} from 'vitest';
import {useHorizontalDragScroll} from './useHorizontalDragScroll';

type HookApi = ReturnType<typeof useHorizontalDragScroll<HTMLDivElement>>;

function ScrollableTestComponent({onReady}: { onReady: (api: Api) => void }) {
    const api = useHorizontalDragScroll<HTMLDivElement>();
    useEffect(() => {
        onReady(api);
    });
    return (
        <div
            ref={api.elementRef}
            data-testid="scrollable-test-component"
            onPointerDown={api.onPointerDown}
        />
    );
}

function setup() {
    let hookApi: HookApi | null = null;
    const utils = render(
        <ScrollableTestComponent onReady={(a) => { hookApi = a; }}/>
    );
    return {
        api: () => hookApi!,
        el: utils.getByTestId('scrollable-test-component')
    };
}

describe('useHorizontalDragScroll', () => {
    it('Before any drag, wadDragged() must be false', () => {
        const { api } = setup();
        expect(api().wasDragged()).toBe(false);
    });

    it('After big-path drag, wadDragged() must be true', () => {
        const { api, el } = setup();

        fireEvent.pointerDown(el, { button: 0, clientX: 100 });
        fireEvent.pointerMove(document, { clientX: 150 });
        fireEvent.pointerUp(document);

        expect(api().wasDragged()).toBe(true);
    });

    it('If user press  non-left mouse button, wadDragged() must be false', () => {
        const { el } = setup();
        fireEvent.pointerDown(el, { button: 2, clientX: 100 });
        fireEvent.pointerMove(document, { clientX: 150 });
        fireEvent.pointerUp(document);
    });

    it('After small-path drag, wasDragged() must be false', () => {
        const { api, el } = setup();

        fireEvent.pointerDown(el, { button: 0, clientX: 100 });
        fireEvent.pointerMove(document, { clientX: 102 });
        fireEvent.pointerUp(document);

        expect(api().wasDragged()).toBe(false);
    });
});
