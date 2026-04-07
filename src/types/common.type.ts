import { SxProps } from '@mui/material/styles';
import { GridApi, Theme } from 'ag-grid-community';
import {
    Dispatch, HTMLAttributes, MouseEvent, SetStateAction, SVGProps, ReactElement
} from 'react';

// String props
export type StringNum = string | number;

// Div props
export type DivProps = HTMLAttributes<HTMLDivElement>;
export type MouseEventDivElement = MouseEvent<HTMLDivElement>;
export type HtmlDivElementNull = HTMLDivElement | null;

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

// Icon props
export type IconSvgProps = SVGProps<SVGSVGElement>;

// React element or boolean type
export type ReactElementOrBoolean = ReactElement | boolean;