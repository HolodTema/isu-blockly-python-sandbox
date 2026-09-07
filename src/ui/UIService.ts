import {AppState} from "../state/AppState";
import {AppStateKey} from "../state/AppStateKey";
import {BlocklyService} from "../service/BlocklyService";
import {PyodideService} from "../service/PyodideService";
import {ProjectService} from "../service/ProjectService";
import {ToastService} from "../service/ToastService";
import {CodeOutputTabType} from "../state/CodeOutputTabType";
import {CodeMirrorService} from "../service/codeMirrorService";


export class UIService {

    private buttonDebugContinue = document.getElementById("button_debug_continue") as HTMLButtonElement;
    private buttonDebugStep = document.getElementById("button_debug_step") as HTMLButtonElement;
    private buttonDebugStop = document.getElementById("button_debug_stop") as HTMLButtonElement;

    constructor(
        private state: AppState,
        private blocklyService: BlocklyService,
        private pyodideService: PyodideService,
        private projectService: ProjectService,
        private codeMirrorService: CodeMirrorService,
        private toastService: ToastService
    ) {
        const divCodeOutput: HTMLElement = document.getElementById("code_output")!;

        this.configureButtonConvertToCode();
        this.configureButtonRunCode();
        this.configureButtonSaveProject();
        this.configureButtonExpandOutput(divCodeOutput);
        this.configureButtonExpandCode();
        this.configureButtonOpenProject();
        this.configureButtonAddInputFile();
        this.showSplashScreenWithHideTimer();
        this.configureCodeOutputTabButtons();
        this.configureDebugUI();
        this.configureButtonDebugCode();
        this.configureCodeExecutionStopButton()

        this.state.subscribe((key: string, state: AppState) => {
            if (key === AppStateKey.StrCodeOutput) {
                const outputTab = document.getElementById('tab_content_Output');
                if (outputTab) {
                    outputTab.textContent = state.getStrCodeOutput();
                }
            }
            if (key === AppStateKey.CurrentCodeOutputTabType) {
                this.switchCodeOutputTab(state.getCurrentCodeOutputTabType());
                if (state.getCurrentCodeOutputTabType() === CodeOutputTabType.Debug) {
                    this.updateDebugVariablesTable(state.getRecordDebugVariables());
                }
            }
            if (key === AppStateKey.RecordDebugVariables) {
                this.updateDebugVariablesTable(state.getRecordDebugVariables());
            }
            if (key === AppStateKey.IsDebugging) {
                const isDebugging = state.getIsDebugging();
                this.setDebugButtonsEnabled(isDebugging);
                if (isDebugging) {
                    this.showCodeExecutionStatus('debug');
                } else {
                    this.hideCodeExecutionStatus();
                }
            }
            if (key == AppStateKey.DebugCurrentLine) {
                codeMirrorService.setDebugCurrentLine(state.getDebugCurrentLine())
            }
        });
    }

    showCodeExecutionStatus(mode: "run" | "debug") {
        const divCodeExecutionStatus = document.getElementById("code_execution_status");
        const divCodeExecutionStatusText = document.getElementById("code_execution_status_text");
        const buttonStopExecution = document.getElementById("code_execution_status_stop_button") as HTMLButtonElement;
        if (divCodeExecutionStatusText && divCodeExecutionStatus && buttonStopExecution) {
            divCodeExecutionStatus.classList.add("active");
            buttonStopExecution.style.display = "block";
            if (mode === "run") {
                divCodeExecutionStatusText.textContent = "Запуск"
            }
            if (mode === "debug") {
                divCodeExecutionStatusText.textContent = "Отладка"
            }
        }
    }

    hideCodeExecutionStatus() {
        const divCodeExecutionStatus = document.getElementById("code_execution_status");
        const divCodeExecutionStatusText = document.getElementById("code_execution_status_text");
        const buttonStopExecution = document.getElementById("code_execution_status_stop_button") as HTMLButtonElement;
        if (divCodeExecutionStatusText && divCodeExecutionStatus && buttonStopExecution) {
            buttonStopExecution.style.display = "none";
            divCodeExecutionStatus.classList.remove("active");
            divCodeExecutionStatusText.textContent = "";
        }
    }

