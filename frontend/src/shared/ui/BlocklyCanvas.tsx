import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as Blockly from 'blockly';
import * as Ru from 'blockly/msg/ru';
import { PythonGenerator } from 'blockly/python';

import { initBaseBlocks } from '../../entities/blocks/baseBlocks';
import { initPandasBlocks } from '../../entities/blocks/pandasBlocks';
import { initConvertBlocks } from '../../entities/blocks/convertBlocks';
import { initTextFileBlocks } from '../../entities/blocks/textFileBlocks';
import { initHttpBlocks } from '../../entities/blocks/httpBlocks';

let blocksDefined = false;

export interface GeneratedCode {
  toLaunch: string;
  toShow: string;
}

export interface BlocklyCanvasHandle {
  getWorkspace: () => Blockly.WorkspaceSvg | null;
}

interface Props {
  onStateChange?: (state: object) => void;
  onCodeChange?: (code: GeneratedCode) => void;
}

function createGenerator(mode: 'display' | 'execution'): PythonGenerator {
  const generator = new PythonGenerator('Python');
  generator.INDENT = '    ';
  initBaseBlocks(generator, mode);
  initPandasBlocks(generator, mode);
  initConvertBlocks(generator, mode);
  initTextFileBlocks(generator, mode);
  initHttpBlocks(generator, mode);
  return generator;
}

function generate(generator: PythonGenerator, ws: Blockly.WorkspaceSvg, startBlock: Blockly.Block): string {
  generator.init(ws);
  const code = generator.blockToCode(startBlock) as string;
  return generator.finish(code)?.trim() ?? '';
}

export const BlocklyCanvas = forwardRef<BlocklyCanvasHandle, Props>(
  ({ onStateChange, onCodeChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
    const onStateChangeRef = useRef(onStateChange);
    const onCodeChangeRef = useRef(onCodeChange);

    useEffect(() => {
      onStateChangeRef.current = onStateChange;
      onCodeChangeRef.current = onCodeChange;
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

        const startBlock = ws.newBlock('start_block');
        startBlock.initSvg();
        startBlock.render();
        startBlock.moveBy(50, 30);
        startBlock.setDeletable(false);
        startBlock.setMovable(false);

        const launchGenerator = createGenerator('execution');
        const showGenerator = createGenerator('display');

        const emitCode = () => {
          const top = ws!.getTopBlocks(false).find((b) => b.type === 'start_block');
          if (!top) return;
          onCodeChangeRef.current?.({
            toLaunch: generate(launchGenerator, ws!, top),
            toShow: generate(showGenerator, ws!, top),
          });
        };

        ws.addChangeListener((e) => {
          if (e.isUiEvent) return;
          onStateChangeRef.current?.(Blockly.serialization.workspaces.save(ws!));
          emitCode();
        });

        emitCode();

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
