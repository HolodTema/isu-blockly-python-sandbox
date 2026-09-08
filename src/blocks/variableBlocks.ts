import * as Blockly from 'blockly';
import {FlyoutItemInfoArray} from "blockly/core/utils/toolbox";

function customVariablesCategory(workspace: Blockly.WorkspaceSvg) {
    let blocks: FlyoutItemInfoArray;
    if (workspace.getVariableMap().getAllVariables().length > 0) {
        blocks = [
            {
                "kind": "button",
                "text": "Создать переменную",
                "callbackkey": "CREATE_VARIABLE"
            },
            {
                "kind": "block",
                "type": "variables_get"
            },
            {
                "kind": "block",
                "type": "variables_set"
            },
        ];
    }
    else {
        blocks = [
            {
                "kind": "button",
                "text": "Создать переменную",
                "callbackkey": "CREATE_VARIABLE"
            }
        ];
    }
    return blocks;
}

export function configureVariablesCategory(workspace: Blockly.WorkspaceSvg) {
    workspace.registerToolboxCategoryCallback("VARIABLE", customVariablesCategory);
    workspace.registerButtonCallback('CREATE_VARIABLE', function(b: Blockly.FlyoutButton) {
        Blockly.Variables.createVariableButtonHandler(workspace);
    });
}
