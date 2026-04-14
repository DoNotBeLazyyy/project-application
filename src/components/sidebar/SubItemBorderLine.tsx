import { SideBarItem } from '@type/sidebar.types';
import { useMemo } from 'react';

interface SubItemBorderLineProps {
    // Color for the active segment of the border line.
    activeColor: string;

    // Color for the inactive segments of the border line.
    inactiveColor: string;

    // The list of sub-items to determine the active item and calculate the gradient position.
    items: SideBarItem[];
}

/**
 * SubItemBorderLine
 *
 * Renders a vertical border line used in sidebar accordion sub-items.
 * The line highlights the active item by applying a gradient segment
 * based on the active item's position in the list.
 *
 * @example
 * <SubItemBorderLine
 *     activeColor="#4F46E5"
 *     inactiveColor="#E5E7EB"
 *     items={[
 *         { label: "Item 1" },
 *         { label: "Item 2", isActive: true },
 *         { label: "Item 3" }
 *     ]}
 * />
 */
export default function SubItemBorderLine({
    activeColor,
    inactiveColor,
    items
}: SubItemBorderLineProps) {
    const activeIndex = useMemo(() => (
        items.findIndex((item) => item.isActive)
    ), [items]); // Find the index of the active sub-item.
    const total = items.length; // Total number of sub-items to calculate the gradient segments.
    const { start, end } = useMemo(() => {
        const start = activeIndex >= 0
            ? (activeIndex / total) * 100
            : 0;
        const end = activeIndex >= 0
            ? ((activeIndex + 1) / total) * 100
            : 0;

        return { start, end };
    }, [activeIndex, total]); // Calculate the start and end positions for the gradient based on the active index and total items.

    return <div
        className="absolute left-0 top-0 h-full w-0.5 rounded-full"
        style={{
            background: activeIndex >= 0
                ? `linear-gradient(to bottom, ${inactiveColor} ${start}%, ${activeColor} ${start}%, ${activeColor} ${end}%, ${inactiveColor} ${end}%)`
                : inactiveColor
        }}
    />;
}