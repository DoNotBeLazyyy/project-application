import BulkImportModal from '@components/modal/BulkImportModal';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import DepartmentGridCard from '@pages/admin/department-management/DepartmentGridCard';
import DepartmentWizardModal from '@pages/admin/department-management/DepartmentWizardModal';
import { useDepartmentTableConfig } from '@pages/admin/department-management/useDepartmentTableConfig';
import {
    bulkCreateDepartments,
    bulkDeleteDepartments,
    createDepartment,
    deleteDepartment,
    getDepartmentById,
    listDepartments,
    updateDepartment
} from '@services/department.service';
import { useToastStore } from '@stores/toast.store';
import { CsvTemplateColumn } from '@type/bulk-import.type';
import { DepartmentBulkRow, DepartmentFormValues, DepartmentListRow } from '@type/department.type';
import { SortStringDto } from '@type/http.type';
import { generateDepartmentCode } from '@utils/entity-code.util';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'code', label: 'Code' },
    { field: 'name', label: 'Name' }
];

const BULK_IMPORT_TEMPLATE_COLUMNS: CsvTemplateColumn[] = [
    { key: 'name', label: 'Name', hint: 'e.g. College of Computer Studies' },
    { key: 'description', label: 'Description', hint: 'e.g. Department of Computer Studies (optional)' }
];

const DEFAULT_FORM_VALUES: DepartmentFormValues = {
    code: '',
    dean_id: '',
    deans: [],
    description: '',
    faculties: [],
    faculty_ids: [],
    name: ''
};

