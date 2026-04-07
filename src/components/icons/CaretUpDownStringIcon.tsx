import { CaretUpDownIcon, IconProps } from '@phosphor-icons/react'; // Phosphor dependency
import { createIconString } from '@utils/table.util'; // Utils dependency

/**
 * Renders the Phosphor CaretUpDown icon into a static HTML string for ag-Grid.
 *
 * @param props - Forwarded Phosphor icon properties.
 * @returns
 */
export default function CaretUpDownStringIcon(props: IconProps) {
    return createIconString(
        <CaretUpDownIcon
            weight="fill"
            {...props}
        />
    );
}