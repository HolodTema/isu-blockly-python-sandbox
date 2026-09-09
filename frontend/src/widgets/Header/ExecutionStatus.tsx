import './ExecutionStatus.css';
import icClose from '../../shared/assets/ic_close_black.svg';

interface ExecutionStatusProps {
    isRunning: boolean;
    onStop: () => void;
}

export function ExecutionStatus({ isRunning, onStop }: ExecutionStatusProps) {
    return (
        <div id="code_execution_status" className={isRunning ? 'active' : undefined}>
            <div id="code_execution_status_text" className="font_powered_mclaren">Выполняется</div>
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
