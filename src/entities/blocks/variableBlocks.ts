/**
 * Toolbox configuration for variables-category.
 *
 * Because default Blockly category does not fit our needs (we want button for
 * creating variable in same place), we use custom callback for this category.
 */

import * as Blockly from 'blockly';

type FlyoutItemInfoArray = Blockly.utils.toolbox.FlyoutItemInfoArray;

/**
 * Builds list of flyout items for variables category.
 *
 * When workspace has no variables yet, only "Create variable" button is shown —
 * because `variables_get` and `variables_set` blocks make no sense without
 * any variable to choose.
 *
 * @internal — used only inside {@link configureVariablesCategory}.
 */
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

/**
 * Registers custom callback for variables category and for "create variable"
 * button inside it.
 *
 * Should be called once after Blockly workspace is created. Without this call,
 * variable category in toolbox will use default Blockly behavior which does not
 * match our design.
 *
 * @param workspace - Workspace where callbacks will be registered.
 */
export function configureVariablesCategory(workspace: Blockly.WorkspaceSvg) {
    workspace.registerToolboxCategoryCallback("VARIABLE", customVariablesCategory);
    workspace.registerButtonCallback('CREATE_VARIABLE', function(b: Blockly.FlyoutButton) {
        Blockly.Variables.createVariableButtonHandler(workspace);
    });
}
