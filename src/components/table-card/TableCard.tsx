import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import CommonPagination from '@components/pagination/CommonPagination';
import CommonTable, { CommonTableProps } from '@components/table/CommonTable';
import {
    CardActions,
    CardActionsProps,
    CardContent,
    CardHeader, CardHeaderProps,
    InputAdornment
} from '@mui/material';
import Card, { CardProps } from '@mui/material/Card';
import { BoxProps } from '@mui/system';
import { FunnelIcon, FunnelSimpleIcon, MagnifyingGlassIcon, PlusIcon } from '@phosphor-icons/react';
import { GridApiNull } from '@type/common.type';
import { PaginationData } from '@type/table.type';
import { GridReadyEvent } from 'ag-grid-community';
import React, {
    createContext, Dispatch, ReactNode, RefObject,
    SetStateAction,
    useContext,
    useRef, useState
} from 'react';

/**
 * TableCard
 *
 * A compound component used to wrap tables within a styled Material UI Card.
 * It provides a shared context for search functionality, filters, and AG Grid API references.
 * The component is broken down into modular sub-components (Header, Title, Description,
 * Controls, Content, and Pagination) to allow for flexible layout configurations.
 *
 * @example
 * <TableCard>
 * <TableCard.Header>
 * <TableCard.Title>Users</TableCard.Title>
 * <TableCard.Description>Manage your organization members</TableCard.Description>
 * <TableCard.Controls allowCreate />
 * </TableCard.Header>
 * <TableCard.Content
 * leadingColumnDefs={cols}
 * rowData={data}
 * />
 * <TableCard.Pagination
 * pagination={pageData}
 * onSetPagination={setPage}
 * />
 * </TableCard>
 */

interface TableCardContextType {
    /** A reference to the AG Grid API instance. */
    gridRef: RefObject<GridApiNull>;

    /** Callback function to update the search term and grid filter. */
    handleSearch: (val: string) => void;

    /** The current string used for filtering grid rows. */
    searchQuery: string;

    /** Callback to update the search query state. */
    setSearchQuery: Dispatch<SetStateAction<string>>;
}

/**
 * TableCardContext
 * * Shares search state and grid API across TableCard sub-components.
 */
const TableCardContext = createContext<TableCardContextType | null>(null);

interface TableCardHeaderTextProps {
    /** The content to be rendered within the header text component. */
    children: ReactNode;
}

interface TableCardControlsProps extends BoxProps {
    /** Optional flag to toggle the visibility of the "Create" button. */
    allowCreate?: boolean;
}

interface TableCardPaginationProps extends CardActionsProps {
    /** Function to update the pagination state. */
    onSetPagination: Dispatch<SetStateAction<PaginationData>>;

    /** The data object containing current page, limit, and total counts. */
    pagination: PaginationData;
}

interface TableCardComponent extends React.FC<CardProps> {
    /** Sub-component that renders the main Ag-Grid table. */
    Content: React.FC<CommonTableProps>;

    /** Sub-component containing search, filters, and action buttons. */
    Controls: React.FC<TableCardControlsProps>;

    /** Sub-component for the card's subheader or description. */
    Description: React.FC<TableCardHeaderTextProps>;

    /** Sub-component for organizing the card's header area. */
    Header: React.FC<CardHeaderProps>;

    /** Sub-component for handling table pagination. */
    Pagination: React.FC<TableCardPaginationProps>;

    /** Sub-component for the card's primary title. */
    Title: React.FC<TableCardHeaderTextProps>;
}

/**
 * TableCardTitle
 * * A simple wrapper component for the card's main title text.
 */
function TableCardTitle({ children }: TableCardHeaderTextProps) {
    return <>{children}</>;
}

/**
 * TableCardDescription
 * * A simple wrapper component for the card's subheader or description text.
 */
function TableCardDescription({ children }: TableCardHeaderTextProps) {
    return <>{children}</>;
}

/**
 * TableCardControls
 * * Renders action controls including search, filters, and create buttons.
 */
