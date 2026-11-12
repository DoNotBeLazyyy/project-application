import { MobileCardColDef } from '@type/table.type';
import { useMemo } from 'react';

export function useRoleTableConfig() {
    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'code',
                flex: 2,
                headerName: 'Code',
                mobileCard: 'subtitle',
                sortable: true
            },
            {
                field: 'label',
                flex: 3,
                headerName: 'Label',
                mobileCard: 'title',
                sortable: true
            },
            {
                field: 'description',
                flex: 4,
                headerName: 'Description',
                sortable: false
            }
        ];
    }, []);

    return { columnDefs };
}