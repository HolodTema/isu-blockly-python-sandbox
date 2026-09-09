import { downloadBlob } from "../../shared/lib/download";

export interface ProjectFile {
    python: string;
    blocklyState: Record<string, unknown>;
}

const PROJECT_FILE_EXTENSION = ".chef";

export function saveProjectToFile(project: ProjectFile, filename = `project${PROJECT_FILE_EXTENSION}`): void {
    downloadBlob(new Blob([JSON.stringify(project)]), filename);
}

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

export async function readProjectFile(file: Blob): Promise<ProjectFile> {
    const text = await file.text();
    const data = JSON.parse(text);

    if (typeof data.python !== "string" || !data.blocklyState) {
        throw new Error("Неверный формат файла проекта");
    }

    return { python: data.python, blocklyState: data.blocklyState };
}
