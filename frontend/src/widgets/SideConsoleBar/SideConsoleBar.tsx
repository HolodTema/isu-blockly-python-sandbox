import { useState } from 'react'
import './SideConsoleBar.css'
import { CodeOutputTab, CODE_OUTPUT_TAB_LABELS } from '../../shared/types'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'
import { BlocklyCanvas } from '../../shared/ui/BlocklyCanvas'
import type { GeneratedCode, BlocklyCanvasHandle } from '../../shared/ui/BlocklyCanvas'
import type { RefObject } from 'react'

import icAddInputFile from '../../shared/assets/ic_add_input_file.svg'
import icExpandDown from '../../shared/assets/ic_expand_down.svg'
import icDownloadResultFiles from '../../shared/assets/ic_download_result_files.svg'

interface SideConsoleBarProps {
    output?: string;
    codeToShow?: string;
    onCodeChange?: (code: GeneratedCode) => void;
    onStateChange?: (state: object) => void;
    blocklyRef?: RefObject<BlocklyCanvasHandle | null>;
}

export function SideConsoleBar({ output, codeToShow, onCodeChange, onStateChange, blocklyRef }: SideConsoleBarProps){
    const [activeTab, setActiveTab] = useState<CodeOutputTab>(CodeOutputTab.Output);

    return (
    <main>
    <div id="blockly_workspace">
        <BlocklyCanvas ref={blocklyRef} onCodeChange={onCodeChange} onStateChange={onStateChange} />
    </div>
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
                <CodeMirror
                    value={codeToShow ?? ''}
                    height="100%"
                    theme={oneDark}
                    extensions={[python()]}
                    editable={false}
                />
            </div>
        </div>
        <div id="code_output_header">
            <div id="code_output_header_left">
                <img id="button_expand_output" src={icExpandDown} alt="expand" />
                <div id="code_output_tab_bar">
                    {(Object.keys(CODE_OUTPUT_TAB_LABELS) as CodeOutputTab[]).map((tab) => (
                        <button
                            key={tab}
                            className={tab === activeTab ? 'tab_button active' : 'tab_button'}
                            data-tab={tab}
                            onClick={() => setActiveTab(tab)}
                        >
                            {CODE_OUTPUT_TAB_LABELS[tab]}
                        </button>
                    ))}
                </div>
            </div>
            <div id="code_output_header_right">
                {activeTab === CodeOutputTab.OutputFiles && (
                    <>
                        <img id="img_download_result_files" src={icDownloadResultFiles} alt="" />
                        <a id="button_download_result_files" className="font_powered_mclaren">Скачать итоговые файлы</a>
                    </>
                )}
            </div>
        </div>
        <div id="code_output" className="font_powered_cascadia_code code_output_expanded">
            <div className={activeTab === CodeOutputTab.Output ? 'tab_content active' : 'tab_content'}>
                {output ? output : 'Запусти код и посмотри результат его работы здесь!'}
            </div>
            <div className={activeTab === CodeOutputTab.Debug ? 'tab_content active' : 'tab_content'}>
                Отладка пока не подключена
            </div>
            <div className={activeTab === CodeOutputTab.OutputFiles ? 'tab_content active' : 'tab_content'}>
                Итоговые файлы пока не подключены
            </div>
        </div>

    </div>
</main>
)
}