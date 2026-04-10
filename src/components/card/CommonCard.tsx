import { Card, CardHeader, CardHeaderProps, CardProps } from '@mui/material';
import { forwardRef } from 'react';

export interface CommonCardProps extends CardProps {
    // Card header properties
    cardHeaderProps?: CardHeaderProps;
}

/**
 * CommonCard
 *
 * A reusable MUI Card component. It maps sizing configurations to the native
 * `variant` prop to leverage centralized theme styling without DOM leaks.
 *
 * @example
 * <CommonCard
 *  cardHeaderProps={{ title: 'Settings' }}
 *  variant="small"
 * >
 *  <p>Content</p>
 * </CommonCard>
 */
const CommonCard = forwardRef<HTMLDivElement, CommonCardProps>(({
    cardHeaderProps,
    children,
    variant = 'medium',
    ...props
}, ref) => {
    return (
        <Card
            ref={ref}
            variant={variant}
            {...props}
        >
            {cardHeaderProps && <CardHeader {...cardHeaderProps} />}
            {children}
        </Card>
    );
});
CommonCard.displayName = 'CommonCard';

export default CommonCard;