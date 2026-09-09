import { useEffect, useRef, useState } from 'react'
import './SideConsoleBar.css'
import { CodeOutputTab, CODE_OUTPUT_TAB_LABELS } from '../../shared/types'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'
import { BlocklyCanvas } from '../../shared/ui/BlocklyCanvas'
import type { GeneratedCode, BlocklyCanvasHandle } from '../../shared/ui/BlocklyCanvas'
import type { RefObject } from 'react'
import type { useProjectFiles } from '../../features/Files/useProjectFiles'
import type { useDebugger } from '../../features/Debugger/useDebugger'
import { breakpointGutter, activeLineHighlight } from '../../shared/ui/breakpointGutter'

type ProjectFilesApi = ReturnType<typeof useProjectFiles>
type DebuggerApi = ReturnType<typeof useDebugger>

import icAddInputFile from '../../shared/assets/ic_add_input_file.svg'
import icExpandDown from '../../shared/assets/ic_expand_down.svg'
import icExpandUp from '../../shared/assets/ic_expand_up.svg'
import icClose from '../../shared/assets/ic_close_black.svg'

interface SideConsoleBarProps {
    output?: string;
    codeToShow?: string;
    onCodeChange?: (code: GeneratedCode) => void;
    onStateChange?: (state: object) => void;
    blocklyRef?: RefObject<BlocklyCanvasHandle | null>;
    files: ProjectFilesApi;
    isCodeHidden?: boolean;
    debug: DebuggerApi;
}

export function SideConsoleBar({ output, codeToShow, onCodeChange, onStateChange, blocklyRef, files, isCodeHidden, debug }: SideConsoleBarProps){
    const [activeTab, setActiveTab] = useState<CodeOutputTab>(CodeOutputTab.Output);
    const [isOutputExpanded, setIsOutputExpanded] = useState(true);
    const inputFileRef = useRef<HTMLInputElement>(null);

    const { refreshOutputFiles } = files;

    // Список итоговых файлов обновляем при каждом открытии вкладки: программа
    // могла создать новые файлы с прошлого раза.
    useEffect(() => {
        if (activeTab === CodeOutputTab.OutputFiles) {
            refreshOutputFiles();
        }
    }, [activeTab, refreshOutputFiles]);

    // На точке останова показываем переменные сразу, не заставляя искать вкладку.
    useEffect(() => {
        if (debug.isPaused) {
            setActiveTab(CodeOutputTab.Debug);
        }
    }, [debug.isPaused]);

    return (
    <main className={isCodeHidden ? 'code-hidden' : undefined}>
    <div id="blockly_workspace">
        <BlocklyCanvas ref={blocklyRef} onCodeChange={onCodeChange} onStateChange={onStateChange} />
    </div>
    <div id="code_workspace">
        <div id="input_files_toolbar">
            <input
                id="input_add_input_file"
                ref={inputFileRef}
                type="file"
                accept=".txt, .json, .csv"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) files.addInputFile(file);
                    e.target.value = '';
                }}
            />
            <img id="img_add_input_file" src={icAddInputFile} alt="" />
            <a
                id="button_add_input_file"
                className="font_powered_mclaren"
                onClick={() => inputFileRef.current?.click()}
            >
                Входные файлы
            </a>
            <div id="input_files_list">
                {files.inputFilenames.map((filename) => (
                    <div className="input_file" key={filename}>
                        <div className="input_file_text">{filename}</div>
                        <img
                            className="button_remove_input_file"
                            src={icClose}
                            alt="Удалить"
                            onClick={() => files.removeInputFile(filename)}
                        />
                    </div>
                ))}
            </div>
        </div>
        <div id="codeViewer">
            <div id="codemirror_workspace">
                <CodeMirror
                    value={codeToShow ?? ''}
                    height="100%"
                    theme={oneDark}
                    extensions={[
                        python(),
                        breakpointGutter(debug.breakpoints, debug.toggleBreakpoint),
                        activeLineHighlight(debug.currentLine),
                    ]}
                    editable={false}
                />
            </div>
        </div>
        <div id="code_output_header">
            <div id="code_output_header_left">
                <img
                    id="button_expand_output"
                    src={isOutputExpanded ? icExpandDown : icExpandUp}
                    alt={isOutputExpanded ? 'Свернуть вывод' : 'Развернуть вывод'}
                    onClick={() => setIsOutputExpanded((prev) => !prev)}
                />
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
            <div id="code_output_header_right"></div>
        </div>
        <div id="code_output" className={`font_powered_cascadia_code ${isOutputExpanded ? 'code_output_expanded' : 'code_output_not_expanded'}`}>
            <div className={activeTab === CodeOutputTab.Output ? 'tab_content active' : 'tab_content'}>
                {output ? output : 'Запусти код и посмотри результат его работы здесь!'}
            </div>
            <div className={activeTab === CodeOutputTab.Debug ? 'tab_content tab_content_debug active' : 'tab_content tab_content_debug'}>
                <div id="debug_variables_container">
                    <table id="debug_variables_table">
                        <thead>
                            <tr>
                                <th>Переменная</th>
                                <th>Значение</th>
                            </tr>
                        </thead>
                        <tbody id="debug_variables_table_body">
                            {Object.keys(debug.variables).length === 0 ? (
                                <tr>
                                    <td colSpan={2} className="debug_variables_empty">
                                        Нет переменных (еще не дошли до точки останова)
                                    </td>
                                </tr>
                            ) : (
                                Object.entries(debug.variables).map(([name, value]) => (
                                    <tr key={name}>
                                        <td>{name}</td>
                                        <td>{value}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div id="debug_controls">
                    <button id="button_debug_continue" disabled={!debug.isPaused} onClick={debug.debugContinue}>
                        Продолжить
                    </button>
                    <button id="button_debug_step" disabled={!debug.isPaused} onClick={debug.debugStep}>
                        Шаг вперед
                    </button>
                    <button id="button_debug_stop" disabled={!debug.isDebugging} onClick={debug.stopDebug}>
                        Завершить
                    </button>
                </div>
            </div>
            <div className={activeTab === CodeOutputTab.OutputFiles ? 'tab_content tab_content_output_files active' : 'tab_content tab_content_output_files'}>
                <div id="output_files_list">
                    {files.outputFilenames.length === 0 ? (
                        <div className="output_files_empty">Программа еще не создавала файлы</div>
                    ) : (
                        <>
                            {files.outputFilenames.map((filename) => (
                                <div
                                    key={filename}
                                    className={filename === files.selectedOutputFile ? 'file_item active' : 'file_item'}
                                    onClick={() => files.previewOutputFile(filename)}
                                >
                                    {filename}
                                </div>
                            ))}
                            <button
                                className="file_item button_download_all_output_files"
                                onClick={files.downloadOutputFilesZip}
                            >
                                Скачать все файлы
                            </button>
                        </>
                    )}
                </div>
                <div id="output_files_preview">{files.outputFilePreview}</div>
            </div>
        </div>

    </div>
</main>
)
}