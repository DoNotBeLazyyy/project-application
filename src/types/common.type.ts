import { Dispatch, SetStateAction } from 'react';

// Html div element
export type HtmlAttributeDiv = React.HTMLAttributes<HTMLDivElement>;
export type HtmlDivElementNull = HTMLDivElement | null;

// Span element attributes
export type HtmlAttributeSpan = React.HTMLAttributes<HTMLSpanElement>;
export type HtmlAttributeSVG = React.SVGProps<SVGSVGElement>;
export type ChangeEventInput = React.ChangeEvent<HTMLInputElement>;

// Array of strings or numbers
export type StringNumber = number | string;
export type StringNumberNull = StringNumber | null;
export type NumberNull = number | null;
export type StringUndefined = string | undefined;
export type StringType = string | string[];

// Set state props
export type StateProps<T> = Dispatch<SetStateAction<T>>;