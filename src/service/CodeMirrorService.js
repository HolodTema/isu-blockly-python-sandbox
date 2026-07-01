import {EditorView, keymap, gutter, GutterMarker} from '@codemirror/view';
import {EditorState, Compartment} from '@codemirror/state'; // Добавили Compartment
import {python} from '@codemirror/lang-python';
import {oneDark} from '@codemirror/theme-one-dark';
import {defaultKeymap} from '@codemirror/commands';
import {basicSetup} from 'codemirror';

export class CodeMirrorService {
    constructor(state, containerId) {
        this.state = state;
        this.container = document.getElementById(containerId);
        this.editor = null;
        this.breakpoints = new Set();
        // Compartment to dynamically update gutters
        this.gutterCompartment = new Compartment();

        this.init();
    }

    init() {
        const extensions = [
            basicSetup,
            python(),
            oneDark,
            // make codeMirror code readonly
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

        const startState = EditorState.create({
            doc: this.state.generatedCode || '',
            extensions,
        });

        this.editor = new EditorView({
            state: startState,
            parent: this.container,
        });

        this.state.subscribe((key, st) => {
            if (key === 'generatedCode') {
                const current = this.editor.state.doc.toString();
                if (current !== st.generatedCode) {
                    const transaction = this.editor.state.update({
                        changes: {from: 0, to: this.editor.state.doc.length, insert: st.generatedCode   },
                    });
                    this.editor.dispatch(transaction);
                }
            }
        });
    }

    createBreakpointGutter() {
        class BreakpointMarker extends GutterMarker {
            toDOM() {
                const div = document.createElement('div');
                div.className = 'breakpoint-marker';
                return div;
            }
        }

        return gutter({
            class: 'breakpoints-gutter',
            lineMarker: (view, line) => {
                // line здесь — это объект BlockInfo. Получаем точный номер строки через её позицию line.from
                const lineNum = view.state.doc.lineAt(line.from).number;
                if (this.breakpoints.has(lineNum)) {
                    return new BreakpointMarker();
                }
                return null;
            },
            domEventHandlers: {
                click: (view, line, event) => {
                    const lineNumber = view.state.doc.lineAt(line.from).number;
                    if (this.breakpoints.has(lineNumber)) {
                        this.breakpoints.delete(lineNumber);
                    } else {
                        this.breakpoints.add(lineNumber);
                    }

                    view.dispatch({
                        effects: this.gutterCompartment.reconfigure(this.createBreakpointGutter()),
                    });
                    return true;
                },
            },
        });
    }

    getCode() {
        return this.editor.state.doc.toString();
    }

    setCode(code) {
        const current = this.editor.state.doc.toString();
        if (current !== code) {
            const transaction = this.editor.state.update({
                changes: {from: 0, to: this.editor.state.doc.length, insert: code},
            });
            this.editor.dispatch(transaction);
        }
    }

    getBreakpoints() {
        return Array.from(this.breakpoints);
    }
}