export const CodeOutputTab = {
    Output: 'Output',
    Debug: 'Debug',
    OutputFiles: 'OutputFiles',
    Input: 'Input'
} as const;

export type CodeOutputTab = (typeof CodeOutputTab)[keyof typeof CodeOutputTab];

export const CODE_OUTPUT_TAB_LABELS: Record<CodeOutputTab, string> = {
    Output: 'Вывод',
    Debug: 'Отладка',
    OutputFiles: 'Итоговые файлы',
    Input: 'Ввод'
};
