import { Decoration, EditorView, GutterMarker, gutter } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

class BreakpointMarker extends GutterMarker {
    toDOM() {
        const div = document.createElement('div');
        div.className = 'breakpoint-marker';
        return div;
    }
}

export function breakpointGutter(breakpoints: number[], onToggle: (line: number) => void): Extension {
    const lines = new Set(breakpoints);

    return gutter({
        class: 'breakpoints-gutter',
        lineMarker: (view, line) =>
            lines.has(view.state.doc.lineAt(line.from).number) ? new BreakpointMarker() : null,
        domEventHandlers: {
            click: (view, line) => {
                onToggle(view.state.doc.lineAt(line.from).number);
                return true;
            },
        },
    });
}

export function activeLineHighlight(line: number | null): Extension {
    if (line === null) return [];

    return EditorView.decorations.compute(['doc'], (state) => {
        // Строка могла исчезнуть, если код перегенерировался во время паузы.
        if (line < 1 || line > state.doc.lines) return Decoration.none;
        const docLine = state.doc.line(line);
        return Decoration.set(
            Decoration.line({
                attributes: { style: 'background-color: rgba(255, 255, 0, 0.2);' },
            }).range(docLine.from, docLine.from)
        );
    });
}
