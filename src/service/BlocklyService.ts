import * as Blockly from 'blockly';
import * as Ru from 'blockly/msg/ru';
import {pythonGenerator, PythonGenerator} from "blockly/python";
import {AppState} from "../state/AppState";
import {Block, WorkspaceSvg} from "blockly";
import {initBaseBlocks} from "../blocks/baseBlocks";
import {initPandasBlocks} from "../blocks/pandasBlocks";
import {initConvertBlocks} from "../blocks/convertBlocks";
import {initTextFileBlocks} from "../blocks/textFileBlocks";
import {initHttpBlocks} from "../blocks/httpBlocks";


export class BlocklyService {
    private workspace: WorkspaceSvg | undefined = undefined;
    private blocklyArea: HTMLElement;
    private blocklyDiv: HTMLElement | null = null;
    private codeToLaunchGenerator: PythonGenerator;
    private codeToShowGenerator: PythonGenerator;
    private codegenTimeout: number | null = null;

    constructor(private state: AppState, private htmlContainerId: string) {
        this.blocklyArea = document.getElementById(this.htmlContainerId)!;
        this.codeToLaunchGenerator = new PythonGenerator("Python");
        this.codeToShowGenerator = new PythonGenerator("Python");
        this.init();
    }

    private async initBlocklyWorkspace(): Promise<void> {
        const jsonBlocks = await fetch("/assets/blockly/blocks.json")
            .then(r => r.json());
        Blockly.defineBlocksWithJsonArray(jsonBlocks);

        const jsonToolbox = await fetch("/assets/blockly/toolbox.json")
            .then(r => r.json());

        this.workspace = Blockly.inject(this.htmlContainerId, {
            toolbox: jsonToolbox,
            grid: {spacing: 20, length: 3, colour: '#ccc', snap: true},
            zoom: {controls: true, wheel: true, startScale: 1.2},
            trashcan: false
        });
    }

    private initBlocklyDiv() {
        this.blocklyDiv = this.workspace!.getInjectionDiv();
        if (this.blocklyDiv) {
            this.blocklyDiv.style.position = "absolute";
            this.blocklyDiv.style.width = "";
            this.blocklyDiv.style.height = "";
        }
    }

    private initCodeGenerators() {
        const originalForBlockFunctions = pythonGenerator.forBlock;
        Object.assign(this.codeToLaunchGenerator.forBlock, originalForBlockFunctions);
        Object.assign(this.codeToShowGenerator.forBlock, originalForBlockFunctions);
        this.configureCodeGenerator(this.codeToLaunchGenerator, "execution")
        this.configureCodeGenerator(this.codeToShowGenerator, "display")
    }

    private configureBlocklyStateSaving() {
        this.workspace!.addChangeListener((event) => {
            if (event.isUiEvent) {
                return;
            }
            this.saveWorkspaceState();

            let shouldGenerateCode = false;
            if (event.type === Blockly.Events.BLOCK_CHANGE ||
                event.type === Blockly.Events.BLOCK_CREATE) {
                const blockId = (event as Blockly.Events.BlockDelete).blockId;
                if (blockId) {
                    const block = this.workspace!.getBlockById(blockId);
                    if (block && this.isBlockInStartBlockChain(block)) {
                        shouldGenerateCode = true
                    }
                }
            } else if (event.type === Blockly.Events.BLOCK_MOVE) {
                const moveEvent = event as Blockly.Events.BlockMove
                const blockId = moveEvent.blockId;
                if (blockId) {
                    const block = this.workspace!.getBlockById(blockId);
                    if (block) {
                        if (this.isBlockInStartBlockChain(block)) {
                            shouldGenerateCode = true;
                        }
                        else {
                            if (moveEvent.oldParentId) {
                                const oldParent = this.workspace!.getBlockById(moveEvent.oldParentId);
                                if (oldParent && this.isBlockInStartBlockChain(oldParent)) {
                                    shouldGenerateCode = true;
                                }
                            }
                        }
                    }
                }
            } else if (event.type === Blockly.Events.BLOCK_DELETE) {
                shouldGenerateCode = true
            }

            if (shouldGenerateCode) {
                this.scheduleCodeGeneration();
            }
        });
        const jsonBlocklyState = this.state.getJsonBlocklyState();
        if (jsonBlocklyState) {
            Blockly.serialization.workspaces.load(jsonBlocklyState, this.workspace!);
        }
    }

