import { EditorView, keymap, gutter, GutterMarker } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { basicSetup } from '@codemirror/basic-setup';
import { defaultKeymap } from '@codemirror/commands';

export class CodeMirrorService {
  constructor(state, containerId) {
    this.state = state;
    this.container = document.getElementById(containerId);
    this.editor = null;
    this.breakpoints = new Set();
    this.init();
  }

  init() {
    const extensions = [
      basicSetup,
      python(),
      oneDark,
      EditorView.editable.of(false), // readOnly по умолчанию
      EditorView.lineWrapping,
      this.createBreakpointGutter(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const code = update.state.doc.toString();
          this.state.setPythonCode(code);
        }
      }),
      keymap.of(defaultKeymap),
    ];

    const startState = EditorState.create({
      doc: this.state.pythonCode || '',
      extensions,
    });

    this.editor = new EditorView({
      state: startState,
      parent: this.container,
    });

    this.state.subscribe((key, st) => {
      if (key === 'pythonCode') {
        const current = this.editor.state.doc.toString();
        if (current !== st.pythonCode) {
          const transaction = this.editor.state.update({
            changes: { from: 0, to: this.editor.state.doc.length, insert: st.pythonCode },
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

    const breakpointGutter = gutter({
      class: 'breakpoints-gutter',
      markers: (view) => {
        const markers = [];
        for (const line of view.state.doc.iterLines()) {
          const lineNum = view.state.doc.lineAt(line.from).number;
          if (this.breakpoints.has(lineNum)) {
            markers.push({ from: line.from, to: line.from, marker: new BreakpointMarker() });
          }
        }
        return markers;
      },
      domEventHandlers: {
        click: (view, line, event) => {
          const lineNumber = line.number;
          if (this.breakpoints.has(lineNumber)) {
            this.breakpoints.delete(lineNumber);
          } else {
            this.breakpoints.add(lineNumber);
          }
          // Перерисовываем гуттер
          view.dispatch({
            effects: gutter.reconfigure(breakpointGutter),
          });
        },
      },
    });

    return breakpointGutter;
  }

  getCode() {
    return this.editor.state.doc.toString();
  }

  setCode(code) {
    const current = this.editor.state.doc.toString();
    if (current !== code) {
      const transaction = this.editor.state.update({
        changes: { from: 0, to: this.editor.state.doc.length, insert: code },
      });
      this.editor.dispatch(transaction);
    }
  }

  setReadOnly(readOnly) {
    const transaction = this.editor.state.update({
      effects: EditorView.editable.reconfigure(EditorView.editable.of(!readOnly)),
    });
    this.editor.dispatch(transaction);
  }

  getBreakpoints() {
    return Array.from(this.breakpoints);
  }

  destroy() {
    this.editor.destroy();
  }
}