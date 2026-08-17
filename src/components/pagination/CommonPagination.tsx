import PaginationInfo from '@components/pagination/PaginationInfo';
import PaginationNavigations from '@components/pagination/PaginationNavigations';
import PaginationSelect from '@components/pagination/PaginationSelect';
import { SelectChangeEvent } from '@mui/material';
import { useLoadingStore } from '@stores/loading.store';
import {
    BooleanFunction, ChangeEventInputTextarea, KeyboardEventDivElement, StateProps, StringNum
} from '@type/common.type';
import { PaginationData } from '@type/table.type';
import { classMerge } from '@utils/css.util';
import { calculateRowRange, changePagination, clampPage } from '@utils/pagination.util';
import { HTMLAttributes, useEffect, useState } from 'react';

export interface CommonPaginationProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
    // Whether to show jump to first page button
    hasFirstButton?: boolean;

    // Whether to show jump to last page button
    hasLastButton?: boolean;

    // Whether to show the navigation buttons and input
    hasNavigationInput?: boolean;

    // Whether to show the row range info
    hasPaginationRowsInfo?: boolean;

    // Whether to show the rows per page select
    hasPaginationSelect?: boolean;

    // Whether currentPage input is committed on blur or not
    isPageInputCommitOnBlur?: boolean;

    // Navigation container additional class name
    navigationContainerClassName?: string;

    // Pagination data containing current state
    pagination: PaginationData;

    // Available options for rows per currentPage dropdown
    rowsPerPageOptions?: number[];

    // Callback triggered to confirm navigation to a given currentPage
    onConfirmNavigation?: BooleanFunction;

    // State to update pagination
    onSetPagination: StateProps<PaginationData>;
}

/**
 * CommonPagination
 *
 * A fully controlled pagination component. It allows free numeric input
 * and enforces boundary clamping (1 to totalPages) on commit.
 *
 * @example
 * <CommonPagination
 *  pagination={pagination}
 *  onSetPagination={setPagination}
 * />
 */
