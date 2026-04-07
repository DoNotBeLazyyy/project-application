import { MouseEventDivElement, StateProps } from '@type/common.type';
import { PaginationData } from '@type/table.type';
import { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Converts a React component into a static HTML string.
 * This is highly reusable for third-party vanilla JS libraries that require string-based HTML.
 *
 * @param icon - The React element to be rendered into an HTML string.
 * @returns
 */
export function createIconString(icon: ReactElement) {
    return renderToStaticMarkup(icon);
}

/**
 * Prevents the default browser context menu from appearing if the click target is within a grid row.
 *
 * @param event The mouse event triggered by a right-click interaction.
 */
export function preventDefaultContextMenu(event: MouseEventDivElement) {
    if ((event.target as HTMLElement).closest('.ag-row')) {
        event.preventDefault();
    }
}

/**
 * Updates the pagination state in the table
 *
 * @param values value to change
 * @param setPagination state setter function for the pagination data
 */
export function changePagination(
    values: Partial<PaginationData>,
    setPagination: StateProps<PaginationData>
) {
    setPagination((prev) => ({
        ...prev,
        ...values

    }));
}