export default function DepartmentManagement() {
    const [refreshKey, setRefreshKey] = useState(0);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const createMethods = useForm<DepartmentFormValues>({
        defaultValues: DEFAULT_FORM_VALUES
    });

    const updateMethods = useForm<DepartmentFormValues>({
        defaultValues: DEFAULT_FORM_VALUES
    });

    function refreshList() {
        setRefreshKey((prev) => prev + 1);
    }

    async function loadIntoForm(id: string) {
        const result = await getDepartmentById(id);

        if (result.data) {
            updateMethods.reset({
                code: result.data.code,
                dean_id: result.data.dean_id ?? '',
                deans: result.data.deans ?? [],
                description: result.data.description ?? '',
                faculties: result.data.faculties ?? [],
                faculty_ids: Array.isArray(result.data.faculty_ids) ? result.data.faculty_ids : [],
                name: result.data.name
            });
        }
    }

    async function handleOpenView(id: string) {
        setSelectedId(id);
        setWizardStep(1);
        await loadIntoForm(id);
        setIsViewOpen(true);
    }

    function handleCloseView() {
        setIsViewOpen(false);
        setSelectedId(null);
        setWizardStep(1);
        updateMethods.reset(DEFAULT_FORM_VALUES);
    }

    async function handleOpenUpdate(id: string) {
        setSelectedId(id);
        setWizardStep(1);
        await loadIntoForm(id);
        setIsUpdateOpen(true);
    }

    async function handleSwitchToEdit(id: string, step = 1) {
        setIsViewOpen(false);
        setWizardStep(step);
        await loadIntoForm(id);
        setIsUpdateOpen(true);
    }

    function handleCloseUpdate() {
        if (isSaving) return;
        setIsUpdateOpen(false);
        setSelectedId(null);
        setWizardStep(1);
        updateMethods.reset(DEFAULT_FORM_VALUES);
    }

    const { columnDefs, tableActionConfig } = useDepartmentTableConfig({
        onEdit: handleOpenUpdate,
        onRequestDeleteRow: function() {},
        onView: handleOpenView
    });

    async function fetchDepartments(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listDepartments(page, size, search, sort, null);
    }

    async function handleCreateSubmit(values: DepartmentFormValues) {
        setIsSaving(true);
        try {
            const result = await createDepartment({
                ...values,
                code: values.code.trim(),
                name: values.name.trim()
            });

            if (!result.error) {
                useToastStore.getState().showToast('Department created successfully.', 'success');
                createMethods.reset(DEFAULT_FORM_VALUES);
                setIsCreateOpen(false);
                refreshList();
            }
        }
        finally {
            setIsSaving(false);
        }
    }

    async function handleUpdateSubmit(values: DepartmentFormValues) {
        if (!selectedId) {
            return;
        }

        setIsSaving(true);
        try {
            const result = await updateDepartment(selectedId, {
                ...values,
                code: values.code.trim(),
                name: values.name.trim()
            });

            if (!result.error) {
                useToastStore.getState().showToast('Department and assignments updated successfully.', 'success');
                setIsUpdateOpen(false);
                setSelectedId(null);
                setWizardStep(1);
                updateMethods.reset(DEFAULT_FORM_VALUES);
                refreshList();
            }
        }
        finally {
            setIsSaving(false);
        }
    }

    return (
        <div className="flex flex-col gap-4 h-full">
            <CommonTableCard<DepartmentListRow>
                cardHeaderProps={{
                    subheader: 'Manage academic departments, assign Deans and faculty members, and look up department rosters.',
                    title: 'Department Management'
                }}
                controls={{
                    tableInputProps: {
                        searchHints: SEARCH_HINTS.departments
                    },
                    tableButtonsProps: {
                        uploadCsvButtonProps: {
                            onClick: function() {
                                setIsBulkImportOpen(true);
                            }
                        }
                    }
                }}
                dependencies={[refreshKey]}
                renderGridCard={function(item, isSelected, onToggleSelect, onRequestDeleteRow) {
                    return (
                        <DepartmentGridCard
                            isSelected={isSelected}
                            row={item}
                            onEdit={handleOpenUpdate}
                            onRequestDelete={onRequestDeleteRow}
                            onToggleSelect={onToggleSelect}
                            onView={handleOpenView}
                        />
                    );
                }}
                sortColumns={SORT_COLUMNS}
                tableActionConfig={tableActionConfig}
                tableProps={{
                    hasCheckbox: true,
                    leadingColumnDefs: columnDefs
                }}
                uniqueIdKey="id"
                onCreate={function() {
                    createMethods.reset(DEFAULT_FORM_VALUES);
                    setWizardStep(1);
                    setIsCreateOpen(true);
                }}
                onDelete={bulkDeleteDepartments}
                onDeleteRow={deleteDepartment}
                onFetch={fetchDepartments}
                onRowClick={handleOpenView}
            />

            {/* Create Department Stepper Modal */}
            <DepartmentWizardModal
                initialStep={1}
                isSaving={isSaving}
                methods={createMethods}
                open={isCreateOpen}
                onClose={function() {
                    if (isSaving) return;
                    createMethods.reset(DEFAULT_FORM_VALUES);
                    setIsCreateOpen(false);
                }}
                onSubmit={handleCreateSubmit}
            />

            {/* Edit Department Stepper Modal */}
            <DepartmentWizardModal
                departmentId={selectedId}
                initialStep={wizardStep}
                isCodeDisabled
                isSaving={isSaving}
                methods={updateMethods}
                open={isUpdateOpen}
                onClose={handleCloseUpdate}
                onSubmit={handleUpdateSubmit}
            />

            {/* View Department Stepper Modal (Read-Only Lookup) */}
            <DepartmentWizardModal
                departmentId={selectedId}
                initialStep={1}
                methods={updateMethods}
                open={isViewOpen}
                readOnly
                onClose={handleCloseView}
                onSubmit={function() {}}
                onSwitchToEdit={function(step) {
                    if (selectedId) {
                        handleSwitchToEdit(selectedId, step);
                    }
                }}
            />

            <BulkImportModal<DepartmentBulkRow>
                open={isBulkImportOpen}
                templateColumns={BULK_IMPORT_TEMPLATE_COLUMNS}
                title="Bulk Import Departments"
                onBulkImport={bulkCreateDepartments}
                onClose={function() {
                    setIsBulkImportOpen(false);
                }}
                onMapRow={function(row) {
                    return {
                        code: row.code?.trim() || generateDepartmentCode(row.name || ''),
                        description: row.description,
                        name: row.name
                    };
                }}
                onSuccess={refreshList}
            />
        </div>
    );
}
