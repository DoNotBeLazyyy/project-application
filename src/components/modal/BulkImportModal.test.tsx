import BulkImportModal, { findErrorRow, getTargetEntityName } from '@components/modal/BulkImportModal';
import UploadCsvModal from '@components/modal/UploadCsvModal';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const MOCK_COLUMNS = [
    { key: 'code', label: 'Code', required: true },
    { key: 'name', label: 'Name', required: true }
];

describe('findErrorRow', () => {
    const rows = [
        { email: 'a@x.com', first_name: 'A' },
        { email: 'b@x.com', first_name: 'B' },
        { email: 'not-an-email', first_name: 'C' }
    ];

    it('maps "Row N" and "<value>: message" errors to the row they describe', () => {
        expect(findErrorRow('Row 2 (CODE): duplicate', rows)).toBe(2);
        expect(findErrorRow('not-an-email: Email address is invalid', rows)).toBe(3);
        expect(findErrorRow('B@X.com: already registered', rows)).toBe(2);
        expect(findErrorRow('Something went wrong', rows)).toBeNull();
    });
});

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

describe('BulkImportModal Flexible Header Matching & Delimiters', () => {
    const USER_COLUMNS = [
        {
            key: 'first_name',
            label: 'First Name',
            hint: 'e.g. Juan',
            sample: 'Juan',
            aliases: ['firstname', 'first', 'given_name', 'given name', 'fname']
        },
        {
            key: 'last_name',
            label: 'Last Name',
            hint: 'e.g. Dela Cruz',
            sample: 'Dela Cruz',
            aliases: ['lastname', 'last', 'surname', 'family_name', 'family name', 'lname']
        },
        {
            key: 'email',
            label: 'Email',
            hint: 'e.g. juan@school.edu',
            sample: 'juan.delacruz@aulms.edu',
            aliases: ['email_address', 'email address', 'user_email', 'user email', 'e-mail', 'mail']
        },
        {
            key: 'role_code',
            label: 'Role',
            hint: 'Admin, Faculty, Student, Registrar, Dean',
            sample: 'Faculty',
            aliases: ['role', 'roles', 'role_code', 'role code', 'user_role', 'user role', 'role_name', 'role name', 'user_type', 'user type']
        }
    ];

    it('accepts headers with "Email Address" and "Role Code" without failing', async () => {
        render(
            <BulkImportModal
                open={true}
                templateColumns={USER_COLUMNS}
                title="Bulk Import Users"
                onBulkImport={vi.fn().mockResolvedValue({ provisioned_count: 1, errors: [] })}
                onClose={vi.fn()}
            />
        );

        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const csv = 'First Name,Last Name,Email Address,Role Code\nJohn,Doe,john.doe@test.edu,Student';
        const file = new File([csv], 'users.csv', { type: 'text/csv' });

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByText(/1 row detected/i)).toBeInTheDocument();
            expect(screen.getByText(/Confirm Import \(1 rows?\)/i)).toBeInTheDocument();
        });
    });

    it('accepts headers with "Roles" and lowercase "first_name,last_name,email,role"', async () => {
        render(
            <BulkImportModal
                open={true}
                templateColumns={USER_COLUMNS}
                title="Bulk Import Users"
                onBulkImport={vi.fn().mockResolvedValue({ provisioned_count: 1, errors: [] })}
                onClose={vi.fn()}
            />
        );

        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const csv = 'First Name,Last Name,Email,Roles\nJane,Smith,jane.smith@test.edu,Faculty';
        const file = new File([csv], 'users.csv', { type: 'text/csv' });

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByText(/1 row detected/i)).toBeInTheDocument();
        });
    });

    it('accepts semicolon-delimited CSV and strips UTF-8 BOM', async () => {
        render(
            <BulkImportModal
                open={true}
                templateColumns={USER_COLUMNS}
                title="Bulk Import Users"
                onBulkImport={vi.fn().mockResolvedValue({ provisioned_count: 1, errors: [] })}
                onClose={vi.fn()}
            />
        );

        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        // Semicolon delimited with UTF-8 BOM \uFEFF
        const csv = '\uFEFFFirst Name;Last Name;Email;Role\nAlex;Mercer;alex@test.edu;Admin';
        const file = new File([csv], 'users.csv', { type: 'text/csv' });

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(screen.getByText(/1 row detected/i)).toBeInTheDocument();
        });
    });
});
