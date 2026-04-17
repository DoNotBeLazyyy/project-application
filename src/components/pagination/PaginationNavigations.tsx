import PaginationInputInfo, { PaginationInputInfoProps } from '@components/pagination/PaginationInputInfo';
import {
    CaretDoubleLeftIcon, CaretDoubleRightIcon, CaretLeftIcon, CaretRightIcon, IconProps
} from '@phosphor-icons/react';

interface NavigationButtonProps {
    // Props for the "First Page" navigation button
    firstButtonProps: IconProps;

    // Props for the "Last Page" navigation button
    lastButtonProps: IconProps;

    // Props for the "Next Page" navigation button
    nextButtonProps: IconProps;

    // Props for the "Previous Page" navigation button
    prevButtonProps: IconProps;
}

interface PaginationNavigationsProps {
    // Navigation input props
    inputProps: PaginationInputInfoProps

    // Navigation button props
    navigationButtonProps: NavigationButtonProps
}

/**
 * PaginationNavigations
 *
 * A controlled input component for direct page navigation.
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
        prevButtonProps,
        nextButtonProps,
        lastButtonProps,
        firstButtonProps
    } = navigationButtonProps; // Navigation destructuring

    return (
        <div className="flex h-7 items-center">
            <CaretDoubleLeftIcon {...firstButtonProps} />
            <CaretLeftIcon {...prevButtonProps} />
            <PaginationInputInfo {...inputProps} />
            <CaretRightIcon {...nextButtonProps} />
            <CaretDoubleRightIcon {...lastButtonProps} />
        </div>
    );
}