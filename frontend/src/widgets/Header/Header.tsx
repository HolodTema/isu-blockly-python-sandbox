import { HeaderButton } from './HeaderButton'


import './Header.css'

import logo from '../../shared/assets/full_logo.png'
import icSaveProject from '../../shared/assets/ic_save_project.svg'
import icOpenProject from '../../shared/assets/ic_open_project.svg'
import icRunCode from '../../shared/assets/ic_run_code.svg'
import icDebugCode from '../../shared/assets/ic_debug_code.svg'

interface HeaderProps {
    onRun: () => void;
    onStop: () => void;
    isRunning: boolean;
}

export function Header({ onRun, onStop, isRunning }: HeaderProps) {

    return (
    <div className= 'header_container'>
        <div className = 'header_container__left'>
            <HeaderButton img={logo} text="CodeCheff" onClick={() => {}}></HeaderButton>
            <HeaderButton img={icSaveProject} text="Сохранить" onClick={() => {}}></HeaderButton>
            <HeaderButton img={icOpenProject} text="Открыть" onClick={() => {}}></HeaderButton>
         </div>
         <div className = 'header_container__right'>
             <HeaderButton img={icRunCode} text="Запуск" onClick={isRunning ? onStop : onRun}></HeaderButton>
            <HeaderButton img={icDebugCode} text="Отладка" onClick={() => {}}></HeaderButton>

         </div>
    </div>

    );
}