import { HeaderButton } from './HeaderButton'
import { ExecutionStatus } from './ExecutionStatus'


import './Header.css'

import logo from '../../shared/assets/full_logo.png'
import icSaveProject from '../../shared/assets/ic_save_project.svg'
import icOpenProject from '../../shared/assets/ic_open_project.svg'
import icRunCode from '../../shared/assets/ic_run_code.svg'
import icDebugCode from '../../shared/assets/ic_debug_code.svg'
import icExpandLeft from '../../shared/assets/ic_expand_left.svg'
import icExpandRight from '../../shared/assets/ic_expand_right.svg'

interface HeaderProps {
    onRun: () => void;
    onStop: () => void;
    onSaveProject: () => void;
    onOpenProject: () => void;
    onToggleCode: () => void;
    onDebug: () => void;
    isRunning: boolean;
    isCodeHidden: boolean;
}

export function Header({ onRun, onStop, onSaveProject, onOpenProject, onToggleCode, onDebug, isRunning, isCodeHidden }: HeaderProps) {

    return (
    <div className= 'header_container'>
        <div className = 'header_container__left'>
            <HeaderButton img={logo}  onClick={() => {}}></HeaderButton>
            <HeaderButton img={icSaveProject} text="Сохранить" onClick={onSaveProject}></HeaderButton>
            <HeaderButton img={icOpenProject} text="Открыть" onClick={onOpenProject}></HeaderButton>
         </div>
         <div className = 'header_container__right'>
             <ExecutionStatus isRunning={isRunning} onStop={onStop} />
             <HeaderButton img={icRunCode} text="Запуск" onClick={onRun}></HeaderButton>
            <HeaderButton img={icDebugCode} text="Отладка" onClick={onDebug}></HeaderButton>
             <img
                 id="button_expand_code"
                 src={isCodeHidden ? icExpandLeft : icExpandRight}
                 alt={isCodeHidden ? 'Показать код' : 'Скрыть код'}
                 onClick={onToggleCode}
             />
         </div>
    </div>

    );
}