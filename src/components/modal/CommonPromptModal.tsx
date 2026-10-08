import CommonActionModal, { CommonActionModalProps } from '@components/modal/CommonActionModal';
import { HTMLAttributesSpanElement } from '@type/common.type';
import { ActionIconProps } from '@type/common/modal.type';
import { classMerge } from '@utils/css.util';
import { normalizeSx } from '@utils/theme.util';

export interface CommonPromptModalProps extends CommonActionModalProps {
    // Action icon props
    actionIconProps?: ActionIconProps;

    // Main content
    mainContent?: HTMLAttributesSpanElement;

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
 *  formButtonsProps={resolvedFormButtonsProps}
 *  {...props}
 * />
 */
export default function CommonPromptModal({
    actionIconProps,
    containerClassName,
    mainContent,
    formButtonsProps,
    subContent,
    ...props
}: CommonPromptModalProps) {
    const { icon: Icon, iconContainerClassName, iconProps } = actionIconProps ?? {}; // Destructured icon configuration for the action trigger
    const { cancelProps, className, isButtonsFullWidth = true } = formButtonsProps ?? {}; // Destructured button properties

    return (
        <CommonActionModal
            {...props}
            fullScreen={props.fullScreen ?? false}
            containerClassName={
                classMerge(
                    'items-center max-w-full w-full sm:w-[30.1875rem] min-h-[14.5625rem] pt-(--mui-tokens-spacing-5) justify-center',
                    containerClassName
                )
            }
            formButtonsProps={{
                ...formButtonsProps,
                className: classMerge(
                    'flex-col-reverse sm:flex-row',
                    className
                ),
                isButtonsFullWidth,
                cancelProps: {
                    color: 'secondary',
                    variant: 'outlined',
                    ...cancelProps
                }
            }}
            sx={[
                {
                    '& .MuiDialog-paper:not(.MuiDialog-paperFullScreen)': {
                        borderRadius: 'var(--mui-tokens-radius-lg)',
                        margin: { xs: '1rem', sm: 'auto' },
                        maxWidth: { xs: 'calc(100% - 2rem)', sm: '30.1875rem' },
                        width: { xs: 'calc(100% - 2rem)', sm: '30.1875rem' }
                    }
                },
                ...normalizeSx(props.sx)
            ]}
        >
            <div className="flex flex-col gap-(--mui-tokens-spacing-5) items-center w-full">
                {Icon && (
                    <div
                        className={
                            classMerge(
                                'h-22 p-(--mui-tokens-spacing-6) rounded-(--mui-tokens-radius-full) w-22',
                                iconContainerClassName
                            )
                        }
                    >
                        <Icon
                            {...iconProps}
                            className={
                                classMerge(
                                    'h-12 w-12',
                                    iconProps?.className
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
        </CommonActionModal>
    );
}