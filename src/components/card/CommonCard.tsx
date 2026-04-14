import ModalCloseIcon from '@components/icons/ModalCloseIcon';
import { Card, CardHeader, CardHeaderProps, CardProps } from '@mui/material';
import { IconProps } from '@phosphor-icons/react';
import { forwardRef } from 'react';

export interface CommonCardProps extends CardProps {
    // Card header properties
    cardHeaderProps?: CardHeaderProps;

    // Props for the default action icon; if omitted, no default action renders
    defaultActionProps?: IconProps;
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
    defaultActionProps,
    children,
    ...props
}, ref) => {
    return <Card
        {...props}
        ref={ref}
    >
        {cardHeaderProps && <CardHeader
            {...cardHeaderProps}
            action={
                defaultActionProps
                    ? <ModalCloseIcon {...defaultActionProps} />
                    : cardHeaderProps?.action
            }
        />}
        {children}
    </Card>;
});
CommonCard.displayName = 'CommonCard';

export default CommonCard;