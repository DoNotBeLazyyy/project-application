import { createContext, useContext } from 'react';

export interface SideBarContextType {
    isExpanded: boolean;
}

export const SideBarContext = createContext<SideBarContextType>({ isExpanded: true });

/**
 * useSideBarContext
 *
 * Provides the current sidebar expansion state to nested sidebar sub-components
 * so they can render an icon-only rail when collapsed.
 *
 * @example
 * const { isExpanded } = useSideBarContext();
 */
export function useSideBarContext() {
    return useContext(SideBarContext);
}