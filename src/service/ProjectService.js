
export class ProjectService {
    constructor(state, blocklyService, codeMirrorService) {
        this.state = state;
        this.blocklyService = blocklyService;
        this.codeMirrorService = codeMirrorService;
    }

    saveProjectToFile() {
        const data = {
            python: this.state.generatedCode,
            blocklyState: this.state.jsonBlocks,
        }

        const json = JSON.stringify(data)
        const blob = new Blob([json]);
        const url = URL.createObjectURL(blob);
        const tempElementA = document.createElement("a");
        tempElementA.href = url;
        tempElementA.download = "project.chef";
        document.body.appendChild(tempElementA);
        tempElementA.click();
        document.body.removeChild(tempElementA);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    loadProjectFromFile(file) {
        const fileReader = new FileReader();
        fileReader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (typeof data.python !== "string" || !data.blocklyState) {
                    console.error("Unable to load project from file. Invalid file format");
                    return;
                }

                this.state.setGeneratedCode(data.python);
                this.state.setJsonBlocks(data.blocklyState);

                this.codeMirrorService.setCode(data.python);
                this.blocklyService.loadWorkspaceState(data.blocklyState);

                console.log("Successfully loaded project from file");
            }
            catch (e) {
                console.error("Unable to load project from file:", e);
            }
            finally {
                file.value = "";
            }
        };

        fileReader.readAsText(file);
    }

    createFileInput() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".chef";
        input.style.display = "none";
        document.body.appendChild(input);
        input.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                this.loadProjectFromFile(e.target.files[0]);
            }
        });
        return input;
    }
}