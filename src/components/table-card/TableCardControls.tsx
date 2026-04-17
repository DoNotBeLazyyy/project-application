import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import { useTableCardContext } from '@contexts/TableCardContext';
import { InputAdornment } from '@mui/material';
import CardActions from '@mui/material/CardActions';
import { BoxProps } from '@mui/system';
import { FunnelIcon, FunnelSimpleIcon, MagnifyingGlassIcon, PlusIcon } from '@phosphor-icons/react';
import { ChangeEventInputTextarea, KeyboardEventDiv } from '@type/common.type';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface TableCardControlsProps extends BoxProps {
    // Optional flag to toggle the visibility of the "Create" button
    allowCreate?: boolean;
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
 *  <TableCardControls allowCreate={true} />
 *  </TableCardHeader>
 *  <TableCardContent
 *  leadingColumnDefs={columnDefs}
 *  rowData={displayedData}
 *  />
 *  <TableCardPagination pagination={pagination} onSetPagination={setPagination} />
 * </TableCard>
 */
export default function TableCardControls({
    allowCreate
}: TableCardControlsProps) {
    const { t } = useTranslation(); // Hook for handling multi-language support and string keys
    const context = useTableCardContext(); // Accesses the shared table state and search logic
    const [searchQuery, setSearchQuery] = useState<string>(''); // Manages the raw text input for the search field

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
                color="light-grey"
                size="small"
                startIcon={
                    <FunnelIcon
                        size={20}
                        style={{
                            color: 'var(--mui-palette-grey-400)'
                        }}
                        weight="bold"
                    />
                }
                variant="outlined"
            >
                {t('filters')}
            </CommonButton>
            <CommonButton
                color="light-grey"
                size="small"
                startIcon={
                    <FunnelSimpleIcon
                        size={20}
                        style={{
                            color: 'var(--mui-palette-grey-400)'
                        }}
                        weight="bold"
                    />
                }
                variant="outlined"
            >
                {t('sort_by')}
            </CommonButton>
            {allowCreate && (
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
                >
                    {t('create')}
                </CommonButton>
            )}
        </CardActions>
    );
}