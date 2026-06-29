export class UIService {
    constructor(state, blocklyService, pyodideService, projectService, codeMirrorService) {
        this.state = state;
        this.blocklyService = blocklyService;
        this.pyodideService = pyodideService;
        this.projectService = projectService;
        this.codeMirrorService = codeMirrorService;

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
    }
}
