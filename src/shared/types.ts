/**
 * Tab identifiers for output panel which is below code editor.
 *
 * Real labels which user sees are stored in {@link CODE_OUTPUT_TAB_LABELS}.
 * Values in this object are stable identifiers for state and for `data-tab`
 * attribute.
 */
export const CodeOutputTab = {
    Output: 'Output',
    Debug: 'Debug',
    OutputFiles: 'OutputFiles',
    Input: 'Input'
} as const;

export type CodeOutputTab = (typeof CodeOutputTab)[keyof typeof CodeOutputTab];

/**
 * Russian-language labels for every tab in output panel.
 *
 * This map should be kept in sync with {@link CodeOutputTab}. If new tab is
 * added without label, TypeScript shows error. But if label is removed without
 * removing tab, it fails only in runtime.
 */
export const CODE_OUTPUT_TAB_LABELS: Record<CodeOutputTab, string> = {
    Output: 'Вывод',
    Debug: 'Отладка',
    OutputFiles: 'Итоговые файлы',
    Input: 'Ввод'
};
