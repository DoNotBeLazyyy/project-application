import { GridApi } from 'ag-grid-community';
import {
    ChangeEvent, Dispatch, KeyboardEvent, MouseEvent, SetStateAction, SVGProps
} from 'react';

// String props
export type StringNum = string | number;

// Div props
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

// Input change props
export type ChangeEventInputElement = React.ChangeEvent<HTMLInputElement>;

// Calendar props
export type AlignType = 'LEFT' | 'CENTER' | 'RIGHT';
export type SizeType = 'BIG' | 'SMALL';
export type CalendarTitlePosition = 'RIGHT' | 'MIDDLE' | 'LEFT';

// SVG props
export type IconSvgProps = SVGProps<SVGSVGElement>;

// Input props
export type ChangeEventInput = ChangeEvent<HTMLInputElement>;
export type ChangeEventInputTextarea = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;