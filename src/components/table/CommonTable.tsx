import CaretDownStringIcon from '@components/icons/CaretDownStringIcon';
import CaretUpDownStringIcon from '@components/icons/CaretUpDownStringIcon';
import CaretUpStringIcon from '@components/icons/CaretUpStringIcon';
import { DotsThreeVerticalIcon, PencilSimpleIcon } from '@phosphor-icons/react';
import {
    BooleanFunction, GridApiNull, HtmlDivElementNull, NodeNull, StateProps
} from '@type/common.type';
import { SortStringDto } from '@type/http.type';
import { classMerge } from '@utils/css.util';
import { preventDefaultContextMenu } from '@utils/table.util';
import {
    ColDef, ColumnState, GridReadyEvent, RowClickedEvent, SortChangedEvent
} from 'ag-grid-community';
import { AgGridReact, AgGridReactProps } from 'ag-grid-react';
import {
    CSSProperties, useEffect, useMemo, useRef, useState
} from 'react';

type HeaderTextTransform = 'uppercase' | 'lowercase' | 'capitalize';

interface TableActionConfig {
    // Additional action column definitions
    actionColDef?: ColDef;

    // Additional container action class name
    actionContainerClassName?: string;

    // Whether to show an action column
    hasAction?: boolean;

    // Additional icon action class name
    actionIconClassName?: string;

    // Callback executed when the action menu button is clicked
    onActionMenuClick?: VoidFunction;

    // Callback executed when the edit button is clicked
    onEditClick?: VoidFunction;
}

export interface CommonTableProps extends Omit<AgGridReactProps, 'columnDefs'> {
    // Configuration object for the action column
    actionConfig?: TableActionConfig;

    // Additional container class name
    containerClassName?: string;

    // Whether to show an action column
    hasAction?: boolean;

    // Whether to show a checkbox selection column at the start
    hasCheckbox?: boolean;

    // Dynamic text transformation for table headers
    headerTextTransform?: HeaderTextTransform;

    // Deselects all rows when the grid container loses focus
    isDeselectedOnBlur?: boolean;

    // Leading column definitions that appears before actions field
    leadingColumnDefs?: ColDef[];

    // Trailing column definitions that appears after actions field
    trailingColumnDefs?: ColDef[];

    // Optional callback triggered on sort, returns whether sorting is allowed
    onConfirmSort?: BooleanFunction;

    // Callback executed when sorting columns
    onSetSort?: StateProps<SortStringDto[]>;
}

/**
 * CommonTable
 *
 * A reusable wrapper for ag-Grid that standardizes sorting logic, action columns,
 * and custom styling while adhering to the Quartz theme.
 *
 * @example
 * <CommonTable
 *  leadingColumnDefs={columns}
 *  onRowClicked={handleRowClick}
 * />
 */
