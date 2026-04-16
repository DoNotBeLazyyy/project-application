import { ReactNode } from 'react';

export interface DemoRowProps {
    // Demo children
    children: ReactNode;

    // Demo label
    label: string;
}

/**
 * DemoRow
 *
 * A standardized layout row used for component demonstrations, featuring a responsive
 * label and a flexible container for child elements.
 *
 * @example
 * <DemoRow label="Primary Action">
 *  <Button>Submit</Button>
 * </DemoRow>
 */
export default function DemoRow({
    children,
    label
}: DemoRowProps) {
    const containerClasses = 'flex flex-col lg:flex-row gap-4 border-b border-(--mui-tokens-color-neutral-100) py-4 items-start lg:items-center'; // Main row container classes
    const labelClasses = 'text-[14px] font-bold text-(--mui-tokens-color-neutral-700) shrink-0 w-full lg:w-[180px] lg:min-w-[180px]'; // Label typography classes
    const childrenContainerClasses = 'flex flex-row flex-wrap gap-4 items-center'; // Wrapper for children components

    return (
        <div className={containerClasses}>
            <span className={labelClasses}>
                {label}
            </span>
            <div className={childrenContainerClasses}>
                {children}
            </div>
        </div>
    );
}