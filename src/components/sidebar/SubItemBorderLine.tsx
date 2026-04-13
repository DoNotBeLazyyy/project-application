import { SideBarItem } from '@type/sidebar.types';

interface SubItemBorderLineProps {
    // Color for the active segment of the border line.
    activeColor: string;

    // Color for the inactive segments of the border line.
    inactiveColor: string;

    // The list of sub-items to determine the active item and calculate the gradient position.
    items: SideBarItem[];
}

/**
 * Renders a border line for the active sub-item within the accordion group.
 */
export default function SubItemBorderLine({
    activeColor,
    inactiveColor,
    items
}: SubItemBorderLineProps) {
    const activeIndex = items.findIndex((item) => item.isActive); // Find the index of the active sub-item.
    const total = items.length; // Total number of sub-items to calculate the gradient segments.
    const start = activeIndex >= 0
        ? (activeIndex / total) * 100
        : 0; // Calculate the start position for the gradient based on the active index and total items.
    const end = activeIndex >= 0
        ? ((activeIndex + 1) / total) * 100
        : 0; // Calculate the end position for the gradient based on the active index and total items.
    const hasActiveBackground = activeIndex >= 0; // check if there is an active tab

    return (
        <div
            className="absolute left-0 top-0 h-full w-0.5 rounded-full"
            style={{
                background: hasActiveBackground
                    ? `linear-gradient(to bottom, ${inactiveColor} ${start}%, ${activeColor} ${start}%, ${activeColor} ${end}%, ${inactiveColor} ${end}%)`
                    : inactiveColor
            }}
        />
    );
}