import { SxProps } from '@mui/system';
import { GridApi, Theme } from 'ag-grid-community';
import {
    ChangeEvent, Dispatch, HTMLAttributes, KeyboardEvent, MouseEvent, ReactElement, SetStateAction, SVGProps
} from 'react';

// String props
export type StringNum = string | number;

// Span props
export type HTMLAttributesSpanElement = HTMLAttributes<HTMLSpanElement>;

// Div props
export type DivProps = HTMLAttributes<HTMLDivElement>;
export type MouseEventDivElement = MouseEvent<HTMLDivElement>;
export type HtmlDivElementNull = HTMLDivElement | null;
export type KeyboardEventInputTextareaElement = KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>;

// Node props
export type NodeNull = Node | null;
export type TimeoutNull = NodeJS.Timeout | null;

// State props
export type StateProps<T> = Dispatch<SetStateAction<T>>;

// Record props
export type PartialRecordString<R extends PropertyKey> = Partial<Record<R, string>>;
export type RecordNumberString = Record<number, string>;

// Function props
export type BooleanFunction = () => boolean;

// Grid props
export type GridApiNull = GridApi | null;

// MUI props
export type ThemeSx = SxProps<Theme>;

// React element or boolean type
export type ReactElementOrBoolean = ReactElement | boolean;
// SVG props
export type IconSvgProps = SVGProps<SVGSVGElement>;

// Input props
export type ChangeEventInput = ChangeEvent<HTMLInputElement>;
export type ChangeEventInputTextarea = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

// Icon SVG type with optional color prop
export type IconSvg = IconSvgProps & { color?: string }

// React element or undefined type
export type ReactUndefined = ReactElement | undefined;