import { PaginationData } from '@type/table.type';
import { SetStateAction, useEffect, useState } from 'react';

export interface FormPagination {
    endIndex: number;
    pagination: PaginationData;
    startIndex: number;
    goToIndex: (index: number) => void;
    setPagination: (updater: SetStateAction<PaginationData>) => void;
}

export function useFormPagination(totalElements: number, pageSize: number): FormPagination {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = totalElements > 0
        ? Math.ceil(totalElements / pageSize)
        : 0;

    useEffect(function() {
        if (totalPages > 0 && currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const pagination: PaginationData = {
        currentPage,
        rowsPerPage: pageSize,
        totalElements,
        totalPages
    };

    function setPagination(updater: SetStateAction<PaginationData>) {
        const next = typeof updater === 'function'
            ? updater(pagination)
            : updater;

        setCurrentPage(next.currentPage);
    }

    function goToIndex(index: number) {
        setCurrentPage(Math.floor(index / pageSize) + 1);
    }

    return {
        endIndex: currentPage * pageSize,
        pagination,
        startIndex: (currentPage - 1) * pageSize,
        goToIndex,
        setPagination
    };
}