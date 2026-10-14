import BulkImportModal, { getTargetEntityName } from '@components/modal/BulkImportModal';
import UploadCsvModal from '@components/modal/UploadCsvModal';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const MOCK_COLUMNS = [
    { key: 'code', label: 'Code', required: true },
    { key: 'name', label: 'Name', required: true }
];

describe('getTargetEntityName', () => {
    it('cleans various titles correctly', () => {
        expect(getTargetEntityName('Bulk Import Departments')).toBe('Departments');
        expect(getTargetEntityName('Bulk Import Users')).toBe('Users');
        expect(getTargetEntityName('Bulk Import Courses')).toBe('Courses');
        expect(getTargetEntityName('Bulk Import Sections')).toBe('Sections');
        expect(getTargetEntityName('Bulk Import Course Types')).toBe('Course Types');
        expect(getTargetEntityName('Bulk Import Curriculum Map')).toBe('Curriculum Map');
        expect(getTargetEntityName('Bulk Import Evaluation Sections')).toBe('Evaluation Sections');
        expect(getTargetEntityName('Import Questions')).toBe('Questions');
        expect(getTargetEntityName('Bulk Enroll Students')).toBe('Students');
    });

    it('prefers explicit entityName if provided', () => {
        expect(getTargetEntityName('Bulk Import Test', 'Departments')).toBe('Departments');
    });

    it('falls back to Records if title is empty or generic', () => {
        expect(getTargetEntityName('')).toBe('Records');
        expect(getTargetEntityName(undefined)).toBe('Records');
    });
});

describe('Bulk Import Modals - Top Right X Close Button', () => {
    describe('BulkImportModal', () => {
        it('renders the top-right X close button and triggers onClose when clicked', () => {
            const handleClose = vi.fn();
            render(
                <BulkImportModal
                    open={true}
                    templateColumns={MOCK_COLUMNS}
                    title="Bulk Import Test"
                    onClose={handleClose}
                />
            );

            expect(screen.getByText('Bulk Import Test')).toBeInTheDocument();

            // The header X close button with aria-label="Close"
            const headerCloseBtn = screen.getByLabelText('Close');
            expect(headerCloseBtn).toBeInTheDocument();

            fireEvent.click(headerCloseBtn);
            expect(handleClose).toHaveBeenCalledTimes(1);

            // Verify no extra bottom Close button exists in upload step
            expect(screen.queryByText('Close')).toBeNull();
        });
    });

    describe('UploadCsvModal', () => {
        it('renders the top-right X close button and triggers onClose when clicked', () => {
            const handleClose = vi.fn();
            render(
                <UploadCsvModal
                    open={true}
                    templateColumns={MOCK_COLUMNS}
                    title="Upload via CSV"
                    onBulkImport={vi.fn()}
                    onClose={handleClose}
                />
            );

            expect(screen.getByText('Upload via CSV')).toBeInTheDocument();

            // The header X close button with aria-label="Close"
            const headerCloseBtn = screen.getByLabelText('Close');
            expect(headerCloseBtn).toBeInTheDocument();

            fireEvent.click(headerCloseBtn);
            expect(handleClose).toHaveBeenCalledTimes(1);

            // Verify no extra bottom Close button exists in upload step
            expect(screen.queryByText('Close')).toBeNull();
        });
    });
});

describe('BulkImportModal Results Display', () => {
    it('displays generic entity created count and items when importing departments', async () => {
        const handleImport = vi.fn().mockResolvedValue({
            provisioned_count: 3,
            errors: []
        });

        render(
            <BulkImportModal
                open={true}
                templateColumns={MOCK_COLUMNS}
                title="Bulk Import Departments"
                onBulkImport={handleImport}
                onClose={vi.fn()}
            />
        );

        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        expect(fileInput).not.toBeNull();

        const csvContent = 'Code,Name\nCS,Computer Science\nIT,Information Technology\nIS,Information Systems';
        const file = new File([csvContent], 'departments.csv', { type: 'text/csv' });

        fireEvent.change(fileInput, { target: { files: [file] } });

        // Wait for preview step
        await waitFor(() => {
            expect(screen.getByText(/Confirm Import \(3 rows\)/i)).toBeInTheDocument();
        });

        // Click Confirm Import
        fireEvent.click(screen.getByText(/Confirm Import \(3 rows\)/i));

        // Wait for results step
        await waitFor(() => {
            expect(screen.getByText('Bulk Import Departments — Results')).toBeInTheDocument();
        });

        // Should NOT say "Newly Created Section Offerings" or "No new sections were created"
        expect(screen.queryByText(/Newly Created Section Offerings/i)).toBeNull();
        expect(screen.queryByText(/No new sections were created/i)).toBeNull();

        // Should say "Newly Created Departments (3)"
        expect(screen.getByText('Newly Created Departments (3)')).toBeInTheDocument();

        // Should display the 3 imported items
        expect(screen.getByText('CS — Computer Science')).toBeInTheDocument();
        expect(screen.getByText('IT — Information Technology')).toBeInTheDocument();
        expect(screen.getByText('IS — Information Systems')).toBeInTheDocument();

        // Should have "Done" button
        expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('displays zero-state message with correct entity name when 0 records created', async () => {
        const handleImport = vi.fn().mockResolvedValue({
            provisioned_count: 0,
            errors: ['Row 1: Invalid department code'],
            structuredErrors: [
                { row: 1, code: 'INVALID_CODE', message: 'Invalid department code' }
            ]
        });

        render(
            <BulkImportModal
                open={true}
                templateColumns={MOCK_COLUMNS}
                title="Bulk Import Departments"
                onBulkImport={handleImport}
                onClose={vi.fn()}
            />
        );

        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        expect(fileInput).not.toBeNull();
        const csvContent = 'Code,Name\nBAD,Bad Department';
        const file = new File([csvContent], 'departments.csv', { type: 'text/csv' });

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByText(/Confirm Import \(1 rows?\)/i)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText(/Confirm Import \(1 rows?\)/i));

        await waitFor(() => {
            expect(screen.getByText('Bulk Import Departments — Results')).toBeInTheDocument();
        });

        // Blocked / Failed tab is active when created is 0 and blocked > 0
        expect(screen.getByText('Blocked / Failed (1)')).toBeInTheDocument();

        // Switch to created tab
        fireEvent.click(screen.getByText(/Created \(0\)/i));

        expect(screen.getByText('Newly Created Departments (0)')).toBeInTheDocument();
        expect(screen.getByText('No new departments were created.')).toBeInTheDocument();
        expect(screen.queryByText(/No new sections were created/i)).toBeNull();
    });
});
