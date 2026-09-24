import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as Blockly from 'blockly';
import * as Ru from 'blockly/msg/ru';
import { pythonGenerator, PythonGenerator } from 'blockly/python';

import { initBaseBlocks } from '../../entities/blocks/baseBlocks';
import { initPandasBlocks } from '../../entities/blocks/pandasBlocks';
import { initConvertBlocks } from '../../entities/blocks/convertBlocks';
import { initTextFileBlocks } from '../../entities/blocks/textFileBlocks';
import { initHttpBlocks } from '../../entities/blocks/httpBlocks';
import { createStartBlock } from './blocklyStartBlock';

let blocksDefined = false;

/**
 * Code which is generated from current workspace, in two variants.
 *
 * `toLaunch` is code which runs in Python sandbox; `toShow` is read-only
 * preview code for user. They can be different if execution generator adds some
 * instrumentation and patches (for example stop-signal checks).
 */
export interface GeneratedCode {
  toLaunch: string;
  toShow: string;
}

/**
 * Handle-interface for imperative access to Blockly workspace.
 *
 * Use ref to call these methods from parent component, for example to load
 * saved project into canvas.
 */
export interface BlocklyCanvasHandle {
  getWorkspace: () => Blockly.WorkspaceSvg | null;
  loadState: (state: object) => void;
}

interface Props {
  onStateChange?: (state: object) => void;
  onCodeChange?: (code: GeneratedCode) => void;
  /** State to restore into a freshly created workspace, e.g. from autosave. */
  initialState?: object | null;
}

function createGenerator(mode: 'display' | 'execution'): PythonGenerator {
  const generator = new PythonGenerator('Python');
  generator.INDENT = '    ';
  // Новый генератор создаётся пустым, без встроенных блоков Blockly (text,
  // math_number, controls_if и т.д.) - их надо перенести из синглтона.
  Object.assign(generator.forBlock, pythonGenerator.forBlock);
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

/**
 * Loads serialized state into workspace and restores `start_block` invariants.
 *
 * Serialized state does not store non-deletable/non-movable flags, and the
 * `start_block` itself may be missing from state saved by an older version —
 * in that case a fresh one is created instead.
 */
function loadStateIntoWorkspace(ws: Blockly.WorkspaceSvg, state: object): void {
  Blockly.serialization.workspaces.load(state, ws);

  const startBlock = ws.getTopBlocks(false).find((b) => b.type === 'start_block');
  if (startBlock) {
    startBlock.setDeletable(false);
    startBlock.setMovable(false);
  } else {
    createStartBlock(ws);
  }
}

/**
 * Renders Blockly workspace with custom blocks and generates Python code from
 * block graph.
 *
 * On mount component loads block definitions and toolbox config from
 * `/assets/blockly/`. Component is uncontrolled — to load saved project, use
 * ref with {@link BlocklyCanvasHandle.loadState}.
 *
 * @example
 * ```tsx
 * const ref = useRef<BlocklyCanvasHandle>(null);
 * <BlocklyCanvas
 *   ref={ref}
 *   onCodeChange={(code) => setCode(code)}
 *   onStateChange={(state) => setState(state)}
 * />
 * // later:
 * ref.current?.loadState(savedState);
 * ```
 */
export const BlocklyCanvas = forwardRef<BlocklyCanvasHandle, Props>(
  ({ onStateChange, onCodeChange, initialState }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
    const onStateChangeRef = useRef(onStateChange);
    const onCodeChangeRef = useRef(onCodeChange);
    const emitCodeRef = useRef<(() => void) | null>(null);
    // Только первое значение имеет смысл — состояние восстанавливается один
    // раз, при создании воркспейса.
    const initialStateRef = useRef(initialState);

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

        if (initialStateRef.current) {
          loadStateIntoWorkspace(ws, initialStateRef.current);
        } else {
          createStartBlock(ws);
        }

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

        emitCodeRef.current = emitCode;

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
      loadState: (state: object) => {
        const ws = workspaceRef.current;
        if (!ws) return;

        loadStateIntoWorkspace(ws, state);
        emitCodeRef.current?.();
      },
    }), []);

    return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
  }
);
