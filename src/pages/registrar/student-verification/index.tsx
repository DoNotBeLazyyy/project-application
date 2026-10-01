import CommonBentoCard from '@components/card/CommonBentoCard';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import StudentProfileVerificationModal from '@pages/registrar/student-verification/components/StudentProfileVerificationModal';
import FilterStudentVerificationForm from '@pages/registrar/student-verification/forms/FilterStudentVerificationForm';
import { useStudentVerificationTableConfig } from '@pages/registrar/student-verification/hooks/useStudentVerificationTableConfig';
import { listStudentProfileRequests } from '@services/registrar-verification.service';
import { SortStringDto } from '@type/http.type';
import {
    StudentProfileRequestFilterValues,
    StudentProfileRequestRow
} from '@type/registrar-verification.type';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

const FILTER_FORM_ID = 'filter-student-verification-form';
const EMPTY_FILTERS: StudentProfileRequestFilterValues = {
    status: 'All'
};

const SORT_COLUMNS: SortColumn[] = [
    { field: 'req.created_at', label: 'Submitted Date' },
    { field: 's.student_number', label: 'Student Number' },
    { field: 'u.last_name', label: 'Student Name' },
    { field: 'req.status', label: 'Status' }
];

export default function StudentVerificationPage() {
    const [activeFilters, setActiveFilters] = useState<StudentProfileRequestFilterValues | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<StudentProfileRequestRow | null>(null);
    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
    const [refreshCount, setRefreshCount] = useState(0);

    const rowsMapRef = useRef<Map<string, StudentProfileRequestRow>>(new Map());
    const filterMethods = useForm<StudentProfileRequestFilterValues>({ defaultValues: EMPTY_FILTERS });
    const { columnDefs } = useStudentVerificationTableConfig();

    async function fetchRequests(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        const result = await listStudentProfileRequests(
            page,
            size,
            search,
            sort,
            activeFilters?.status || null
        );

        if (result.data?.content) {
            result.data.content.forEach((item) => {
                rowsMapRef.current.set(item.id, item);
            });
        }
        return result;
    }

    function handleFilterSubmit(values: StudentProfileRequestFilterValues) {
        setActiveFilters(values);
        setIsFilterOpen(false);
    }

    function handleFilterReset() {
        filterMethods.reset(EMPTY_FILTERS);
        setActiveFilters(null);
    }

    function handleOpenVerification(rowOrId: StudentProfileRequestRow | string) {
        if (typeof rowOrId === 'string') {
            const found = rowsMapRef.current.get(rowOrId);
            if (found) {
                setSelectedRequest(found);
                setIsVerificationModalOpen(true);
            }
        } else {
            setSelectedRequest(rowOrId);
            setIsVerificationModalOpen(true);
        }
    }

    function handleCloseVerification() {
        setIsVerificationModalOpen(false);
        setSelectedRequest(null);
    }

    function handleVerificationSuccess() {
        setRefreshCount((prev) => prev + 1);
    }

    function renderBentoCard(item: StudentProfileRequestRow) {
        const metrics = [
            {
                label: 'Program',
                value: `${item.program_code} (Yr ${item.year_level})`
            },
            {
                label: 'Submitted',
                value: new Date(item.created_at).toLocaleDateString()
            },
            {
                label: 'Reviewer',
                value: item.reviewer_name || 'Pending'
            }
        ];

        return (
            <CommonBentoCard
                actionMenu={<span />}
                code={item.student_number}
                hasCheckbox={false}
                metrics={metrics}
                status={item.status}
                subtitle={item.student_email}
                title={item.student_name}
                onClick={() => handleOpenVerification(item)}
            />
        );
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<StudentProfileRequestRow>
                cardHeaderProps={{
                    subheader: 'Review, edit, verify, or reject student profile change requests before they take effect.',
                    title: 'Student Profile Verification'
                }}
                dependencies={[activeFilters, refreshCount]}
                filterModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Filter profile requests by verification status.',
                            title: 'Filter Requests'
                        }
                    },
                    confirmText: 'Apply Filters',
                    formContent: (
                        <FilterStudentVerificationForm
                            control={filterMethods.control}
                            id={FILTER_FORM_ID}
                            onSubmit={filterMethods.handleSubmit(handleFilterSubmit)}
                        />
                    ),
                    formId: FILTER_FORM_ID,
                    open: isFilterOpen,
                    onClose: () => {
                        filterMethods.reset(activeFilters || EMPTY_FILTERS);
                        setIsFilterOpen(false);
                    },
                    onReset: handleFilterReset
                }}
                renderGridCard={renderBentoCard}
                sortColumns={SORT_COLUMNS}
                tableProps={{
                    leadingColumnDefs: columnDefs
                }}
                uniqueIdKey="id"
                onFetch={fetchRequests}
                onFilter={() => setIsFilterOpen(true)}
                onRowClick={handleOpenVerification}
            />

            <StudentProfileVerificationModal
                open={isVerificationModalOpen}
                request={selectedRequest}
                onClose={handleCloseVerification}
                onSuccess={handleVerificationSuccess}
            />
        </div>
    );
}
