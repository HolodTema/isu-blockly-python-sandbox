import './ExecutionStatus.css';
import icClose from '../../shared/assets/ic_close_black.svg';

/**
 * Progress bar with label and stop button, shown while code is running or
 * debug session is active.
 *
 * Visibility is controlled by parent through `active` class: when `isRunning`
 * is `false`, component still exists in DOM but is hidden via CSS. This is done
 * so the component does not remount on every state change and animation does
 * not restart.
 */
interface ExecutionStatusProps {
    isRunning: boolean;
    onStop: () => void;
    text?: string;
}

/**
 * @example
 * ```tsx
 * <ExecutionStatus
 *     isRunning={isRunning || isDebugging}
 *     text={isDebugging ? 'Отладка' : 'Выполняется'}
 *     onStop={onStopExecution}
 * />
 * ```
 */
export function ExecutionStatus({ isRunning, onStop, text = 'Выполняется' }: ExecutionStatusProps) {
    return (
        <div id="code_execution_status" className={isRunning ? 'active' : undefined}>
            <div id="code_execution_status_text" className="font_powered_mclaren">{text}</div>
            <div id="code_execution_status_progress_bar_container">
                <div id="code_execution_status_progress_bar"></div>
            </div>
            <img
                id="code_execution_status_stop_button"
                src={icClose}
                alt="Остановить"
                onClick={onStop}
            />
        </div>
    );
}
