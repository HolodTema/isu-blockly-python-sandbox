export class CodePreviewTransformer {
    private codeToLaunch: string;

    constructor(codeToLaunch: string) {
        this.codeToLaunch = codeToLaunch;
    }

    convertToPreviewCode(): string {
        // Remove variable declarations like "x = None"
        this.removeVariableNoneDeclarations();
        return this.codeToLaunch;

        this.removeTopEmptyLines();
        this.removeBottomEmptyLines();
    }

    private removeVariableNoneDeclarations(): void {
        const lines = this.codeToLaunch.split("\n");
        // Pattern: optional whitespace, identifier, whitespace, '=', whitespace, 'None', optional whitespace
        const noneDeclarationRegex = /^\s*[a-zA-Z_]\w*\s*=\s*None\s*$/;
        const filtered = lines.filter(line => !noneDeclarationRegex.test(line));
        this.codeToLaunch = filtered.join("\n");
    }

    private removeTopEmptyLines(): void {
        const lines = this.codeToLaunch.split("\n");
        let firstNonEmpty = 0;
        while (firstNonEmpty < lines.length && lines[firstNonEmpty].trim() === "") {
            firstNonEmpty++;
        }
        this.codeToLaunch = lines.slice(firstNonEmpty).join("\n");
    }

    private removeBottomEmptyLines(): void {
        const lines = this.codeToLaunch.split("\n");
        let lastNonEmpty = lines.length - 1;
        while (lastNonEmpty >= 0 && lines[lastNonEmpty].trim() === "") {
            lastNonEmpty--;
        }
        this.codeToLaunch = lines.slice(0, lastNonEmpty + 1).join("\n");
    }
}