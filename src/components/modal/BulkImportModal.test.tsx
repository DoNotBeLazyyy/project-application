import BulkImportModal from '@components/modal/BulkImportModal';
import UploadCsvModal from '@components/modal/UploadCsvModal';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const MOCK_COLUMNS = [
    { key: 'code', label: 'Code', required: true },
    { key: 'name', label: 'Name', required: true }
];

describe('BulkImportModal & UploadCsvModal Close Buttons', () => {
    describe('BulkImportModal', () => {
        it('renders the header close button and triggers onClose when clicked', () => {
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

            const headerCloseBtn = screen.getByLabelText('Close');
            expect(headerCloseBtn).toBeInTheDocument();

            fireEvent.click(headerCloseBtn);
            expect(handleClose).toHaveBeenCalledTimes(1);
        });

        it('renders the upload step close button and triggers onClose when clicked', () => {
            const handleClose = vi.fn();
            render(
                <BulkImportModal
                    open={true}
                    templateColumns={MOCK_COLUMNS}
                    title="Bulk Import Test"
                    onClose={handleClose}
                />
            );

            // Find the bottom "Close" button by its visible text
            const uploadCloseBtn = screen.getByText('Close');
            expect(uploadCloseBtn).toBeInTheDocument();

            fireEvent.click(uploadCloseBtn);
            expect(handleClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('UploadCsvModal', () => {
        it('renders the header close button and triggers onClose when clicked', () => {
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

            const headerCloseBtn = screen.getByLabelText('Close');
            expect(headerCloseBtn).toBeInTheDocument();

            fireEvent.click(headerCloseBtn);
            expect(handleClose).toHaveBeenCalledTimes(1);
        });

        it('renders the upload step close button and triggers onClose when clicked', () => {
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

            const uploadCloseBtn = screen.getByText('Close');
            expect(uploadCloseBtn).toBeInTheDocument();

            fireEvent.click(uploadCloseBtn);
            expect(handleClose).toHaveBeenCalledTimes(1);
        });
    });
});
