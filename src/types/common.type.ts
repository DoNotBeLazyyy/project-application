import { TableCardContextType } from '@contexts/TableCardContext';
import { SxProps } from '@mui/system';
import { GridApi, Theme } from 'ag-grid-community';
import {
    ChangeEvent, ComponentPropsWithoutRef, Dispatch, HTMLAttributes, KeyboardEvent, MouseEvent, ReactElement, RefObject, SetStateAction, SVGProps
} from 'react';

// String props
export type StringNum = string | number;

// Span props
export type HTMLAttributesSpanElement = HTMLAttributes<HTMLSpanElement>;

export type TimeoutRef = RefObject<number | null>;

// Div props
export type HTMLAttributesDivElement = HTMLAttributes<HTMLDivElement>;
export type MouseEventDivElement = MouseEvent<HTMLDivElement>;
export type HtmlDivElementNull = HTMLDivElement | null;
export type KeyboardEventDivElement = KeyboardEvent<HTMLDivElement>;

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
export type GridRef = RefObject<GridApiNull>;

// Table props
export type TableCardContextTypeNull = TableCardContextType | null;

// MUI props
export type ThemeSx = SxProps<Theme> | undefined;

// React element or boolean type
export type ReactElementOrBoolean = ReactElement | boolean;
// Input change props
export type ChangeEventInputElement = React.ChangeEvent<HTMLInputElement>;

// SVG props
export type IconSvgProps = SVGProps<SVGSVGElement>;
export type MouseEventSvgElement = MouseEvent<SVGSVGElement>;
export type MouseEventButtonElement = MouseEvent<HTMLButtonElement>;
export type KeyboardEventButtonElement = KeyboardEvent<HTMLButtonElement>;

// Input props
export type ChangeEventInput = ChangeEvent<HTMLInputElement>;
export type ChangeEventInputTextarea = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;
export type HtmlInputElementNull = HTMLInputElement | null;

// Icon SVG type with optional color prop
export type IconSvg = IconSvgProps & { color?: string };

// React element or undefined type
export type ReactUndefined = ReactElement | undefined;
// event type for input change events.
export type InputChangeEvent = ChangeEvent<HTMLInputElement>;

export type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type ComponentPropsForm = ComponentPropsWithoutRef<'form'>;