export default function CommonPagination({
    className,
    hasFirstButton = true,
    hasLastButton = true,
    hasNavigationInput = true,
    hasPaginationRowsInfo = true,
    hasPaginationSelect = true,
    isPageInputCommitOnBlur = true,
    navigationContainerClassName,
    pagination,
    rowsPerPageOptions = [10, 25, 50, 100],
    onConfirmNavigation,
    onSetPagination,
    ...props
}: CommonPaginationProps) {
    const isLoading = useLoadingStore((state) => state.isLoading);
    const [pageInput, setPageInput] = useState<StringNum>(1); // Local input state
    const {
        currentPage = 1,
        rowsPerPage = rowsPerPageOptions[0],
        totalElements = 0,
        totalPages = 0
    } = pagination; // Destructured pagination data
    const resolvedRowsPerPageOptions = rowsPerPageOptions.includes(rowsPerPage)
        ? rowsPerPageOptions
        : [...rowsPerPageOptions, rowsPerPage].sort((a, b) => a - b); // Keeps the select value in range
    const { end, start } = calculateRowRange(currentPage, rowsPerPage, totalElements); // JIT range calculation
    const isFirstPage = currentPage <= 1; // JIT logic for boundary check
    const isLastPage = currentPage >= totalPages; // JIT logic for boundary check

    useEffect(() => {
        setPageInput(currentPage);
    }, [currentPage]);

    /**
     * Applies a currentPage change after clamping and confirmation.
     *
     * @param nextPage - Next 1-indexed currentPage.
     * @param newRowsPerPage - Optional updated row count per currentPage.
     */
    function applyPageChange(nextPage: number, newRowsPerPage?: number) {
        if (onConfirmNavigation && !onConfirmNavigation()) {
            return;
        }

        changePagination({
            currentPage: clampPage(nextPage, totalPages),
            rowsPerPage: newRowsPerPage ?? rowsPerPage
        }, onSetPagination );
    }

    /**
     * Handles rows per currentPage changes.
     *
     * @param event - MUI select change event.
     */
    function handleRowsPerPageChange(event: SelectChangeEvent<number>) {
        const newRowsPerPage = Number(event.target.value);

        if (!Number.isNaN(newRowsPerPage)) {
            applyPageChange(1, newRowsPerPage);
        }
    }

    /**
     * Handles direct currentPage input changes. Allows free typing to support dynamic width.
     *
     * @param event - Input change event.
     */
    function handlePageInputChange(event: ChangeEventInputTextarea) {
        const nextValue = event.target.value;

        if (nextValue === '') {
            setPageInput('');
        }
        else {
            const numericValue = Number(nextValue);

            if (!Number.isNaN(numericValue)) {
                setPageInput(numericValue);
            }
        }
    }

    /**
     * Commits the currentPage input value, enforcing boundary clamping and syncing state.
     */
    function commitPageInput() {
        const resolvedInputPage = Number(pageInput);

        if (!Number.isNaN(resolvedInputPage) && pageInput !== '') {
            const clampedPage = clampPage(resolvedInputPage, totalPages);

            applyPageChange(clampedPage);
            setPageInput(clampedPage);
        }
        else {
            setPageInput(currentPage);
        }
    }

    /**
     * Handles Enter key submission for the currentPage input.
     *
     * @param event - Keyboard event from the input element.
     */
    function handlePageInputKeyDown(event: KeyboardEventDivElement) {
        if (event.key === 'Enter') {
            commitPageInput();
        }
    }

    /**
     * Handles conditional currentPage commit on blur.
     */
    function handlePageInputOnBlur() {
        if (isPageInputCommitOnBlur) {
            commitPageInput();
        }
        else {
            setPageInput(currentPage);
        }
    }

    /**
     * Navigates to the first page.
     */
    function navigateToFirstPage() {
        applyPageChange(1);
    }

    /**
     * Navigates to the previous page.
     */
    function navigateToPreviousPage() {
        applyPageChange(currentPage - 1);
    }

    /**
     * Navigates to the next page.
     */
    function navigateToNextPage() {
        applyPageChange(currentPage + 1);
    }

    /**
     * Navigates to the last page.
     */
    function navigateToLastPage() {
        applyPageChange(totalPages);
    }

    /**
     * Generates styling properties for navigation buttons based on their active state.
     *
     * @param condition - Determines if the button should appear disabled.
     * @param onClick - Callback executed when the button is clicked.
     * @returns
     */
    function handleButtonNavigationProps(condition: boolean, onClick: VoidFunction) {
        return {
            className: 'h-11 p-(--mui-tokens-spacing-3) text-(--mui-tokens-color-neutral-500) w-11',
            style: {
                cursor: isLoading || condition
                    ? 'default'
                    : 'pointer',
                opacity: isLoading || condition
                    ? 0.4
                    : 1
            },
            weight: 'bold' as const,
            onClick: isLoading || condition
                ? undefined
                : onClick
        };
    }

    if (!totalPages) {
        return null;
    }

    return (
        <div
            className={
                classMerge(
                    'flex flex-wrap gap-x-4 gap-y-2 items-center justify-center relative w-full',
                    className
                )
            }
            {...props}
        >
            <div
                className={
                    classMerge(
                        'flex flex-wrap gap-(--mui-tokens-spacing-5) items-center justify-center',
                        navigationContainerClassName
                    )
                }
            >
                <PaginationNavigations
                    inputProps={
                        hasNavigationInput
                            ? {
                                totalPages,
                                inputProps: {
                                    inputProps: {
                                        min: 1,
                                        step: 1
                                    },
                                    value: pageInput,
                                    disabled: isLoading,
                                    onBlur: handlePageInputOnBlur,
                                    onChange: handlePageInputChange,
                                    onKeyDown: handlePageInputKeyDown
                                }
                            }
                            : undefined
                    }
                    navigationButtonProps={{
                        firstButtonProps: hasFirstButton
                            ? handleButtonNavigationProps(isFirstPage, navigateToFirstPage)
                            : undefined,
                        lastButtonProps: hasLastButton
                            ? handleButtonNavigationProps(isLastPage, navigateToLastPage)
                            : undefined,
                        nextButtonProps: handleButtonNavigationProps(isLastPage, navigateToNextPage),
                        prevButtonProps: handleButtonNavigationProps(isFirstPage, navigateToPreviousPage)
                    }}
                />
                {hasPaginationSelect && <PaginationSelect
                    disabled={isLoading}
                    options={resolvedRowsPerPageOptions}
                    value={rowsPerPage}
                    onChange={handleRowsPerPageChange}
                />}
            </div>
            {hasPaginationRowsInfo && <PaginationInfo
                endRow={end}
                startRow={start}
                totalElements={totalElements}
            />}
        </div>
    );
}