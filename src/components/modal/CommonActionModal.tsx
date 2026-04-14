import { ModalButtonProps } from '@components/button/ModalButtons';
import BaseActionModal, { BaseActionModalProps } from '@components/modal/BaseActionModal';
import { HTMLAttributesSpanElement } from '@type/common.type';
import { ActionIconProps } from '@type/common/modal.type';
import { classMerge } from '@utils/css.util';

export interface CommonActionModalProps extends BaseActionModalProps {
    // Action icon props
    actionIconProps?: ActionIconProps;

    // Main content
    mainContent?: HTMLAttributesSpanElement;

    // Modal button props
    modalButtonProps?: ModalButtonProps;

    // Sub content
    subContent?: HTMLAttributesSpanElement;
}

/**
 * CommonActionModal
 *
 * The foundational layout for transactional dialogs. It standardizes the centered
 * icon, typography, and button placement, utilizing an intent prop to manage state colors.
 *
 * @example
 * <CommonActionModal
 *  actionIconProps={resolvedActionIconProps}
 *  modalButtonProps={resolvedModalButtonProps}
 *  {...props}
 * />
 */
export default function CommonActionModal({
    actionIconProps,
    containerClassName,
    mainContent,
    modalButtonProps,
    subContent,
    ...props
}: CommonActionModalProps) {
    const Icon = actionIconProps?.icon; // Icon component reference
    const { iconProps, iconContainerClassName } = actionIconProps ?? {}; // Destructured action icon props
    const resolvedIconContainerClassName = classMerge(
        'h-[5.5rem] p-(--mui-tokens-spacing-6) rounded-(--mui-tokens-radius-full) w-[5.5rem]',
        iconContainerClassName
    ); // Resolved container class for the icon
    const resolvedIconClassName = classMerge(
        'h-[3rem] w-[3rem]',
        iconProps?.className
    ); // Resolved icon class name
    const resolvedMainContentClassname = classMerge(
        'text-(--mui-tokens-color-neutral-900) tw_body_medium_bold',
        mainContent?.className
    ); // Resolved class name for main content
    const resolvedSubContentClassname = classMerge(
        'text-(--mui-tokens-color-neutral-400) tw_body_small',
        subContent?.className
    ); // Resolved class name for sub content
    const resolvedCancelProps = {
        variant: 'outlined' as const,
        ...modalButtonProps?.cancelProps
    }; // Resolved cancel props

    return (
        <BaseActionModal
            containerClassName={
                classMerge(
                    'items-center min-h-[14.5625rem] w-[30.1875rem] pt-(--mui-tokens-spacing-5)',
                    containerClassName
                )
            }
            {...props}
            modalButtonProps={{
                ...modalButtonProps,
                className: 'flex-row-reverse',
                isButtonsFullWidth: modalButtonProps?.isButtonsFullWidth ?? true,
                cancelProps: resolvedCancelProps
            }}
        >
            <div className="flex flex-col gap-var(--mui-tokens-spacing-5) items-center w-full">
                {Icon && (
                    <div className={resolvedIconContainerClassName}>
                        <Icon
                            className={resolvedIconClassName}
                            weight="bold"
                            {...iconProps}
                        />
                    </div>
                )}
                <div className="flex flex-col text-center w-full">
                    {mainContent && (
                        <span
                            {...mainContent}
                            className={resolvedMainContentClassname}
                        >
                            {mainContent.title}
                        </span>
                    )}
                    {subContent && (
                        <span
                            {...subContent}
                            className={resolvedSubContentClassname}
                        >
                            {subContent.title}
                        </span>
                    )}
                </div>
            </div>
        </BaseActionModal>
    );
}