function TableCardControls({ allowCreate }: TableCardControlsProps) {
    const context = useContext(TableCardContext); // Accesses the shared table state and search logic

    if (!context) {
        return null;
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter' && context) {
            context.handleSearch(context.searchQuery);
        }
    }

    return (
        <CardActions>
            <CommonInput
                className="bg-white border-2"
                isRoundedFull
                placeholder="Search..."
                size="small"
                slotProps={{
                    input: {
                        startAdornment:
                            <InputAdornment position="start">
                                <MagnifyingGlassIcon color="var(--mui-palette-grey-900)" size={20}/>
                            </InputAdornment>,
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
                value={context.searchQuery}
                variant="outlined"
                onChange={(e) => context.setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <CommonButton
                color={'grey-300'}
                size={'small'}
                startIcon={
                    <FunnelIcon
                        size={20}
                        style={{ color: 'var(--mui-palette-grey-400)' }}
                        weight="bold"
                    />
                }
                variant={'outlined'}
            >
                Filters
            </CommonButton>
            <CommonButton
                color={'grey-300'}
                size={'small'}
                startIcon={
                    <FunnelSimpleIcon
                        size={20}
                        style={{ color: 'var(--mui-palette-grey-400)' }}
                        weight="bold"
                    />
                }
                variant={'outlined'}
            >
                Sort by
            </CommonButton>
            {allowCreate && (
                <CommonButton
                    size={'small'}
                    startIcon={
                        <PlusIcon
                            size={20}
                            style={{ color: 'var(--mui-palette-common-white)' }}
                            weight="bold"
                        />
                    }
                >
                    Create
                </CommonButton>
            )}
        </CardActions>
    );
}

/**
 * TableCardContent
 * * Renders the main table content and connects it to the TableCard context.
 */
function TableCardContent({
    leadingColumnDefs,
    onGridReady,
    rowData,
    ...props
}: CommonTableProps) {
    const context = useContext(TableCardContext); // Syncs the grid API reference with the parent root

    function handleGridReady(params: GridReadyEvent) {
        if (context) {
            context.gridRef.current = params.api;
        }
        onGridReady?.(params);
    }

    return (
        <CardContent
            sx={{
                flex: 1,
                minHeight: 0,
                padding: 0
            }}
        >
            <CommonTable
                leadingColumnDefs={leadingColumnDefs}
                rowData={rowData}
                onGridReady={handleGridReady}
                {...props}
            />
        </CardContent>
    );
}

/**
 * TableCardHeader
 * * Organizes the header layout by extracting Title, Description, and Controls components.
 */
function TableCardHeader({
    children,
    ...props
}: CardHeaderProps) {
    const childrenArray = React.Children.toArray(children);

    const title = childrenArray.find(
        (child) => React.isValidElement(child) && child.type === TableCardTitle
    );

    const description = childrenArray.find(
        (child) => React.isValidElement(child) && child.type === TableCardDescription
    );

    const controls = childrenArray.find(
        (child) => React.isValidElement(child) && child.type === TableCardControls
    );

    return (
        <CardHeader
            action={controls}
            subheader={description}
            title={title}
            {...props}
        />
    );
}

/**
 * TableCardPagination
 * * Renders the pagination footer for the TableCard.
 */
function TableCardPagination({
    onSetPagination,
    pagination
}: TableCardPaginationProps) {
    return (
        <CommonPagination
            className="flex h-18 items-center"
            pagination={pagination}
            onSetPagination={onSetPagination}
        />
    );
}

/**
 * TableCardRoot
 * * The root container that provides search state and grid references to its sub-components.
 */
function TableCardRoot({
    children,
    sx,
    ...props
}: CardProps) {
    const gridRef = useRef<GridApiNull>(null); // Stores the Ag-Grid API instance without triggering re-renders

    const [searchQuery, setSearchQuery] = useState<string>(''); // Manages the raw text input for the search field

    function handleSearch(value: string) {
        if (gridRef.current) {
            gridRef.current.setGridOption('quickFilterText', value);
        }
    }

    return (
        <TableCardContext.Provider
            value={{
                gridRef: gridRef,
                handleSearch,
                searchQuery,
                setSearchQuery
            }}
        >
            <Card
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    ...sx
                }}
                {...props}
            >
                {children}
            </Card>
        </TableCardContext.Provider>
    );
}

const TableCard = TableCardRoot as TableCardComponent;

TableCard.Content = TableCardContent;
TableCard.Controls = TableCardControls;
TableCard.Description = TableCardDescription;
TableCard.Header = TableCardHeader;
TableCard.Pagination = TableCardPagination;
TableCard.Title = TableCardTitle;

export default TableCard;