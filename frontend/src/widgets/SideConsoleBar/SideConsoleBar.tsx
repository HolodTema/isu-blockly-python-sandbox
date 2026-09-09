import './SideConsoleBar.css'
import { BlocklyCanvas } from '../../shared/ui/BlocklyCanvas'

import icAddInputFile from '../../shared/assets/ic_add_input_file.svg'
import icExpandDown from '../../shared/assets/ic_expand_down.svg'
import icDownloadResultFiles from '../../shared/assets/ic_download_result_files.svg'

interface SideConsoleBarProps {
    output?: string;
}

export function SideConsoleBar({ output }: SideConsoleBarProps){
    return (
    <main>
    <div id="blockly_workspace"><BlocklyCanvas /></div>
    <div id="code_workspace">
        <div id="input_files_toolbar">
            <input id="input_add_input_file" type="file" accept=".txt, .json, .csv" />
            <img id="img_add_input_file" src={icAddInputFile} alt="" />
            <a id="button_add_input_file" className="font_powered_mclaren">Входные файлы</a>
            <div id="input_files_list">

            </div>
        </div>
        <div id="codeViewer">
            <div id="codemirror_workspace">
            </div>
        </div>
        <div id="code_output_header">
            <div id="code_output_header_left">
                <img id="button_expand_output" src={icExpandDown} alt="expand" />
                <div id="tab_button_output" className="font_powered_mclaren">Вывод</div>
                <div id="tab_button_debug" className="font_powered_mclaren">Отладка</div>
            </div>
            <div id="code_output_header_right">
                <img id="img_download_result_files" src={icDownloadResultFiles} alt="" />
                <a id="button_download_result_files" className="font_powered_mclaren">Скачать итоговые файлы</a>
            </div>
        </div>
        <div id="code_output" className="font_powered_cascadia_code code_output_expanded" style={{ whiteSpace: 'pre-wrap' }}>
            {output ? output : 'Запусти код и посмотри результат его работы здесь!'}
        </div>

    </div>
</main>
)
}