    private configureButtonConvertToCode() {
        document.getElementById("button_convert_to_code")!
            .addEventListener("click", (e: PointerEvent) => {
                this.blocklyService.generateAndUpdateCode();
            });
    }

    private configureButtonRunCode() {
        document.getElementById("button_run_code")!
            .addEventListener("click", async (e: PointerEvent) => {
                this.showCodeExecutionStatus("run");
                await new Promise(resolve => requestAnimationFrame(resolve));
                try {
                    await this.pyodideService.runCode();
                } finally {
                    if (this.state.getCurrentCodeOutputTabType() === CodeOutputTabType.OutputFiles) {
                        await this.refreshOutputFilesList();
                    }
                    this.hideCodeExecutionStatus();
                }
            });
    }

    private configureButtonSaveProject() {
        document.getElementById("button_save_project")!
            .addEventListener("click", (e) => {
                this.projectService.saveProjectToFile();
            });
    }

    private configureButtonExpandOutput(divCodeOutput: HTMLElement) {
        const buttonExpandOutput = document.getElementById("button_expand_output")! as HTMLImageElement;
        buttonExpandOutput.addEventListener("click", (e) => {
            if (divCodeOutput.className.includes("code_output_expanded")) {
                divCodeOutput.className = 'font_powered_cascadia_code code_output_not_expanded';
                buttonExpandOutput.src = '/assets/images/ic_expand_up.svg';
            } else {
                divCodeOutput.className = "font_powered_cascadia_code code_output_expanded";
                buttonExpandOutput.src = "/assets/images/ic_expand_down.svg";
            }
        });
    }

    private configureButtonExpandCode() {
        const main: HTMLElement = document.querySelector("main")!;
        const buttonExpandCode: HTMLImageElement = document.getElementById("button_expand_code")! as HTMLImageElement;
        buttonExpandCode.addEventListener("click", () => {
            const isHidden = main.classList.toggle("code-hidden");
            if (isHidden) {
                buttonExpandCode.src = "assets/images/ic_expand_left.svg";
            } else {
                buttonExpandCode.src = "assets/images/ic_expand_right.svg";
            }

            requestAnimationFrame(() => {
                this.blocklyService.resizeWorkspace();
            })
        });
    }

    private configureButtonOpenProject() {
        const buttonOpenProject = document.getElementById("button_open_project")!;
        buttonOpenProject.addEventListener("click", (e) => {
            const fileInput: HTMLInputElement = this.projectService.createFileInput();
            fileInput.click();
        });
    }

