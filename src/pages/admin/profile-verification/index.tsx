import CommonBentoCard from '@components/card/CommonBentoCard';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import StaffProfileVerificationModal from '@pages/admin/profile-verification/components/StaffProfileVerificationModal';
import FilterStaffVerificationForm from '@pages/admin/profile-verification/forms/FilterStaffVerificationForm';
import { useStaffVerificationTableConfig } from '@pages/admin/profile-verification/hooks/useStaffVerificationTableConfig';
import { listStaffProfileRequests } from '@services/admin-verification.service';
import { supabase } from '@services/supabase.client';
import { StaffProfileRequestFilterValues, StaffProfileRequestRow } from '@type/admin-verification.type';
import { SortStringDto } from '@type/http.type';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

const FILTER_FORM_ID = 'filter-staff-verification-form';
const EMPTY_FILTERS: StaffProfileRequestFilterValues = {
    role_code: 'All',
    status: 'All'
};

const SORT_COLUMNS: SortColumn[] = [
    { field: 'created_at', label: 'Submitted Date' },
    { field: 'user_name', label: 'Staff Name' },
    { field: 'role_code', label: 'Role' },
    { field: 'status', label: 'Status' }
];

export default function StaffProfileVerificationPage() {
    const [activeFilters, setActiveFilters] = useState<StaffProfileRequestFilterValues | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<StaffProfileRequestRow | null>(null);
    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
    const [refreshCount, setRefreshCount] = useState(0);

    const rowsMapRef = useRef<Map<string, StaffProfileRequestRow>>(new Map());
    const filterMethods = useForm<StaffProfileRequestFilterValues>({ defaultValues: EMPTY_FILTERS });
    const { columnDefs } = useStaffVerificationTableConfig();

    useEffect(function() {
        function handleVisibilityOrFocus() {
            if (document.visibilityState === 'visible') {
                setRefreshCount((prev) => prev + 1);
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityOrFocus);
        window.addEventListener('focus', handleVisibilityOrFocus);

        const channel = supabase
            .channel('realtime:staff_profile_change_requests')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'staff_profile_change_requests'
                },
                function() {
                    setRefreshCount((prev) => prev + 1);
                }
            )
            .subscribe();

        return function() {
            document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
            window.removeEventListener('focus', handleVisibilityOrFocus);
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchRequests(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        const result = await listStaffProfileRequests(
            page,
            size,
            search,
            sort,
            activeFilters?.role_code || null,
            activeFilters?.status || null
        );

        if (result.data?.content) {
            result.data.content.forEach((item) => {
                rowsMapRef.current.set(item.id, item);
            });
        }
        return result;
    }

    function handleFilterSubmit(values: StaffProfileRequestFilterValues) {
        setActiveFilters(values);
        setIsFilterOpen(false);
    }

    function handleFilterReset() {
        filterMethods.reset(EMPTY_FILTERS);
        setActiveFilters(null);
    }

    function handleOpenVerification(rowOrId: StaffProfileRequestRow | string) {
        if (typeof rowOrId === 'string') {
            const found = rowsMapRef.current.get(rowOrId);
            if (found) {
                setSelectedRequest(found);
                setIsVerificationModalOpen(true);
            }
        }
        else {
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

    function renderBentoCard(item: StaffProfileRequestRow) {
        const metrics = [
            {
                label: 'Role',
                value: item.role_code
            },
            {
                label: 'Department',
                value: item.department_code || '—'
            },
            {
                label: 'Submitted',
                value: new Date(item.created_at)
                    .toLocaleDateString()
            },
            {
                label: 'Reviewer',
                value: item.reviewer_name || 'Pending'
            }
        ];

        return (
            <CommonBentoCard
                actionMenu={<span />}
                code={item.role_code}
                hasCheckbox={false}
                metrics={metrics}
                status={item.status}
                subtitle={item.user_email}
                title={item.user_name}
                onClick={() => handleOpenVerification(item)}
            />
        );
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<StaffProfileRequestRow>
                cardHeaderProps={{
                    subheader: 'Oversee, review, edit, approve, or reject profile change requests submitted by Deans, Faculty, and Registrars.',
                    title: 'Staff Profile Approvals'
                }}
                dependencies={[activeFilters, refreshCount]}
                filterModalProps={{
                    cardProps: {
                        cardHeaderProps: {
                            subheader: 'Filter staff profile requests by role or status.',
                            title: 'Filter Requests'
                        }
                    },
                    confirmText: 'Apply Filters',
                    formContent: (
                        <FilterStaffVerificationForm
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

            <StaffProfileVerificationModal
                open={isVerificationModalOpen}
                request={selectedRequest}
                onClose={handleCloseVerification}
                onSuccess={handleVerificationSuccess}
            />
        </div>
    );
}