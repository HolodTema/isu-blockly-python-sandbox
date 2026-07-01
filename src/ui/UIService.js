export class UIService {
    constructor(state, blocklyService, pyodideService, projectService, codeMirrorService, toastService) {
        this.state = state;
        this.blocklyService = blocklyService;
        this.pyodideService = pyodideService;
        this.projectService = projectService;
        this.codeMirrorService = codeMirrorService;
        this.toastService = toastService

        document.getElementById("button_convert_to_code")
            .addEventListener("click", (e) => {
                this.blocklyService.generateAndUpdateCode();
            });

        document.getElementById("button_run_code")
            .addEventListener("click", (e) => {
                this.pyodideService.runCurrentCodeFromWorkspace();
            });

        document.getElementById("button_save_project")
            .addEventListener("click", (e) => {
                this.projectService.saveProjectToFile();
            });

        const buttonOpenProject = document.getElementById("button_open_project");
        let htmlElementFileInput = null;
        buttonOpenProject.addEventListener("click", (e) => {
            if (!htmlElementFileInput) {
                htmlElementFileInput = this.projectService.createFileInput();
            }
            htmlElementFileInput.click();
        });

        const divCodeOutput = document.getElementById("code_output");
        const buttonExpandOutput = document.getElementById("button_expand_output");

        buttonExpandOutput.addEventListener("click", (e) => {
            if (divCodeOutput.className.includes("code_output_expanded")) {
                divCodeOutput.className = 'font_powered_cascadia_code code_output_not_expanded';
                buttonExpandOutput.src = '/assets/images/ic_expand_up.svg';
            }
            else {
                divCodeOutput.className = "font_powered_cascadia_code code_output_expanded";
                buttonExpandOutput.src = "/assets/images/ic_expand_down.svg";
            }
        });

        const buttonAddInputFile = document.getElementById("button_add_input_file");
        const inputAddInputFile = document.getElementById("input_add_input_file");
        inputAddInputFile.addEventListener("change", (e) => {
            const file = event.target.files[0];
            if (!file) {
                console.error("Error: unable to open input file to load it into pyodide");
                return;
            }
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const byteArray = new Uint8Array(arrayBuffer);

                    if (this.state.isInputFilenameInSet(file.name)) {
                        console.error("Error: unable to upload input file into pyodide. File with this name has already been uploaded");
                        return;
                    }
                    this.pyodideService.saveInputFileToPyodideMemory(file.name, byteArray);
                    this.state.addInputFilename(file.name);

                    const divInputFilesList = document.getElementById("input_files_list");

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
                }
                catch (e) {
                    console.error("Error: unable to open input file to load it into pyodide:", e);
                }
            };
            reader.readAsArrayBuffer(file);
        });
        buttonAddInputFile.addEventListener("click", (e) => {
            inputAddInputFile.click();
        });

        const buttonDownloadResultFiles = document.getElementById("button_download_result_files");
        buttonDownloadResultFiles.addEventListener("click", (e) => {
            const promise = this.pyodideService.saveResultFilesIntoZipArchive();
            promise.then(isSuccessful => {
                if (!isSuccessful) {
                    this.showErrorToastNoResultFiles();
                }
            });
        });

        this.state.subscribe((key, st) => {
            if (key === "codeOutput") {
                divCodeOutput.textContent = st.codeOutput;
            }
        });
    }

    showErrorToastNoResultFiles() {
        console.log("toast");
        this.toastService.showErrorToast("Выполненный код не сохранял результирующих файлов для загрузки");
    }
}
