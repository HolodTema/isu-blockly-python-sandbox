export default function configureCodeMirror() {
    const textarea = document.getElementById("python_code");

    window.codeMirror = CodeMirror.fromTextArea(textarea, {
        mode: 'python',
        theme: 'material',
        lineNumbers: true,
        readOnly: true,
        gutters: ['CodeMirror-linenumbers', 'breakpoints'],
        styleActiveLine: true,
        scrollbarStyle: 'simple',
    });

    codeMirror.on('gutterClick', function (cm, lineNumber, gutter) {
        console.log('Clicked on gutter:', gutter, 'line:', lineNumber);
        if (gutter !== 'breakpoints') return;

        const lineInfo = cm.lineInfo(lineNumber);
        if (lineInfo.gutterMarkers && lineInfo.gutterMarkers['breakpoints']) {
            cm.setGutterMarker(lineNumber, 'breakpoints', null);
        } else {
            const marker = document.createElement('div');
            marker.className = 'breakpoint-marker';
            cm.setGutterMarker(lineNumber, 'breakpoints', marker);
        }
    });
}
