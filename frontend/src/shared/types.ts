export type Status = 'completed' | 'loading' | 'error' ;

export interface HButton {
    img:string,
    text?: string
    onClick: () => void
}
export interface Props {
  onStateChange?: (state: object) => void;
}
