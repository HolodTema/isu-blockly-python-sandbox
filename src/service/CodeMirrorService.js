import CodeMirror from 'codemirror';
import 'codemirror/mode/python/python';
import 'codemirror/theme/material.css';
import 'codemirror/addon/selection/active-line';
import 'codemirror/addon/scroll/simplescrollbars';

export class CodeMirrorService {
    constructor(state, htmlElementTextAreaId) {
        this.state = state;
        this.htmlElementTextAreaId = htmlElementTextAreaId;

        this.codeMirror = CodeMirror.fromTextArea(this.htmlElementTextAreaId, {
            mode: "python",
            theme: "material",
            lineNumbers: true,
            readOnly: true,
            gutters: ['CodeMirror-linenumbers', 'breakpoints'],
            styleActiveLine: true,
            scrollbarStyle: 'simple',
        });

        this.codeMirror.on("change", () => {
            const strCode = this.codeMirror.getValue();
            this.state.setGeneratedCode(strCode);
        })

        this.state.subscribe((key, state) => {
            if (key === "generatedCode") {
                const strCurrentCode = this.codeMirror.getValue();
                if (strCurrentCode !== state.generatedCode) {
                    this.codeMirror.setValue(state.generatedCode);
                }
            }
        });

        this.codeMirror.on("gutterClick", (cm, lineNumber, gutter) => {
            if (gutter !== "breakpoints") return;
            const info = cm.lineInfo(lineNumber);
            if (info.gutterMarkers && info.gutterMarkers["breakpoints"]) {
                cm.setGutterMarker(lineNumber, "breakpoints", null);
            } else {
                const marker = document.createElement("div");
                marker.className = "breakpoint-marker";
                cm.setGutterMarker(lineNumber, "breakpoints", marker);
            }
        });

        if (this.state.generatedCode) {
            this.codeMirror.setValue(this.state.generatedCode);
        }
    }

    getCode() {
        return this.codeMirror.getValue();
    }

    setCode(strCode) {
        this.codeMirror.setValue(strCode);
    }
}