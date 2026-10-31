import FileAttachmentList from '@components/attachment/FileAttachmentList';
import FileAttachmentUploader from '@components/attachment/FileAttachmentUploader';
import { fireEvent, render, screen } from '@testing-library/react';
import { AttachmentInputDto } from '@type/announcement.type';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@services/storage.service', () => ({
    getFileUrl: vi.fn()
        .mockResolvedValue({
            data: { url: 'https://example.com/resolved-file.png' },
            error: null
        }),
    uploadFile: vi.fn()
        .mockResolvedValue({
            data: { url: 'https://example.com/uploaded.png' },
            error: null
        })
}));

const mockAttachments: AttachmentInputDto[] = [
    {
        file_name: 'event-flyer.png',
        file_path: 'announcements/123-event-flyer.png',
        file_size: 1024 * 300,
        mime_type: 'image/png',
        url: 'https://example.com/event-flyer.png'
    },
    {
        file_name: 'meeting-agenda.pdf',
        file_path: 'announcements/123-agenda.pdf',
        file_size: 1024 * 150,
        mime_type: 'application/pdf'
    }
];

describe('FileAttachmentUploader with Image Previews', () => {
    it('displays image preview card at the bottom for image attachments', () => {
        render(
            <FileAttachmentUploader
                attachments={mockAttachments}
                onChange={vi.fn()}
            />
        );

        // Image attachment is displayed with its preview
        expect(screen.getByText('event-flyer.png'))
            .toBeInTheDocument();
        const img = screen.getByRole('img', { name: 'event-flyer.png' });
        expect(img)
            .toBeInTheDocument();
        expect(img)
            .toHaveAttribute('src', 'https://example.com/event-flyer.png');

        // Document attachment is also displayed
        expect(screen.getByText('meeting-agenda.pdf'))
            .toBeInTheDocument();
    });

    it('opens zoomable and closable preview modal when clicking the image preview', () => {
        render(
            <FileAttachmentUploader
                attachments={mockAttachments}
                onChange={vi.fn()}
            />
        );

        // Click the image preview card
        const previewTrigger = screen.getByLabelText(/Click to enlarge preview of event-flyer.png/i);
        fireEvent.click(previewTrigger);

        // Modal should open
        expect(screen.getByRole('dialog'))
            .toBeInTheDocument();
        expect(screen.getByText('100%'))
            .toBeInTheDocument();

        // Check zoomable controls
        const zoomInBtn = screen.getByRole('button', { name: /zoom in/i });
        fireEvent.click(zoomInBtn);
        expect(screen.getByText('125%'))
            .toBeInTheDocument();

        // Check closable
        const closeBtn = screen.getByRole('button', { name: /close preview/i });
        fireEvent.click(closeBtn);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('allows removing an image attachment', () => {
        const handleChange = vi.fn();
        render(
            <FileAttachmentUploader
                attachments={mockAttachments}
                onChange={handleChange}
            />
        );

        const removeBtn = screen.getByRole('button', { name: /remove event-flyer.png/i });
        fireEvent.click(removeBtn);

        expect(handleChange)
            .toHaveBeenCalledWith([mockAttachments[1]]);
    });
});

describe('FileAttachmentList with Image Previews', () => {
    it('displays image preview thumbnail cards for end-viewers and opens lightbox on click', () => {
        render(<FileAttachmentList attachments={mockAttachments} />);

        // Image is displayed with preview thumbnail
        expect(screen.getByText('event-flyer.png'))
            .toBeInTheDocument();
        const img = screen.getByRole('img', { name: 'event-flyer.png' });
        expect(img)
            .toBeInTheDocument();

        // Clicking preview opens modal
        const previewTrigger = screen.getByLabelText(/Click to enlarge preview of event-flyer.png/i);
        fireEvent.click(previewTrigger);

        expect(screen.getByRole('dialog'))
            .toBeInTheDocument();
        expect(screen.getByRole('button', { name: /download image/i }))
            .toBeInTheDocument();
        expect(screen.getByRole('button', { name: /close preview/i }))
            .toBeInTheDocument();
    });
});