export default function CommonTable({
    actionConfig: {
        actionColDef,
        actionContainerClassName,
        hasAction,
        actionIconClassName,
        onEditClick,
        onActionMenuClick
    } = {},
    containerClassName,
    defaultColDef,
    hasCheckbox,
    headerTextTransform = 'uppercase',
    isDeselectedOnBlur,
    leadingColumnDefs = [],
    trailingColumnDefs = [],
    onConfirmSort,
    onGridReady,
    onRowClicked,
    onSetSort,
    ...props
}: CommonTableProps) {
    const containerRef = useRef<HtmlDivElementNull>(null); // Container reference
    const prevSortModelRef = useRef<ColumnState[]>([]); // Previous column sort state
    const isRestoringSortRef = useRef(false); // Restoring sort state flag
    const [gridApi, setGridApi] = useState<GridApiNull>(null); // Grid API state
    const resolvedColumnDefs = useMemo<ColDef[]>(() => {
        const commonClassName = classMerge(
            'cursor-pointer h-[2.25rem] w-[2.25rem] p-(--mui-tokens-spacing-3) text-(--mui-palette-grey-500)',
            actionIconClassName
        );

        return [
            ...leadingColumnDefs,
            ...(hasAction
                ? [{
                    cellClass: 'ignore_row_click',
                    flex: 1,
                    headerName: '',
                    minWidth: 104,
                    cellRenderer: () => (
                        <div
                            className={
                                classMerge(
                                    'flex justify-center w-full',
                                    actionContainerClassName
                                )
                            }
                        >
                            <PencilSimpleIcon
                                className={commonClassName}
                                onClick={onEditClick}
                            />
                            <DotsThreeVerticalIcon
                                className={commonClassName}
                                onClick={onActionMenuClick}
                            />
                        </div>
                    ),
                    ...actionColDef
                }]
                : []
            ),
            ...trailingColumnDefs
        ];
    }, [
        actionColDef, actionContainerClassName, actionIconClassName, hasAction,
        leadingColumnDefs, trailingColumnDefs, onActionMenuClick, onEditClick
    ]); // Resolved column definitions
    const resolvedColDefs = useMemo<ColDef>(() => {
        const commonSortIconProps = {
            className: 'cursor-pointer font-[700] h-[0.875rem] text-current w-[0.875rem]'
        };

        return {
            icons: {
                sortAscending: CaretUpStringIcon(commonSortIconProps),
                sortDescending: CaretDownStringIcon(commonSortIconProps),
                sortUnSort: CaretUpDownStringIcon(commonSortIconProps),
                ...defaultColDef?.icons
            },
            resizable: false,
            sortable: false,
            suppressHeaderFilterButton: true,
            suppressMovable: true,
            ...defaultColDef
        };
    }, [defaultColDef]); // Resolved default column configurations
    const rowSelection = useMemo(() => (
        hasCheckbox
            ? {
                enableClickSelection: true,
                mode: 'multiRow' as const
            }
            : undefined
    ), [hasCheckbox]); // Row selection configuration

    useEffect(() => {
        document.addEventListener('mousedown', handleDocumentMouseDown);

        return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
    }, [gridApi, isDeselectedOnBlur]);

    /**
     * Initializes the grid API state and propagates the event to the parent.
     *
     * @param event - The Ag-Grid readiness event.
     */
    function handleGridReady(event: GridReadyEvent) {
        setGridApi(event.api);
        onGridReady?.(event);
    }

    /**
     * Deselects all rows if a click occurs outside the grid container.
     *
     * @param event - The native mouse event.
     * @returns
     */
    function handleDocumentMouseDown(event: MouseEvent) {
        if (!containerRef.current?.contains(event.target as NodeNull) && isDeselectedOnBlur) {
            gridApi?.deselectAll();
        }
    }

    /**
     * Handles the row click event, ignoring clicks that originate from interactive cells.
     *
     * @param event - The ag-Grid RowClickedEvent.
     */
    function handleRowClicked(event: RowClickedEvent) {
        if ((event.event?.target as HTMLElement)?.closest('.ignore_row_click')) {
            return;
        }

        onRowClicked?.(event);
    }

    /**
     * Synchronizes and validates sort state changes.
     *
     * @param params - The Ag-Grid sort change event.
     */
    function handleSortChanged(params: SortChangedEvent) {
        if (isRestoringSortRef.current) {
            isRestoringSortRef.current = false;

            return;
        }
        if ((onConfirmSort && !onConfirmSort())) {
            isRestoringSortRef.current = true;

            // TODO: Update when alert modal is ready
            params.api.applyColumnState({
                state: prevSortModelRef.current,
                ...(prevSortModelRef.current && {
                    defaultState: {
                        sort: null
                    }
                })
            });

            return;
        }

        const colState = params.api.getColumnState();
        prevSortModelRef.current = colState;

        onSetSort?.(colState.flatMap(({ colId, sort }) => (
            sort !== null
                ? [{
                    isAsc: sort === 'asc',
                    sortKey: colId
                }]
                : []
        )));
    }

    return (
        <div
            className={
                classMerge(
                    'ag-theme-quartz common_table h-full min-h-0 w-full',
                    containerClassName
                )
            }
            ref={containerRef}
            style={{
                '--table-header-transform': headerTextTransform
            } as CSSProperties}
            onContextMenu={preventDefaultContextMenu}
        >
            <AgGridReact
                animateRows={false}
                columnDefs={resolvedColumnDefs}
                defaultColDef={resolvedColDefs}
                rowSelection={rowSelection}
                suppressAnimationFrame
                suppressCellFocus
                suppressMovableColumns
                suppressRowHoverHighlight
                unSortIcon
                onGridReady={handleGridReady}
                onRowClicked={handleRowClicked}
                onSortChanged={handleSortChanged}
                {...props}
            />
        </div>
    );
}