import {AppState} from "../state/AppState";
import {EditorView, keymap, gutter, GutterMarker} from '@codemirror/view';
import {EditorState, Compartment, Extension} from '@codemirror/state';
import {python} from '@codemirror/lang-python';
import {oneDark} from '@codemirror/theme-one-dark';
import {defaultKeymap} from '@codemirror/commands';
import {basicSetup} from 'codemirror';


export class CodeMirrorService {
    private container: HTMLElement;
    private editor: EditorView;
    private setBreakpoints: Set<number> = new Set();
    private gutterCompartment: Compartment = new Compartment();

    constructor(private state: AppState, containerId: string) {
        this.container = document.getElementById(containerId)!

        const listExtensions = [
            basicSetup,
            python(),
            oneDark,
            EditorView.editable.of(false),
            EditorView.lineWrapping,
            this.gutterCompartment.of(this.createBreakpointGutter()),
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    const code = update.state.doc.toString();
                    this.state.setGeneratedCode(code);
                }
            }),
            keymap.of(defaultKeymap),
        ];

        const startEditorState = EditorState.create({
            doc: this.state.generatedCode || "",
            extensions: listExtensions,
        });

        this.editor = new EditorView({
            state: startEditorState,
            parent: this.container,
        });

        this.state.subscribe((key: string, state: AppState) => {
            if (key === "generatedCode") {
                this.setCodeString(state.generatedCode || "");
            }
        });
    }

    setCodeString(codeString: string) {
        const currentCodeString = this.getCodeString();
        if (currentCodeString !== codeString) {
            const transaction = this.editor.state.update({
                changes: {
                    from: 0,
                    to: this.editor.state.doc.length,
                    insert: codeString
                },
            });
            this.editor.dispatch(transaction);
        }
    }

    getCodeString(): string {
        return this.editor.state.doc.toString()
    }

    getBreakpointsArray() {
        return Array.from(this.setBreakpoints);
    }

    private createBreakpointGutter(): Extension {
        class BreakpointMarker extends GutterMarker {
            toDOM() {
                const div = document.createElement("div");
                div.className = "breakpoint-marker";
                return div;
            }
        }

        return gutter({
            class: "breakpoints-gutter",
            lineMarker: (view, line) => {
                const lineNum: number = view.state.doc.lineAt(line.from).number;
                if (this.setBreakpoints.has(lineNum)) {
                    return new BreakpointMarker();
                }
                return null;
            },
            domEventHandlers: {
                click: (view, line, event) => {
                    const lineNumber = view.state.doc.lineAt(line.from).number;
                    if (this.setBreakpoints.has(lineNumber)) {
                        this.setBreakpoints.delete(lineNumber);
                    } else {
                        this.setBreakpoints.add(lineNumber);
                    }

                    view.dispatch({
                        effects: this.gutterCompartment.reconfigure(this.createBreakpointGutter()),
                    });
                    return true;
                },
            },
        });
    }
}
