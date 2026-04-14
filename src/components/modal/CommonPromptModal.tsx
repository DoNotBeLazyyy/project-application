import { ModalButtonProps } from '@components/button/ModalButtons';
import BaseActionModal, { BaseActionModalProps } from '@components/modal/BaseActionModal';
import { HTMLAttributesSpanElement } from '@type/common.type';
import { ActionIconProps } from '@type/common/modal.type';
import { classMerge } from '@utils/css.util';

export interface CommonPromptModalProps extends BaseActionModalProps {
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
 * CommonPromptModal
 *
 * The foundational layout for transactional dialogs. It standardizes the centered
 * icon, typography, and button placement, utilizing an intent prop to manage state colors.
 *
 * @example
 * <CommonPromptModal
 *  actionIconProps={resolvedActionIconProps}
 *  modalButtonProps={resolvedModalButtonProps}
 *  {...props}
 * />
 */
export default function CommonPromptModal({
    actionIconProps,
    containerClassName,
    mainContent,
    modalButtonProps,
    subContent,
    ...props
}: CommonPromptModalProps) {
    return (
        <BaseActionModal
            {...props}
            containerClassName={
                classMerge(
                    'items-center min-h-[14.5625rem] w-[30.1875rem] pt-(--mui-tokens-spacing-5)',
                    containerClassName
                )
            }
            modalButtonProps={{
                ...modalButtonProps,
                className: 'flex-row-reverse',
                isButtonsFullWidth: modalButtonProps?.isButtonsFullWidth ?? true,
                cancelProps: {
                    variant: 'outlined' as const,
                    ...modalButtonProps?.cancelProps
                }
            }}
        >
            <div className="flex flex-col gap-(--mui-tokens-spacing-5) items-center w-full">
                {actionIconProps?.icon && (
                    <div
                        className={
                            classMerge(
                                'h-22 p-(--mui-tokens-spacing-6) rounded-(--mui-tokens-radius-full) w-22',
                                actionIconProps.iconContainerClassName
                            )
                        }
                    >
                        <actionIconProps.icon
                            {...actionIconProps.iconProps}
                            className={
                                classMerge(
                                    'h-12 w-12',
                                    actionIconProps.iconProps?.className
                                )
                            }
                            weight="bold"
                        />
                    </div>
                )}
                <div className="flex flex-col text-center w-full">
                    {mainContent && (
                        <span
                            {...mainContent}
                            className={
                                classMerge(
                                    'text-(--mui-tokens-color-neutral-900) tw_body_medium_bold',
                                    mainContent.className
                                )
                            }
                        >
                            {mainContent.title}
                        </span>
                    )}
                    {subContent && (
                        <span
                            {...subContent}
                            className={
                                classMerge(
                                    'text-(--mui-tokens-color-neutral-400) tw_body_small',
                                    subContent.className
                                )
                            }
                        >
                            {subContent.title}
                        </span>
                    )}
                </div>
            </div>
        </BaseActionModal>
    );
}