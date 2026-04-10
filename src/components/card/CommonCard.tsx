import CommonCardHeader, { CommonCardHeaderProps } from '@components/card/CardHeader';
import { Card, CardProps } from '@mui/material';
import { forwardRef } from 'react';

export interface CommonCardProps extends CardProps {
    // Card header properties
    cardHeaderProps?: CommonCardHeaderProps;
}

/**
 * CommonCard
 *
 * A reusable layout shell. It delegates header logic to CommonCardHeader
 * and renders children as the primary content body.
 *
 * @example
 * <CommonCard
 *  cardHeaderProps={{ title: 'Profile' }}
 *  variant="outlined"
 * >
 *  <p>Content Body</p>
 * </CommonCard>
 */
const CommonCard = forwardRef<HTMLDivElement, CommonCardProps>(({
    cardHeaderProps,
    children,
    ...props
}, ref) => {
    return (
        <Card
            ref={ref}
            {...props}
        >
            {cardHeaderProps && <CommonCardHeader {...cardHeaderProps} />}
            {children}
        </Card>
    );
});
CommonCard.displayName = 'CommonCard';

export default CommonCard;