    private configureBlocklyResize() {
        this.resizeWorkspace();

        window.addEventListener("resize", () => {
            this.resizeWorkspace();
        })
    }

    private async init() {
        try {
            Blockly.setLocale(Ru);
            await this.initBlocklyWorkspace();
            this.initBlocklyDiv();
            this.initCodeGenerators();
            this.createStartBlock();
            this.configureBlocklyStateSaving();
            this.configureBlocklyResize();
            console.log("Blockly: initialization complete");
        } catch (e) {
            console.error("Blockly init-error:", e);
        }
    }

    private configureCodeGenerator(generator: PythonGenerator, mode: "display" | "execution") {
        generator.INDENT = "    ";
        initBaseBlocks(generator, mode);
        initPandasBlocks(generator, mode);
        initConvertBlocks(generator, mode);
        initTextFileBlocks(generator, mode);
        initHttpBlocks(generator, mode);
    }

    private createStartBlock() {
        const startBlock = this.workspace!.newBlock("start_block");
        startBlock.initSvg();
        startBlock.render();
        startBlock.moveBy(50, 30);
        startBlock.setDeletable(false);
        startBlock.setMovable(false);
    }

    private isBlockInStartBlockChain(block: Blockly.Block): boolean {
        const root = block.getRootBlock();
        return root && root.type == "start_block";
    }

    private scheduleCodeGeneration() {
        if (this.codegenTimeout) {
            clearTimeout(this.codegenTimeout);
        }
        this.codegenTimeout = window.setTimeout(() => {
            this.generateAndUpdateCode();
            this.codegenTimeout = null
        }, 100);
    }

    saveWorkspaceState() {
        const stateToSave = Blockly.serialization.workspaces.save(this.workspace!);
        this.state.setJsonBlocklyState(stateToSave);
    }

    generateAndUpdateCode() {
        const allBlocks = this.workspace!.getTopBlocks(false);
        const startBlock = allBlocks.find(block => block.type === "start_block");
        if (!startBlock) {
            console.error("Blockly: Error: there is no start_block on the workspace");
            return;
        }

        this.codeToLaunchGenerator.init(this.workspace!);
        let codeToLaunch = this.codeToLaunchGenerator.blockToCode(startBlock) as string;
        codeToLaunch = this.codeToLaunchGenerator.finish(codeToLaunch)?.trim();
        this.state.setStrCodeToLaunch(codeToLaunch);

        this.codeToShowGenerator.init(this.workspace!);
        let codeToShow = this.codeToShowGenerator.blockToCode(startBlock) as string;
        codeToShow = this.codeToShowGenerator.finish(codeToShow)?.trim();
        this.state.setStrCodeToShow(codeToShow);
    }

    loadWorkspaceState(blocksState: { [p: string]: any }) {
        this.workspace!.clear();
        this.createStartBlock();
        if (blocksState) {
            Blockly.serialization.workspaces.load(blocksState, this.workspace!);
        }
        this.saveWorkspaceState();
        this.generateAndUpdateCode();
    }

    resizeWorkspace() {
        if (!this.workspace || !this.blocklyArea || !this.blocklyDiv) {
            return;
        }
        let element = this.blocklyArea;
        let x = 0;
        let y = 0;
        do {
            x += element.offsetLeft || 0;
            y += element.offsetTop || 0;
            element = element.offsetParent as HTMLElement;
        }
        while (element);

        this.blocklyDiv.style.left = x + 'px';
        this.blocklyDiv.style.top = y + 'px';
        this.blocklyDiv.style.width = this.blocklyArea.offsetWidth + 'px';
        this.blocklyDiv.style.height = this.blocklyArea.offsetHeight + 'px';

        Blockly.svgResize(this.workspace);
    }
}
