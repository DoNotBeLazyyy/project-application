import ModalCloseIcon from '@components/icons/ModalCloseIcon';
import CommonInfoTooltip from '@components/tooltip/CommonInfoTooltip';
import { Card, CardHeader, CardHeaderProps, CardProps } from '@mui/material';
import { IconProps } from '@phosphor-icons/react';
import { forwardRef, ReactNode } from 'react';

export interface CommonCardProps extends CardProps {
    // Card header properties
    cardHeaderProps?: CardHeaderProps;

    // Props for the default action icon; if omitted, no default action renders
    defaultActionProps?: IconProps;

    /**
     * Explanatory copy for the header. When set, an info icon sits beside the
     * title and reveals this on hover or click, instead of the copy taking up a
     * permanent subheader line. Pair it with omitting `cardHeaderProps.subheader`.
     */
    infoContent?: ReactNode;
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
 *  infoContent="Everything a student sees on their public record."
 *  variant="outlined"
 * >
 *  <p>Content Body</p>
 * </CommonCard>
 */
const CommonCard = forwardRef<HTMLDivElement, CommonCardProps>(({
    cardHeaderProps,
    children,
    defaultActionProps,
    infoContent,
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
            title={
                infoContent
                    ? (
                        <span>
                            {cardHeaderProps.title}
                            <span className="inline-flex align-middle ml-1.5 whitespace-nowrap">
                                <CommonInfoTooltip content={infoContent} />
                            </span>
                        </span>
                    )
                    : cardHeaderProps.title
            }
        />}
        {children}
    </Card>;
});
CommonCard.displayName = 'CommonCard';

export default CommonCard;