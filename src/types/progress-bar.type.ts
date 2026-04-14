import { HTMLAttributesDivElement } from '@type/common.type';

export interface ProgressBarBaseProps extends HTMLAttributesDivElement {
    // Fill color class (e.g. 'bg-(--mui-tokens-color-brand-500)')
    fillColor: string;

    // Track thickness in pixels (width for vertical, height for horizontal)
    height: number;

    // The fill percentage (0–100), animates via CSS transition
    percentage: number;
}