import { useState } from 'react';
import './LoadScreen.css';

import logo from '../../shared/assets/logo.png';
import fullLogo from '../../shared/assets/full_logo.png';

interface LoadScreenProps {
    isLoading: boolean;
}

/**
 * Full-screen splash which covers the whole app until Pyodide finishes loading.
 *
 * Shown on first application start when `isLoading` is `true`. Because Pyodide
 * downloads around 10 MB of WebAssembly plus Python packages (`requests`,
 * `pandas`, `lxml`), initialization takes 5-15 seconds on average connection.
 * Without splash screen user would see empty Blockly canvas and empty code
 * preview for several seconds and probably think the app is broken.
 *
 * Lifecycle is not straightforward:
 *
 * 1. While `isLoading` is `true`, container has no `hidden` class and covers
 *    everything with opacity 1.
 * 2. When `isLoading` becomes `false`, `hidden` class is added. CSS transition
 *    on opacity runs for 1.5 seconds.
 * 3. When transition finishes, `transitionend` event fires. Only then component
 *    calls `setIsRemoved(true)` and unmounts itself from DOM.
 *
 * After unmount, component does **not** come back even if `isLoading` becomes
 * `true` again. This is intentional: once user saw the app, there is no reason
 * to cover it again on every code run. If full re-init is ever needed (for
 * example after worker crash), parent should remount the whole page, not rely
 * on this component.
 *
 * Pointer events are disabled when hidden (`pointer-events: none` in CSS),
 * so splash screen does not block clicks after it becomes invisible but before
 * it is removed.
 * 
 * @example
 * ```tsx
 * const { isReady } = useCodeRunner();
 * return (
 *   <>
 *     <LoadScreen isLoading={!isReady} />
 *     <Header ... />
 *     <SideConsoleBar ... />
 *   </>
 * );
 * ```
 */
export function LoadScreen({ isLoading }: LoadScreenProps) {
    const [isRemoved, setIsRemoved] = useState(false);

    if (isRemoved) return null;

    return (
        <div
            id="splash_screen_container"
            className={isLoading ? undefined : 'hidden'}
            onTransitionEnd={() => {
                if (!isLoading) setIsRemoved(true);
            }}
        >
            <img id="img_logo_splash_screen" src={logo} alt="" />
            <img id="img_full_logo_splash_screen" src={fullLogo} alt="" />
            <div id="text_loading" className="font_powered_mclaren">Загрузка...</div>
        </div>
    );
}
