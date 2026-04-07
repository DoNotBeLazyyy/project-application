import {
    CaretDoubleLeftIcon, CaretDoubleRightIcon, CaretDownIcon, CaretLeftIcon, CaretRightIcon
} from '@phosphor-icons/react';
import {
    BooleanFunction, ChangeEventInputTextarea, KeyboardEventDiv, StateProps, StringNum
} from '@type/common.type';
import { PaginationData } from '@type/table.type';
import { classMerge } from '@utils/css.util';
import { ChangeEvent, HTMLAttributes, useEffect, useState } from 'react';

export interface CommonPaginationProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
    // Whether currentPage input is committed on blur or not
    isPageInputCommitOnBlur?: boolean;

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
 * A fully controlled pagination component that emits state changes to the parent
 * without modifying the URL directly.
 *
 * @example
 * <CommonPagination
 *  pagination={pagination}
 *  onSetPagination={setPagination}
 * />
 */
// TODO: Update when input and select component is ready
export default function CommonPagination({
    className,
    isPageInputCommitOnBlur = true,
    pagination,
    rowsPerPageOptions = [10, 25, 50, 100],
    onConfirmNavigation,
    onSetPagination,
    ...props
}: CommonPaginationProps) {
    const {
        currentPage = 1,
        rowsPerPage = rowsPerPageOptions[0],
        totalElements = 0,
        totalPages = 0
    } = pagination; // Pagination data destructuring
    const [pageInput, setPageInput] = useState<StringNum>(currentPage); // Local state for direct page input
    const startRow = totalElements === 0
        ? 0
        : (currentPage - 1) * rowsPerPage + 1; // Starting item index for current page
    const endRow = totalElements === 0
        ? 0
        : Math.min(currentPage * rowsPerPage, totalElements); // Ending item index for current page
    const isFirstPage = currentPage <= 1; // Flag indicating if the current page is the first page
    const isLastPage = currentPage >= totalPages; // Flag indicating if the current page is the last page

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

        onSetPagination((prev) => ({
            ...prev,
            currentPage: Math.min(Math.max(nextPage, 1), Math.max(1, totalPages)),
            rowsPerPage: newRowsPerPage ?? rowsPerPage
        }));
    }

    /**
     * Handles rows per currentPage changes and resets the current view to the first currentPage.
     *
     * @param event - The React change event from the select element.
     */
    function handleRowsPerPageChange(event: ChangeEvent<HTMLSelectElement>) {
        const newRowsPerPage = Number(event.target.value);

        if (!Number.isNaN(newRowsPerPage)) {
            applyPageChange(1, newRowsPerPage);
        }
    }

    /**
     * Handles direct currentPage input changes.
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

            if (!Number.isNaN(numericValue) && numericValue <= totalPages) {
                setPageInput(numericValue);
            }
        }
    }

    /**
     * Commits the currentPage input value.
     */
    function commitPageInput() {
        const resolvedInputPage = Number(pageInput);

        if (!Number.isNaN(resolvedInputPage) && resolvedInputPage >= 1) {
            applyPageChange(resolvedInputPage);
        }
        else {
            setPageInput(currentPage);
        }
    }

    /**
     * Handles Enter key submission for the currentPage input.
     *
     * @param event - Keyboard event.
     */
    function handlePageInputKeyDown(event: KeyboardEventDiv) {
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
     * Navigates to the first currentPage if not already active.
     */
    function navigateToFirstPage() {
        applyPageChange(1);
    }

    /**
     * Navigates to the previous currentPage if not on the first currentPage.
     */
    function navigateToPreviousPage() {
        applyPageChange(currentPage - 1);
    }

    /**
     * Navigates to the next currentPage if not on the last currentPage.
     */
    function navigateToNextPage() {
        applyPageChange(currentPage + 1);
    }

    /**
     * Navigates to the final currentPage of results.
     */
    function navigateToLastPage() {
        applyPageChange(Math.max(1, totalPages));
    }

    /**
     * Generates styling properties for navigation buttons based on their active state.
     *
     * @param condition - The boolean condition that determines if the button should appear disabled.
     * @returns
     */
    function handleButtonNavigationProps(condition: boolean, onClick: VoidFunction) {
        return {
            className: 'h-[2.25rem] p-[var(--mui-tokens-spacing-3)] text-[var(--mui-tokens-color-neutral-500)] w-[2.25rem]',
            style: {
                cursor: condition
                    ? 'default'
                    : 'pointer',
                opacity: condition
                    ? 0.4
                    : 1
            },
            weight: 'bold' as const,
            onClick: condition
                ? undefined
                : onClick
        };
    }

    return !totalPages
        ? null
        : (
            <div
                className={classMerge('flex justify-center relative w-full', className)}
                {...props}
            >
                <div className="flex gap-[var(--mui-tokens-spacing-5)]">
                    <div className="flex h-[1.75rem] items-center">
                        <CaretDoubleLeftIcon {...handleButtonNavigationProps(isFirstPage, navigateToFirstPage)} />
                        <CaretLeftIcon {...handleButtonNavigationProps(isFirstPage, navigateToPreviousPage)} />
                        <div className="flex gap-[var(--mui-tokens-spacing-4)] items-center min-w-max">
                            {/* TODO: Update input when the custom components are ready */}
                            <input
                                className="[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [appearance:textfield] bg-[var(--mui-tokens-color-common-white)] border border-[var(--mui-tokens-color-neutral-300)] flex-none focus:outline-none h-[1.75rem] inline-flex items-center justify-center leading-[var(--mui-tokens-lineHeight-nm)] p-1 rounded-[var(--mui-tokens-radius-sm)] text-[var(--mui-tokens-fontSize-sm)] text-center w-auto"
                                max={totalPages}
                                min={1}
                                step={1}
                                type="number"
                                value={pageInput}
                                onBlur={handlePageInputOnBlur}
                                onChange={handlePageInputChange}
                                onKeyDown={handlePageInputKeyDown}
                            />
                            <div className="flex gap-[var(--mui-tokens-spacing-3)] items-center leading-[var(--mui-tokens-lineHeight-sm)] text-[var(--mui-tokens-color-neutral-900)] tw_body_small">
                                {/* TODO: Update label to use locales */}
                                <span>of</span>
                                <span>{totalPages}</span>
                            </div>
                        </div>
                        <CaretRightIcon {...handleButtonNavigationProps(isLastPage, navigateToNextPage)} />
                        <CaretDoubleRightIcon {...handleButtonNavigationProps(isLastPage, navigateToLastPage)} />
                    </div>
                    <div className="flex-none relative">
                        {/* TODO: Update select when the custom components are ready */}
                        <select
                            className="appearance-none bg-[var(--mui-tokens-color-common-white)] border border-[var(--mui-tokens-color-neutral-300)] cursor-pointer flex-none focus:outline-none h-[1.75rem] inline-flex items-center justify-center leading-[var(--mui-tokens-lineHeight-sm)] p-1 pl-[var(--mui-tokens-spacing-2)] pr-[var(--mui-tokens-spacing-7)] rounded-[var(--mui-tokens-radius-sm)] text-[var(--mui-tokens-fontSize-sm)] text-center w-auto"
                            value={rowsPerPage}
                            onChange={handleRowsPerPageChange}
                        >
                            {rowsPerPageOptions.map((option) => (
                                <option
                                    key={option}
                                    value={option}
                                >
                                    {/* TODO: Update label to use locales */}
                                    {`${option} / page`}
                                </option>
                            ))}
                        </select>
                        <CaretDownIcon
                            aria-hidden="true"
                            className="absolute pointer-events-none right-[var(--mui-tokens-spacing-2)] text-[var(--mui-tokens-color-neutral-700)] top-[50%] translate-y-[-50%]"
                            size={12}
                        />
                    </div>
                </div>
                <div className="absolute min-w-max right-0 text-[var(--mui-tokens-color-neutral-600)] top-[50%] translate-y-[-50%] tw_body_small">
                    {/* TODO: Update label to use locales */}
                    <span>Showing rows </span>
                    <span>{startRow}-{endRow} </span>
                    <span>of {totalElements}</span>
                </div>
            </div>
        );
}