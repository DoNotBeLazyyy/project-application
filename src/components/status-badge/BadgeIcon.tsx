import { BadgeVariant } from '@type/status-badge.type';
import { CheckIcon, DotOutlineIcon, WarningIcon, XCircleIcon } from '@phosphor-icons/react';

interface BadgeIconProps {
    // The badge variant determining which icon to render
    variant: BadgeVariant;
}

/**
 * BadgeIcon
 *
 * Renders the appropriate Phosphor icon for a status badge variant:
 * - error: filled X circle
 * - warning: filled triangle
 * - success: bold checkmark
 * - info: filled dot outline
 *
 * @example
 * <BadgeIcon variant="info" />
 */
export default function BadgeIcon({ variant }: BadgeIconProps) {
    return variant === 'error'
        ? <XCircleIcon weight="fill" />
        : variant === 'warning'
            ? <WarningIcon weight="fill" />
            : variant === 'success'
                ? <CheckIcon weight="bold" />
                : <DotOutlineIcon weight="fill" />;
}