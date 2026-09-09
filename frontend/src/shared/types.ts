export type Status = 'completed' | 'loading' | 'error' ;

export interface HButton {
    img:string,
    text?: string
    onClick: () => void
}
export interface Props {
  onStateChange?: (state: object) => void;
}

export const CodeOutputTab = {
    Output: 'Output',
    Debug: 'Debug',
    OutputFiles: 'OutputFiles',
} as const;

export type CodeOutputTab = (typeof CodeOutputTab)[keyof typeof CodeOutputTab];

export const CODE_OUTPUT_TAB_LABELS: Record<CodeOutputTab, string> = {
    Output: 'Вывод',
    Debug: 'Отладка',
    OutputFiles: 'Итоговые файлы',
};
