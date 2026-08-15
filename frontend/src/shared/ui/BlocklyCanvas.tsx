import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as Blockly from 'blockly';
import * as Ru from 'blockly/msg/ru';

let blocksDefined = false;

export interface BlocklyCanvasHandle {
  getWorkspace: () => Blockly.WorkspaceSvg | null;
}

interface Props {
  onStateChange?: (state: object) => void;
}

export const BlocklyCanvas = forwardRef<BlocklyCanvasHandle, Props>(
  ({ onStateChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
    const onStateChangeRef = useRef(onStateChange);

    useEffect(() => {
      onStateChangeRef.current = onStateChange;
    });

    useEffect(() => {
      let disposed = false;
      let ws: Blockly.WorkspaceSvg | null = null;
      let observer: ResizeObserver | null = null;

      (async () => {
        const [blocks, toolbox] = await Promise.all([
          fetch('/assets/blockly/blocks.json').then((r) => r.json()),
          fetch('/assets/blockly/toolbox.json').then((r) => r.json()),
        ]);
      
        if (disposed || !containerRef.current) return;

        if (!blocksDefined) {
          Blockly.defineBlocksWithJsonArray(blocks);
          blocksDefined = true;
        }
        Blockly.setLocale(Ru as unknown as Record<string, string>);

        ws = Blockly.inject(containerRef.current, {
          toolbox,
          grid: { spacing: 20, length: 3, colour: '#ccc', snap: true },
          zoom: { controls: true, wheel: true, startScale: 1.2 },
          trashcan: false,
        });

        ws.addChangeListener((e) => {
          if (e.isUiEvent) return;
          onStateChangeRef.current?.(
            Blockly.serialization.workspaces.save(ws!)
          );
        });

        
        observer = new ResizeObserver(() => Blockly.svgResize(ws!));
        observer.observe(containerRef.current);

        workspaceRef.current = ws;
      })();

      return () => {
        disposed = true;
        observer?.disconnect();
        ws?.dispose();
        workspaceRef.current = null;
      };
    }, []); 
    
    useImperativeHandle(ref, () => ({
      getWorkspace: () => workspaceRef.current,
    }), []);

    return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
  }
);