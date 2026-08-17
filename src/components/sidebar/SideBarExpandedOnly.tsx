import { useSideBarContext } from '@contexts/SideBarContext';
import { ReactNode } from 'react';

interface SideBarExpandedOnlyProps {
    // Content rendered only while the sidebar is expanded
    children: ReactNode;
}

/**
 * SideBarExpandedOnly
 *
 * Hides its children while the sidebar is collapsed to the icon rail. Use it for
 * sidebar content that has no meaningful icon-only representation, such as the
 * role switcher.
 *
 * @example
 * <SideBarExpandedOnly>
 *     <CommonSelect options={roleOptions} />
 * </SideBarExpandedOnly>
 */
export default function SideBarExpandedOnly({ children }: SideBarExpandedOnlyProps) {
    const { isExpanded } = useSideBarContext();

    if (!isExpanded) {
        return null;
    }

    return <>{children}</>;
}