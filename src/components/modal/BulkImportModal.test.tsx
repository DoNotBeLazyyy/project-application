import BulkImportModal from '@components/modal/BulkImportModal';
import UploadCsvModal from '@components/modal/UploadCsvModal';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const MOCK_COLUMNS = [
    { key: 'code', label: 'Code', required: true },
    { key: 'name', label: 'Name', required: true }
];

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