    private configureButtonAddInputFile() {
        const buttonAddInputFile = document.getElementById("button_add_input_file")!;
        const inputAddInputFile = document.getElementById("input_add_input_file")! as HTMLInputElement;
        inputAddInputFile.addEventListener("change", (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
                console.error("Error: unable to open input file to load it into pyodide");
                return;
            }

            const reader = new FileReader();
            reader.onload = async (e: ProgressEvent<FileReader>) => {
                try {
                    const arrayBuffer = e.target?.result as ArrayBuffer;
                    if (!arrayBuffer) {
                        throw new Error("Failed to read file content");
                    }
                    const byteArray = new Uint8Array(arrayBuffer);

                    if (this.state.isInputFilenameInSet(file.name)) {
                        console.error("Error: unable to upload input file into pyodide. File with this name has already been uploaded");
                        return;
                    }
                    this.pyodideService.loadInputFile(file.name, byteArray);
                    this.state.addInputFilename(file.name);

                    const divInputFilesList = document.getElementById("input_files_list")!;

                    const divInputFile = document.createElement("div")
                    divInputFile.className = "input_file";
                    divInputFile.id = `input_file_${file.name}`

                    const buttonRemoveInputFile = document.createElement("img");
                    buttonRemoveInputFile.className = "button_remove_input_file";
                    buttonRemoveInputFile.src = "assets/images/ic_close_black.svg";
                    buttonRemoveInputFile.alt = "remove";
                    buttonRemoveInputFile.addEventListener("click", (e) => {
                        this.pyodideService.removeInputFile(file.name);
                        divInputFilesList.removeChild(divInputFile);
                        this.state.removeInputFilename(file.name);
                    })

                    const divInputFileText = document.createElement("div");
                    divInputFileText.className = "input_file_text";

                    let filenameToShow = file.name;
                    if (filenameToShow.length > 15) {
                        filenameToShow = filenameToShow.slice(0, 15) + "...";
                    }
                    divInputFileText.textContent = `${filenameToShow}`;

                    divInputFile.appendChild(buttonRemoveInputFile);
                    divInputFile.appendChild(divInputFileText);

                    divInputFilesList.appendChild(divInputFile);

                    console.log("Input file added to UI successfully!");
                } catch (e) {
                    console.error("Error: unable to open input file to load it into pyodide:", e);
                }
            };
            reader.readAsArrayBuffer(file);
        });
        buttonAddInputFile.addEventListener("click", (e) => {
            inputAddInputFile.click();
        });
    }

    private showErrorToastNoResultFiles() {
        this.toastService.showErrorToast("Выполненный код не сохранял результирующих файлов для загрузки");
    }

    private showSplashScreenWithHideTimer() {
        const splash: HTMLElement = document.getElementById('splash_screen_container')!;

        setTimeout(() => {
            splash.classList.add("hidden");
            setTimeout(() => {
                splash.classList.add("removed");
            }, 1500);
        }, 1500);
    }

    private configureCodeOutputTabButtons() {
        document.querySelectorAll('.tab_button').forEach(btn => {
            btn.addEventListener("click", () => {
                const tab = btn.getAttribute('data-tab');
                if (tab) {
                    const tabType = tab as CodeOutputTabType;
                    this.state.setCurrentCodeOutputTabType(tabType);
                }
            });
        });

        this.switchCodeOutputTab(this.state.getCurrentCodeOutputTabType());
    }

    private switchCodeOutputTab(tabType: CodeOutputTabType) {
        document.querySelectorAll(".tab_button").forEach((tabButton) => {
            tabButton.classList.toggle("active", tabButton.getAttribute("data-tab") === tabType);
        });
        document.querySelectorAll(".tab_content").forEach((tabContent) => {
            tabContent.classList.toggle("active", tabContent.id === `tab_content_${tabType}`);
        });
        if (tabType === CodeOutputTabType.Output) {
            const divTabContentOutput = document.getElementById('tab_content_Output');
            if (divTabContentOutput) {
                divTabContentOutput.textContent = this.state.getStrCodeOutput();
            }
        }
        if (tabType === CodeOutputTabType.OutputFiles) {
            this.refreshOutputFilesList();
        }
    }

    private configureDebugUI() {
        this.buttonDebugContinue.addEventListener('click', () => {
            this.pyodideService.sendDebugUserCommandContinue()
        });
        this.buttonDebugStep.addEventListener('click', () => {
            this.pyodideService.sendDebugUserCommandStep();
        });
        this.buttonDebugStop.addEventListener('click', () => {
            this.pyodideService.sendDebugUserCommandStop();
        });
        this.setDebugButtonsEnabled(false);
    }

    private setDebugButtonsEnabled(enabled: boolean) {
        this.buttonDebugContinue.disabled = !enabled;
        this.buttonDebugStep.disabled = !enabled;
        this.buttonDebugStop.disabled = !enabled;
    }

    private updateDebugVariablesTable(variables: Record<string, any>) {
        const tableBody = document.getElementById("debug_variables_table_body");
        if (!tableBody) {
            return;
        }

        tableBody.innerHTML = "";

        if (!variables || Object.keys(variables).length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 2;
            td.textContent = 'Нет переменных (еще не дошли до точки останова)';
            td.style.textAlign = 'center';
            td.style.color = '#888';
            tr.appendChild(td);
            tableBody.appendChild(tr);
            return;
        }

        for (const [key, value] of Object.entries(variables)) {
            const tr = document.createElement('tr');
            const tdKey = document.createElement('td');
            tdKey.textContent = key;
            const tdValue = document.createElement('td');
            if (typeof value === 'string') {
                tdValue.textContent = value;
            } else {
                try {
                    tdValue.textContent = JSON.stringify(value, null, 2);
                } catch {
                    tdValue.textContent = String(value);
                }
            }
            tr.appendChild(tdKey);
            tr.appendChild(tdValue);
            tableBody.appendChild(tr);
        }
    }

    private configureButtonDebugCode() {
        document.getElementById("button_debug_code")!
            .addEventListener("click", async () => {
                const code = this.state.getStrCodeToLaunch().trim();
                if (code.length === 0) {
                    this.toastService.showInfoToast("Еще нет программы для отладки");
                    return;
                }
                const breakpoints = this.codeMirrorService.getBreakpointsArray();
                console.log('Breakpoints from editor:', breakpoints);
                if (breakpoints.length === 0) {
                    this.toastService.showInfoToast("Поставьте хотя бы одну точку останова (клик возле номера строки)");
                    return;
                }
                const inputFiles = Array.from(this.state.getInputFilenames());
                this.showCodeExecutionStatus("debug");
                try {
                    await this.pyodideService.debugCode(code, breakpoints, inputFiles);
                } catch (e) {
                    console.error(e);
                }
            });
    }

    private configureCodeExecutionStopButton() {
        const buttonStopExecution = document.getElementById("code_execution_status_stop_button") as HTMLButtonElement;
        buttonStopExecution.addEventListener("click", () => {
            this.pyodideService.stopCodeExecution();
        });
    }

    private async refreshOutputFilesList() {
        try {
            const listOutputFiles: string[] = await this.pyodideService.getListOutputFiles();
            const listOutputFilesWithoutInputFiles = listOutputFiles.filter(filename => !this.state.isInputFilenameInSet(filename));

            const divOutputFilesList = document.getElementById("output_files_list");
            const divOutputFilesPreview = document.getElementById("output_files_preview");
            if (!divOutputFilesList || !divOutputFilesPreview) {
                return;
            }

            divOutputFilesList.innerHTML = "";
            divOutputFilesPreview.textContent = "";

            if (listOutputFilesWithoutInputFiles.length == 0) {
                divOutputFilesList.innerHTML = '<div style="color: #888; padding: 8px;">Программа еще не создавала файлы</div>';
                return;
            }

            listOutputFilesWithoutInputFiles.forEach(filename => {
                const divFileItem = document.createElement("div");
                divFileItem.className = 'file_item';
                divFileItem.textContent = filename;
                divFileItem.dataset.filename = filename;
                divFileItem.addEventListener("click", () => {
                    divOutputFilesList.querySelectorAll('.file_item').forEach(el => el.classList.remove("active"));
                    divFileItem.classList.add('active');
                    this.previewOutputFile(filename);
                });
                divOutputFilesList.appendChild(divFileItem);
            });

            const buttonDownloadAllFiles = document.createElement("button");
            buttonDownloadAllFiles.textContent = 'Скачать все файлы';
            buttonDownloadAllFiles.className = 'file_item button_download_all_output_files';
            buttonDownloadAllFiles.style.cssText = `
                margin-top: 10px;
                background: #07830a;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 6px 12px;
                cursor: pointer;
                font-family: 'mclaren', sans-serif;
                font-size: 14px;
            `;
            buttonDownloadAllFiles.addEventListener('click', () => {
                this.pyodideService.saveOutputFilesZip();
            });
            divOutputFilesList.appendChild(buttonDownloadAllFiles);
        } catch (e) {
            console.error("Error while getting list of code-output-files:", e);
        }
    }

    private async previewOutputFile(filename: string) {
        const divOutputFilesPreview = document.getElementById("output_files_preview");
        if (!divOutputFilesPreview) {
            return;
        }
        try {
            const outputFileText = await this.pyodideService.readOutputFile(filename);
            divOutputFilesPreview.textContent = outputFileText;
        } catch (e) {
            divOutputFilesPreview.textContent = `Ошибка чтения файла: ${e}`;
        }
    }
}
