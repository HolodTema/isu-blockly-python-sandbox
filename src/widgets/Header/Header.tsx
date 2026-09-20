import {HeaderButton} from './HeaderButton'
import {ExecutionStatus} from './ExecutionStatus'
import {Fragment, useState} from 'react'

import './Header.css'

import logo from '../../shared/assets/full_logo.png'
import icSaveProject from '../../shared/assets/ic_save_project.svg'
import icOpenProject from '../../shared/assets/ic_open_project.svg'
import icRunCode from '../../shared/assets/ic_run_code.svg'
import icDebugCode from '../../shared/assets/ic_debug_code.svg'
import icExpandLeft from '../../shared/assets/ic_expand_left.svg'
import icExpandRight from '../../shared/assets/ic_expand_right.svg'
import icFolders from '../../shared/assets/ic_folders.svg'

/**
 * Top bar of the application with main actions and execution status.
 *
 * Layout is split into two parts:
 * - left side: logo, "Проекты" dropdown and main action buttons (run, debug);
 * - right side: execution status and code panel toggle.
 *
 * Project-related actions (open, new, save) are hidden inside dropdown menu
 * to save horizontal space on narrow screens. Dropdown opens on click and
 * closes automatically after any action inside is triggered.
 *
 * Component is controlled: it does not know about code, workspace or worker.
 * Parent passes callbacks and receives user intents.
 */
interface HeaderProps {
    onRunCode: () => void;
    onStopExecution: () => void;
    onSaveProject: () => void;
    onOpenProject: () => void;
    onNewProject: () => void;
    onToggleCode: () => void;
    onDebugCode: () => void;
    isRunning: boolean;
    isDebugging: boolean;
    isCodeHidden: boolean;
}

/**
 * @example
 * ```tsx
 * <Header
 *     onRunCode={handleRun}
 *     onStopExecution={handleStop}
 *     onSaveProject={handleSave}
 *     onOpenProject={handleOpen}
 *     onNewProject={handleNew}
 *     onToggleCode={() => setIsCodeHidden(p => !p)}
 *     onDebugCode={handleDebug}
 *     isRunning={isRunning}
 *     isDebugging={debug.isDebugging}
 *     isCodeHidden={isCodeHidden}
 * />
 * ```
 */
export function Header({
    onRunCode,
    onStopExecution,
    onSaveProject,
    onOpenProject,
    onNewProject,
    onToggleCode,
    onDebugCode,
    isRunning,
    isDebugging,
    isCodeHidden
}: HeaderProps) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const menuItems = [
        { text: 'Открыть', icon: icOpenProject, onClick: onOpenProject, shortcut: 'Ctrl+O' },
        { text: 'Создать проект', icon: icFolders, onClick: onNewProject, shortcut: 'Alt+N' },
        { text: 'Сохранить', icon: icSaveProject, onClick: onSaveProject, shortcut: 'Ctrl+S' },
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
                                        shortcut={item.shortcut}
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
