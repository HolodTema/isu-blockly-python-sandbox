import { AppState } from "./state/AppState.js"
import { BlocklyService } from './service/BlocklyService.js';
import { CodeMirrorService } from './service/CodeMirrorService.js';
import { PyodideService } from './service/PyodideService.js';
import { ProjectService } from './service/ProjectService.js';
import { UIService } from './ui/UIService.js';
import {ToastService} from "./service/ToastService";

const state = new AppState();

const blocklyService = new BlocklyService(state, "blockly_workspace");
const codeMirrorService = new CodeMirrorService(state, "codemirror_workspace");
const pyodideService = new PyodideService(state);
const projectService = new ProjectService(state, blocklyService, codeMirrorService);
const toastService = new ToastService();
const uiService = new UIService(state, blocklyService, pyodideService, projectService, codeMirrorService, toastService);