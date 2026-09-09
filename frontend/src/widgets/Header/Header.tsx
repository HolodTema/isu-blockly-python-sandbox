import { HeaderButton } from './HeaderButton'
import { ExecutionStatus } from './ExecutionStatus'


import './Header.css'

import logo from '../../shared/assets/full_logo.png'
import icSaveProject from '../../shared/assets/ic_save_project.svg'
import icOpenProject from '../../shared/assets/ic_open_project.svg'
import icRunCode from '../../shared/assets/ic_run_code.svg'
import icDebugCode from '../../shared/assets/ic_debug_code.svg'

interface HeaderProps {
    onRun: () => void;
    onStop: () => void;
    onSaveProject: () => void;
    onOpenProject: () => void;
    isRunning: boolean;
}

export function Header({ onRun, onStop, onSaveProject, onOpenProject, isRunning }: HeaderProps) {

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
            <HeaderButton img={icDebugCode} text="Отладка" onClick={() => {}}></HeaderButton>

         </div>
    </div>

    );
}