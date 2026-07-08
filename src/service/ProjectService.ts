import {AppState} from "../state/AppState";
import {BlocklyService} from "./BlocklyService";
import {CodeMirrorService} from "./codeMirrorService";

export class ProjectService {
    constructor(
        private state: AppState,
        private blocklyService: BlocklyService,
        private codeMirrorService: CodeMirrorService)
    { }

    saveProjectToFile() {
        const data = {
            python: this.state.generatedCode,
            blocklyState: this.state.jsonBlocks,
        }

        const strJson: string = JSON.stringify(data)
        const blob: Blob = new Blob([strJson]);
        const strUrl: string = URL.createObjectURL(blob);

        const tempElementA: HTMLAnchorElement = document.createElement("a");
        tempElementA.href = strUrl;
        tempElementA.download = "project.chef";
        document.body.appendChild(tempElementA);
        tempElementA.click();
        document.body.removeChild(tempElementA);

        setTimeout(() => URL.revokeObjectURL(strUrl), 1000);
    }

    loadProjectFromFile(file: Blob) {
        const fileReader: FileReader = new FileReader();
        fileReader.onload = (e: ProgressEvent<FileReader>) => {
            try {
                const data = JSON.parse(e.target!.result! as string);

                if (typeof data.python !== "string" || !data.blocklyState) {
                    console.error("Unable to load project from file. Invalid file format");
                    return;
                }

                this.state.setGeneratedCode(data.python);
                this.state.setJsonBlocks(data.blocklyState);

                this.codeMirrorService.setCodeString(data.python);
                this.blocklyService.loadWorkspaceState(data.blocklyState);

                console.log("Successfully loaded project from file");
            }
            catch (e) {
                console.error("Unable to load project from file:", e);
            }
        };
        fileReader.readAsText(file);
    }

    // private createFileInput() {
    //     const input: HTMLInputElement = document.createElement("input");
    //     input.type = "file";
    //     input.accept = ".chef";
    //     input.style.display = "none";
    //     document.body.appendChild(input);
    //     input.addEventListener("change", (e: Event) => {
    //         if (e.target!.files.length > 0) {
    //             this.loadProjectFromFile(e.target.files[0]);
    //         }
    //     });
    //     return input;
    // }
}