import SystemSettings from '@pages/admin/system-settings-management';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
    beforeEach, describe, expect, it, vi
} from 'vitest';

const mockGetSystemSettings = vi.fn();
const mockUpdateSystemSettings = vi.fn();

vi.mock('@services/system-settings.service', () => ({
    getSystemSettings: () => mockGetSystemSettings(),
    updateSystemSettings: (params: any) => mockUpdateSystemSettings(params)
}));

vi.mock('@services/storage.service', () => ({
    uploadFile: vi.fn()
}));

describe('SystemSettings - Error Tooltip Adjustment', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetSystemSettings.mockResolvedValue({
            data: {
                institution_name: 'Arellano University',
                institution_short_name: 'AU',
                institution_address: '2600 Legarda St, Sampaloc, Manila',
                institution_email: 'info@arellano.edu.ph',
                institution_phone: '(02) 8734-7371',
                institution_mobile: '09123456789',
                institution_website: 'https://www.arellano.edu.ph',
                institution_logo_url: 'https://example.com/logo.png',
                max_upload_size_mb: 25,
                allowed_upload_types: 'pdf,docx,xlsx,pptx,png,jpg,jpeg,zip'
            },
            error: null
        });
    });

    it('does not automatically open the error tooltip on the first invalid field when validation fails', async() => {
        const user = userEvent.setup();
        render(<SystemSettings />);

        // Wait for settings to load
        await waitFor(() => {
            expect(screen.getByDisplayValue('Arellano University'))
                .toBeInTheDocument();
        });

        // Clear the required institution name to create an error
        const nameInput = screen.getByDisplayValue('Arellano University');
        await user.clear(nameInput);

        const saveButton = screen.getByRole('button', { name: /save settings/i });
        expect(saveButton)
            .toBeEnabled();
        await user.click(saveButton);

        // Validation triggers error state on the field
        await waitFor(() => {
            const errorButton = screen.getByLabelText('This field has a problem');
            expect(errorButton)
                .toBeInTheDocument();
        });

        // The tooltip bubble must NOT automatically open
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

        // But user can still click or hover the error icon to open it manually if they want
        const errorIcon = screen.getByLabelText('This field has a problem');
        await user.click(errorIcon);

        await waitFor(() => {
            const tooltip = screen.getByRole('tooltip');
            expect(tooltip)
                .toBeInTheDocument();
            expect(tooltip)
                .toHaveTextContent(/institution name is required/i);
        });
    });
});