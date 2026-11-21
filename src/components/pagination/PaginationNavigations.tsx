import PaginationInputInfo, { PaginationInputInfoProps } from '@components/pagination/PaginationInputInfo';
import {
    CaretDoubleLeftIcon, CaretDoubleRightIcon, CaretLeftIcon, CaretRightIcon, Icon
} from '@phosphor-icons/react';

export interface NavigationButtonConfig {
    // Whether the button is unavailable (boundary page or loading)
    disabled?: boolean;

    // Callback executed when the button is clicked
    onClick: VoidFunction;
}

interface NavigationButtonProps {
    // Props for the "First Page" navigation button
    firstButtonProps?: NavigationButtonConfig;

    // Props for the "Last Page" navigation button
    lastButtonProps?: NavigationButtonConfig;

    // Props for the "Next Page" navigation button
    nextButtonProps: NavigationButtonConfig;

    // Props for the "Previous Page" navigation button
    prevButtonProps: NavigationButtonConfig;
}

interface PaginationNavigationsProps {
    // Navigation input props
    inputProps?: PaginationInputInfoProps

    // Navigation button props
    navigationButtonProps: NavigationButtonProps
}

interface PaginationArrowButtonProps extends NavigationButtonConfig {
    icon: Icon;
    label: string;
}

/**
 * A real button around a pagination arrow, so it is reachable and usable from the keyboard.
 */
function PaginationArrowButton({
    disabled = false,
    icon: ArrowIcon,
    label,
    onClick
}: PaginationArrowButtonProps) {
    return (
        <button
            aria-label={label}
            className="bg-transparent cursor-pointer disabled:cursor-default disabled:opacity-40 enabled:hover:bg-(--mui-palette-action-hover) flex focus-visible:outline-2 focus-visible:outline-(--mui-palette-primary-main) h-11 items-center justify-center p-(--mui-tokens-spacing-3) rounded-full text-(--mui-tokens-color-neutral-500) w-11"
            disabled={disabled}
            title={label}
            type="button"
            onClick={onClick}
        >
            <ArrowIcon
                className="h-full w-full"
                weight="bold"
            />
        </button>
    );
}

/**
 * PaginationNavigations
 *
 * The first / previous / next / last buttons with the optional page input between them.
 *
 * @example
 * <PaginationNavigations
 *  inputProps={{
 *      inputProps: {
 *          min: 1,
 *          step: 1,
 *      },
 *      totalPages,
 *      value: pageInput,
 *      onBlur: handlePageInputOnBlur,
 *      onChange: handlePageInputChange,
 *      onKeyDown: handlePageInputKeyDown
 *  }}
 *  navigationButtonProps={{
 *      firstButtonProps: handleButtonNavigationProps(isFirstPage, navigateToFirstPage),
 *      prevButtonProps: handleButtonNavigationProps(isFirstPage, navigateToPreviousPage),
 *      nextButtonProps: handleButtonNavigationProps(isLastPage, navigateToNextPage),
 *      lastButtonProps: handleButtonNavigationProps(isLastPage, navigateToLastPage)
 *  }}
 * />
 */
export default function PaginationNavigations({
    inputProps,
    navigationButtonProps
}: PaginationNavigationsProps) {
    const {
        firstButtonProps,
        lastButtonProps,
        nextButtonProps,
        prevButtonProps
    } = navigationButtonProps; // Navigation destructuring

    return (
        <div className="flex items-center min-h-7">
            {firstButtonProps && (
                <PaginationArrowButton
                    {...firstButtonProps}
                    icon={CaretDoubleLeftIcon}
                    label="First page"
                />
            )}
            <PaginationArrowButton
                {...prevButtonProps}
                icon={CaretLeftIcon}
                label="Previous page"
            />
            {inputProps && <PaginationInputInfo {...inputProps} />}
            <PaginationArrowButton
                {...nextButtonProps}
                icon={CaretRightIcon}
                label="Next page"
            />
            {lastButtonProps && (
                <PaginationArrowButton
                    {...lastButtonProps}
                    icon={CaretDoubleRightIcon}
                    label="Last page"
                />
            )}
        </div>
    );
}