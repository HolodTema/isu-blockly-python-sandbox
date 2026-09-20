import { downloadBlob } from "../../shared/lib/download";

/**
 * Shape of `.chef` project file.
 *
 * File is JSON with two top-level keys. `python` is the code which was generated
 * at save time — it is stored for human readability, but not used for loading.
 * `blocklyState` is serialized Blockly workspace which is used to restore blocks.
 */
export interface ProjectFile {
    python: string;
    blocklyState: Record<string, any>;
}

/**
 * Extension of project file. Always starts with dot, so it can be used in
 * `accept` attribute of file input and in `endsWith` check.
 *
 * @internal
 */
const PROJECT_FILE_EXTENSION = ".chef";

/**
 * Serializes project and starts download as `.chef` file.
 *
 * Default filename is `project.chef`. If user already has file with same name,
 * browser will add numeric suffix automatically.
 *
 * @param projectFile - Project data to save.
 * @param filename - Optional custom filename. Usually does not need to be changed.
 */
export function saveProjectToFile(projectFile: ProjectFile, filename = `project${PROJECT_FILE_EXTENSION}`): void {
    downloadBlob(new Blob([JSON.stringify(projectFile)]), filename);
}

/**
 * Opens system file picker and returns selected file, or `null` if user cancelled.
 *
 * Uses hidden input element which is created and removed on the fly. Accept
 * attribute is set to `.chef`, but this is only a hint — user can switch to
 * "All files" in dialog and choose any file. In this case error will be raised
 * later during parsing.
 *
 * @returns Promise which resolves with selected file or `null`.
 */
export function pickProjectFile(): Promise<File | null> {
    return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = PROJECT_FILE_EXTENSION;
        input.style.display = "none";
        document.body.appendChild(input);

        input.addEventListener("change", () => {
            const file = input.files?.[0] ?? null;
            document.body.removeChild(input);
            resolve(file);
        });
        input.addEventListener("cancel", () => {
            document.body.removeChild(input);
            resolve(null);
        });

        input.click();
    });
}

/**
 * Reads and validates `.chef` file.
 *
 * Parses JSON and checks that required fields are present and have correct
 * types. Throws `Error` if file is not valid JSON or has wrong structure.
 * Caller should catch this error and show message to user.
 *
 * Note: `blocklyState` is checked only for being truthy. If state is valid
 * JSON but has wrong shape inside (for example, references block type which
 * does not exist), error will happen later during loading into workspace,
 * not here.
 *
 * @param file - File or Blob to read.
 * @throws If content is not valid JSON or does not have `python` and
 *   `blocklyState` fields.
 */
export async function readProjectFile(file: Blob): Promise<ProjectFile> {
    const text = await file.text();
    const data = JSON.parse(text);

    if (typeof data.python !== "string" || !data.blocklyState) {
        throw new Error("Неверный формат файла проекта");
    }

    return { python: data.python, blocklyState: data.blocklyState };
}
