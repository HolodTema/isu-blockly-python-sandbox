import { useState } from 'react';
import './LoadScreen.css';

import logo from '../../shared/assets/logo.png';
import fullLogo from '../../shared/assets/full_logo.png';

interface LoadScreenProps {
    isLoading: boolean;
}

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
