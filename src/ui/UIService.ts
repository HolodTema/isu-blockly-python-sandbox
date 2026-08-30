import {AppState} from "../state/AppState";
import {AppStateKey} from "../state/AppStateKey";
import {BlocklyService} from "../service/BlocklyService";
import {PyodideService} from "../service/PyodideService";
import {ProjectService} from "../service/ProjectService";
import {ToastService} from "../service/ToastService";
import {CodeOutputTabType} from "../state/CodeOutputTabType";


export class UIService {

    constructor(
        private state: AppState,
        private blocklyService: BlocklyService,
        private pyodideService: PyodideService,
        private projectService: ProjectService,
        private toastService: ToastService
    ) {
        const divCodeOutput: HTMLElement = document.getElementById("code_output")!;

        this.configureButtonConvertToCode();
        this.configureButtonRunCode();
        this.configureButtonSaveProject();
        this.configureButtonExpandOutput(divCodeOutput);
        this.configureButtonExpandCode();
        this.configureButtonOpenProject();
        // this.configureButtonDownloadResultFiles();
        this.configureButtonAddInputFile();
        this.showSplashScreenWithHideTimer();

        this.state.subscribe((key: string, state: AppState) => {
            if (key === AppStateKey.StrCodeOutput) {
                divCodeOutput.textContent = state.getStrCodeOutput();
            }
            if (key === AppStateKey.CurrentCodeOutputTabType) {
                this.switchCodeOutputTab(state.getCurrentCodeOutputTabType());
            }
        });
    }

    showCodeExecutionStatus(mode: "run" | "debug") {
        const divCodeExecutionStatus = document.getElementById("code_execution_status");
        const divCodeExecutionStatusText = document.getElementById("code_execution_status_text");
        if (divCodeExecutionStatusText && divCodeExecutionStatus) {
            divCodeExecutionStatus.classList.add("active");
            if (mode === "run") {
                divCodeExecutionStatusText.textContent = "Код выполняется"
            }
            if (mode === "debug") {
                divCodeExecutionStatusText.textContent = "Код отлаживается"
            }
        }
    }

    hideCodeExecutionStatus() {
        const divCodeExecutionStatus = document.getElementById("code_execution_status");
        const divCodeExecutionStatusText = document.getElementById("code_execution_status_text");
        if (divCodeExecutionStatusText && divCodeExecutionStatus) {
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
                    await this.pyodideService.runCurrentCodeFromWorkspace();
                }
                finally {
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

    // private configureButtonDownloadResultFiles() {
    //     const buttonDownloadResultFiles = document.getElementById("button_download_result_files")!;
    //     buttonDownloadResultFiles.addEventListener("click", (e) => {
    //         const promise: Promise<Boolean> = this.pyodideService.saveResultFilesIntoZipArchive();
    //         promise.then(isSuccessful => {
    //             if (!isSuccessful) {
    //                 this.showErrorToastNoResultFiles();
    //             }
    //         });
    //     });
    // }

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
                    this.pyodideService.saveInputFileToPyodideMemory(file.name, byteArray);
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
                        this.pyodideService.removeInputFileFromPyodideMemory(file.name);
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

    private switchCodeOutputTab(tabType: CodeOutputTabType) {
        document.querySelectorAll(".tab_button").forEach((tabButton) => {
           tabButton.classList.toggle("active", tabButton.getAttribute("data-tab") === tabType);
        });
        document.querySelectorAll(".tab_content").forEach((tabContent) => {
            tabContent.classList.toggle("active", tabContent.id === `tab_content_${tabType}`);
        });
        if (tabType === CodeOutputTabType.OutputFiles) {
            this.refreshOutputFilesList();
        }
    }

    private async refreshOutputFilesList() {
        try {
            const files = await this.pyodideService.listFiles();
            const divOutputFilesList = document.getElementById("output_files_list");
            const divOutputFilesPreview = document.getElementById("output_files_preview");
            if (!divOutputFilesList || !divOutputFilesPreview) {
                return;
            }
            
        }
    }
}
