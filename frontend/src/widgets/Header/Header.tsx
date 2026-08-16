import { HeaderButton } from './HeaderButton'
import { useState } from 'react'

import './Header.css'

import logo from '../../shared/assets/full_logo.png'
import icSaveProject from '../../shared/assets/ic_save_project.svg'
import icOpenProject from '../../shared/assets/ic_open_project.svg'
import icConvertToCode from '../../shared/assets/ic_convert_to_code.svg'
import icRunCode from '../../shared/assets/ic_run_code.svg'
import icDebugCode from '../../shared/assets/ic_debug_code.svg'

export function Header() {
const [isOpen, setIsOpen] = useState(false);

    return (
    <div className= 'header_container'>
        <div className = 'header_container__left'>
            <HeaderButton img={logo} text="CodeCheff" onClick={() => {}}></HeaderButton>
            <HeaderButton img={icSaveProject} text="Сохранить проект" onClick={() => {}}></HeaderButton>
            <HeaderButton img={icOpenProject} text="Открыть проект" onClick={() => {}}></HeaderButton>
         </div>
         <div className = 'header_container__right'>
            <HeaderButton img={icConvertToCode} text="Конвертировать в код" onClick={() => {}}></HeaderButton>
             <HeaderButton img={icRunCode} text="Запуск" onClick={() => {}}></HeaderButton>
            <HeaderButton img={icDebugCode} text="Отладка" onClick={() => {}}></HeaderButton>

         </div>
    </div>

    );
}