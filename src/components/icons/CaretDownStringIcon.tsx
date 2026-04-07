import { CaretDownIcon, IconProps } from '@phosphor-icons/react'; // Phosphor dependency
import { createIconString } from '@utils/table.util'; // Utils dependency

/**
 * Renders the Phosphor CaretDown icon into a static HTML string for ag-Grid.
 *
 * @param props - Forwarded Phosphor icon properties.
 * @returns
 */
export default function CaretDownStringIcon(props: IconProps) {
    return createIconString(
        <CaretDownIcon
            weight="fill"
            {...props}
        />
    );
}