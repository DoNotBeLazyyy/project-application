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
 * @param {CardHeaderProps} props - The component props.
 * @param {ReactNode} [props.children] - Accepts TableCardControls to be placed in the action slot.
 * @param {ReactNode} [props.title] - The main title text or element.
 * @param {ReactNode} [props.subheader] - The subheader text or element.
 *
 * @example
 * <TableCard>
 * <TableCardHeader
 * title="Table Card Title"
 * subheader="Table Card Subheader"
 * >
 * <TableCardControls />
 * </TableCardHeader>
 * <TableCardContent rowData={data} />
 * </TableCard>
 */
export default function TableCardHeader({
    children,
    title,
    subheader,
    ...props
}: CardHeaderProps) {
    const childrenArray = Children.toArray(children);
    const controls = childrenArray.find(
        (child) => isValidElement(child) && child.type === TableCardControls
    );

    return <CardHeader
        action={controls}
        subheader={subheader}
        title={title}
        {...props}
    />;
}