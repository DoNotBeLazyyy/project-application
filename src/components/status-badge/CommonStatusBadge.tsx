import BadgeIcon from '@components/status-badge/BadgeIcon';
import { StatusBadgeProps } from '@type/status-badge.type';
import { Chip } from '@mui/material';
import { forwardRef } from 'react';

/**
 * CommonStatusBadge
 *
 * A reusable status badge from the design system, built on MUI Chip
 * with variant="status". Renders a small colored chip with an icon
 * and label text. Supports four color variants: info (blue),
 * success (green), warning (orange), and error (red). Styling is
 * handled via MUI theme variants scoped to variant="status".
 *
 * @example
 * <CommonStatusBadge
 *  label="Pending"
 *  variant="info"
 * />
 * <CommonStatusBadge
 *  label="2 Issues"
 *  variant="warning"
 * />
 * <CommonStatusBadge
 *  icon={<CustomIcon />}
 *  label="Custom"
 *  variant="error"
 * />
 */
const CommonStatusBadge = forwardRef<HTMLDivElement, StatusBadgeProps>(({
    icon,
    label,
    variant = 'info',
    ...props
}, ref) => {
    return <Chip
        color={variant}
        icon={icon ?? <BadgeIcon variant={variant} />}
        label={label}
        ref={ref}
        size="small"
        variant="status"
        {...props}
    />;
});
CommonStatusBadge.displayName = 'CommonStatusBadge';

export default CommonStatusBadge;