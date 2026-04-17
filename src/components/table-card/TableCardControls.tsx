import CommonButton, { CommonButtonProps } from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import { useTableCardContext } from '@contexts/TableCardContext';
import { InputAdornment } from '@mui/material';
import CardActions, { CardActionsProps } from '@mui/material/CardActions';
import {
    FunnelIcon, FunnelSimpleIcon,
    IconProps,
    MagnifyingGlassIcon, PlusIcon
} from '@phosphor-icons/react';
import { ChangeEventInputTextarea, KeyboardEventDiv } from '@type/common.type';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface TableCardControlsProps extends CardActionsProps {
    // Configuration properties for the create button
    createButtonProps?: CommonButtonProps;

    // Configuration properties for the filter button
    filterButtonProps?: CommonButtonProps;

    // Optional flag to toggle the visibility of the "Create" button
    hasCreate?: boolean;

    // Configuration properties for the sort button
    sortByButtonProps?: CommonButtonProps;
}

/**
 * TableCardControls
 *
 * Renders a set of interactive controls including a search bar, filtering, and sorting buttons.
 * It uses the `TableCardContext` to apply search queries to the grid instance via the Enter key.
 *
 * @example
 * <TableCard>
 *  <TableCardHeader title="Table Card Title">
 *  <TableCardControls hasCreate={true} />
 *  </TableCardHeader>
 *  <TableCardContent
 *  leadingColumnDefs={columnDefs}
 *  rowData={displayedData}
 *  />
 *  <TableCardPagination pagination={pagination} onSetPagination={setPagination} />
 * </TableCard>
 */
export default function TableCardControls({
    createButtonProps,
    filterButtonProps,
    hasCreate,
    sortByButtonProps
}: TableCardControlsProps) {
    const { t } = useTranslation(); // Hook for handling multi-language support and string keys
    const context = useTableCardContext(); // Accesses the shared table state and search logic
    const [searchQuery, setSearchQuery] = useState<string>(''); // Manages the raw text input for the search field
    const commonIconProps: IconProps = {
        size: 20,
        style: {
            color: 'var(--mui-palette-grey-400)'
        },
        weight: 'bold'
    }; // Shared configuration for filter and sort by icons

    /**
     * Handles the search query state updates.
     *
     * @param event - Input change event from the search field.
     */
    function handleSearchQuery(event: ChangeEventInputTextarea) {
        setSearchQuery(event.target.value);
    }

    /**
     * Captures the "Enter" key press to execute the quick filter.
     * It retrieves the AG Grid API from the shared context and applies
     * the local search query to the entire table.
     *
     * @param event - Keyboard event from the input container.
     */
    function handleSearchSubmit(event: KeyboardEventDiv) {
        if (event.key === 'Enter' && context) {
            const contextGridRefCurrent = context.gridRef.current; // Local reference for grid API

            if (contextGridRefCurrent) {
                contextGridRefCurrent.setGridOption(
                    'quickFilterText',
                    searchQuery
                );
            }
        }
    }

    return (
        <CardActions>
            <CommonInput
                className="bg-white border-2"
                isRoundedFull
                placeholder={t('search_placeholder')}
                size="small"
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <MagnifyingGlassIcon
                                    color="var(--mui-palette-grey-900)"
                                    size={20}
                                />
                            </InputAdornment>
                        ),
                        sx: {
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'var(--mui-palette-grey-300)',
                                borderWidth: 2
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderWidth: 2
                            }
                        }
                    }
                }}
                value={searchQuery}
                variant="outlined"
                onChange={handleSearchQuery}
                onKeyDown={handleSearchSubmit}
            />
            <CommonButton
                color="lightGrey"
                size="small"
                startIcon={
                    <FunnelIcon {...commonIconProps} />
                }
                variant="outlined"

                {...filterButtonProps}
            >
                {t('filters')}
            </CommonButton>
            <CommonButton
                color="lightGrey"
                size="small"
                startIcon={
                    <FunnelSimpleIcon {...commonIconProps} />
                }
                variant="outlined"
                {...sortByButtonProps}
            >
                {t('sort_by')}
            </CommonButton>
            {hasCreate && (
                <CommonButton
                    size="small"
                    startIcon={
                        <PlusIcon
                            size={20}
                            style={{
                                color: 'var(--mui-palette-common-white)'
                            }}
                            weight="bold"
                        />
                    }
                    {...createButtonProps}
                >
                    {t('create')}
                </CommonButton>
            )}
        </CardActions>
    );
}