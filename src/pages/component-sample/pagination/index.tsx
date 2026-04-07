import CommonPagination from '@components/pagination/CommonPagination';
import { DEFAULT_PAGINATION } from '@constants/table.constant';
import { PaginationData } from '@type/table.type';
import { useState } from 'react';

export default function PaginationSample() {
    const [pagination, setPagination] = useState<PaginationData>(DEFAULT_PAGINATION); // Pagination data

    return (
        <div className="absolute h-screen inset-0 w-full">
            <div className="flex h-full items-center justify-center p-[50px] w-full">
                <CommonPagination
                    pagination={pagination}
                    onSetPagination={setPagination}
                />
            </div>
        </div>
    );
}