import { AppState } from "./state/AppState"
import { BlocklyService } from './service/BlocklyService';
import { CodeMirrorService } from './service/codeMirrorService';
import { PyodideService } from './service/PyodideService';
import { ProjectService } from './service/ProjectService';
import { UIService } from './ui/UIService';
import {ToastService} from "./service/ToastService";

const state = new AppState();

const blocklyService: BlocklyService = new BlocklyService(state, "blockly_workspace");
const codeMirrorService: CodeMirrorService = new CodeMirrorService(state, "codemirror_workspace");
const pyodideService: PyodideService = new PyodideService(state);
const projectService: ProjectService = new ProjectService(state, blocklyService, codeMirrorService);
const toastService: ToastService = new ToastService();
const uiService = new UIService(state, blocklyService, pyodideService, projectService, codeMirrorService, toastService);