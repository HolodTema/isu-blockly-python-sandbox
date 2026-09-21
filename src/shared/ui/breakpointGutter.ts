import { Decoration, EditorView, GutterMarker, gutter } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

class BreakpointMarker extends GutterMarker {
    toDOM() {
        const div = document.createElement('div');
        div.className = 'breakpoint-marker';
        return div;
    }
}

/**
 * CodeMirror lib extension which renders gutter with clickable breakpoint markers.
 *
 * Attach it to `<CodeMirror>` via `extensions` prop. Extension is controlled -
 * it does not keep own state. Pass current breakpoints array and toggle
 * callback. When user clicks gutter cell, callback is called with 1-based line
 * number.
 *
 * @param breakpoints - 1-based line numbers which should show marker.
 * @param onToggle - Called when user clicks gutter cell. Receives 1-based line
 *   number of clicked row.
 *
 * @example
 * ```tsx
 * <CodeMirror
 *   extensions={[breakpointGutter(breakpoints, toggleBreakpoint)]}
 * />
 * ```
 */
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

/**
 * CodeMirror extension which highlights one line with yellow background.
 *
 * Returns empty extension when `line` is `null`, so it is safe to attach it
 * without conditions. Also handles case when code was regenerated during pause
 * and highlighted line does not exist anymore.
 *
 * @param line - 1-based line number to highlight, or `null` for no highlight.
 */
export function activeLineHighlight(line: number | null): Extension {
    if (line === null) return [];

    return EditorView.decorations.compute(['doc'], (state) => {
        if (line < 1 || line > state.doc.lines) return Decoration.none;
        const docLine = state.doc.line(line);
        return Decoration.set(
            Decoration.line({
                attributes: { style: 'background-color: rgba(255, 255, 0, 0.2);' },
            }).range(docLine.from, docLine.from)
        );
    });
}
