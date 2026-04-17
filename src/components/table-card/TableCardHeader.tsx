import TableCardControls from '@components/table-card/TableCardControls';
import { CardHeader, CardHeaderProps } from '@mui/material';
import { Children, isValidElement } from 'react';

/**
 * TableCardHeader
 *
 * A specialized wrapper for the Material UI CardHeader. It automatically
 * detects if TableCardControls is passed as a child and assigns it to
 * the 'action' slot for consistent positioning in the top-right corner.
 *
 * @example
 * <TableCard>
 *  <TableCardHeader
 *      title="Table Card Title"
 *      subheader="Table Card Subheader"
 *  >
 *  <TableCardControls />
 *  </TableCardHeader>
 *  <TableCardContent rowData={data} />
 * </TableCard>
 */
export default function TableCardHeader({
    children,
    ...props
}: CardHeaderProps) {
    const controls = Children
        .toArray(children)
        .find((child) => isValidElement(child) && child.type === TableCardControls); // Logic to extract TableCardControls

    return <CardHeader
        action={controls}
        {...props}
    />;
}