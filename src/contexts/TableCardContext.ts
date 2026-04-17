import { GridRef, TableCardContextTypeNull } from '@type/common.type';
import { createContext, useContext } from 'react';

export interface TableCardContextType {
    // A reference to the AG Grid API instance.
    gridRef: GridRef;
}

export const TableCardContext = createContext<TableCardContextTypeNull>(null); // Shares search state and grid API across TableCard sub-components.

/**
 * useTableCardContext
 *
 * A hook that provides access to the TableCardContext, allowing sub-components
 * to consume shared AG Grid API references.
 *
 * @example
 * const { gridApi } = useTableCardContext();
 */
export function useTableCardContext() {
    return useContext(TableCardContext);
}