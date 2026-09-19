import {HeaderButton} from './HeaderButton'
import {ExecutionStatus} from './ExecutionStatus'
import React, {Fragment, useState} from 'react'
import {useNewProject} from '../../features/NewProject/useNewProject'

import './Header.css'

import logo from '../../shared/assets/full_logo.png'
import icSaveProject from '../../shared/assets/ic_save_project.svg'
import icOpenProject from '../../shared/assets/ic_open_project.svg'
import icRunCode from '../../shared/assets/ic_run_code.svg'
import icDebugCode from '../../shared/assets/ic_debug_code.svg'
import icExpandLeft from '../../shared/assets/ic_expand_left.svg'
import icExpandRight from '../../shared/assets/ic_expand_right.svg'
import icFolders from '../../shared/assets/ic_folders.svg'

interface HeaderProps {
    onRunCode: () => void;
    onStopExecution: () => void;
    onSaveProject: () => void;
    onOpenProject: () => void;
    onToggleCode: () => void;
    onDebugCode: () => void;
    isRunning: boolean;
    isDebugging: boolean;
    isCodeHidden: boolean;
}

export function Header({
    onRunCode,
    onStopExecution,
    onSaveProject,
    onOpenProject,
    onToggleCode,
    onDebugCode,
    isRunning,
    isDebugging,
    isCodeHidden
}: HeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const menuItems = [
        { text: 'Сохранить', icon: icSaveProject, onClick: onSaveProject },
        { text: 'Открыть', icon: icOpenProject, onClick: onOpenProject },
        { text: 'Создать проект', icon: icFolders, onClick: useNewProject().createNewProject }
    ];

    return (
        <div className='header_container'>
            <div className='header_container__left'>
                <HeaderButton img={logo} onClick={() => {}} />

                <div className='header_menu'>
                    <HeaderButton
                        img={icFolders}
                        text="Проекты"
                        onClick={() => setIsMenuOpen(prev => !prev)}
                    />

                    {isMenuOpen && (
                        <div className='header_menu__dropdown'>
                            {menuItems.map(item => (
                                <Fragment key={item.text}>
                                    <HeaderButton
                                        img={item.icon}
                                        text={item.text}
                                        onClick={() => {
                                            item.onClick();
                                            setIsMenuOpen(false);
                                        }}
                                    />
                                </Fragment>
                            ))}
                        </div>
                    )}
                </div>

                <HeaderButton img={icRunCode} text="Запуск" onClick={onRunCode} />
                <HeaderButton img={icDebugCode} text="Отладка" onClick={onDebugCode} />
            </div>

            <div className='header_container__right'>
                <ExecutionStatus
                    isRunning={isRunning || isDebugging}
                    onStop={onStopExecution}
                    text={isDebugging ? 'Отладка' : 'Выполняется'}
                />
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