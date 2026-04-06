import { CaretUpIcon, IconProps } from '@phosphor-icons/react'; // Phosphor dependency
import { createIconString } from '@utils/table.util'; // Utils dependency

/**
 * Renders the Phosphor CaretUp icon into a static HTML string for ag-Grid.
 *
 * @param props - Forwarded Phosphor icon properties.
 * @returns
 */
export default function CaretUpStringIcon(props: IconProps) {
    return createIconString(
        <CaretUpIcon
            weight="fill"
            {...props}
        />
    );
}