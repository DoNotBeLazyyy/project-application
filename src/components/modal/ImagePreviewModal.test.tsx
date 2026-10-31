import ImagePreviewModal, { ImagePreviewItem } from '@components/modal/ImagePreviewModal';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const sampleImages: ImagePreviewItem[] = [
    {
        fileName: 'event-banner.png',
        fileSize: 1024 * 500, // 500 KB
        url: 'https://example.com/event-banner.png'
    },
    {
        fileName: 'schedule-chart.jpg',
        fileSize: 1024 * 1024 * 2, // 2 MB
        url: 'https://example.com/schedule-chart.jpg'
    }
];

describe('ImagePreviewModal', () => {
    it('does not render when open is false', () => {
        render(
            <ImagePreviewModal
                images={sampleImages}
                open={false}
                onClose={vi.fn()}
            />
        );

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders image, file name, file size, and controls when open', () => {
        render(
            <ImagePreviewModal
                images={sampleImages}
                open={true}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByRole('dialog'))
            .toBeInTheDocument();
        expect(screen.getByText('event-banner.png'))
            .toBeInTheDocument();
        expect(screen.getByText(/500/i))
            .toBeInTheDocument();
        expect(screen.getByText('100%'))
            .toBeInTheDocument();
        expect(screen.getByRole('button', { name: /zoom in/i }))
            .toBeInTheDocument();
        expect(screen.getByRole('button', { name: /zoom out/i }))
            .toBeInTheDocument();
        expect(screen.getByRole('button', { name: /download image/i }))
            .toBeInTheDocument();
        expect(screen.getByRole('button', { name: /close preview/i }))
            .toBeInTheDocument();
    });

    it('increases and decreases scale when clicking zoom buttons', () => {
        render(
            <ImagePreviewModal
                images={sampleImages}
                open={true}
                onClose={vi.fn()}
            />
        );

        const zoomInBtn = screen.getByRole('button', { name: /zoom in/i });
        const zoomOutBtn = screen.getByRole('button', { name: /zoom out/i });

        expect(screen.getByText('100%'))
            .toBeInTheDocument();

        fireEvent.click(zoomInBtn);
        expect(screen.getByText('125%'))
            .toBeInTheDocument();

        fireEvent.click(zoomInBtn);
        expect(screen.getByText('150%'))
            .toBeInTheDocument();

        fireEvent.click(zoomOutBtn);
        expect(screen.getByText('125%'))
            .toBeInTheDocument();

        const resetBtn = screen.getByRole('button', { name: /fit to screen/i });
        fireEvent.click(resetBtn);
        expect(screen.getByText('100%'))
            .toBeInTheDocument();
    });

    it('calls onClose when clicking close button or pressing Escape', () => {
        const handleClose = vi.fn();
        render(
            <ImagePreviewModal
                images={sampleImages}
                open={true}
                onClose={handleClose}
            />
        );

        const closeBtn = screen.getByRole('button', { name: /close preview/i });
        fireEvent.click(closeBtn);
        expect(handleClose)
            .toHaveBeenCalledTimes(1);

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(handleClose)
            .toHaveBeenCalledTimes(2);
    });

    it('navigates between multiple images with Next and Previous buttons', () => {
        render(
            <ImagePreviewModal
                images={sampleImages}
                open={true}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByText('event-banner.png'))
            .toBeInTheDocument();
        expect(screen.getAllByText(/1 of 2/i).length)
            .toBeGreaterThan(0);

        const nextButtons = screen.getAllByRole('button', { name: /next image/i });
        fireEvent.click(nextButtons[0]);

        expect(screen.getByText('schedule-chart.jpg'))
            .toBeInTheDocument();
        expect(screen.getAllByText(/2 of 2/i).length)
            .toBeGreaterThan(0);

        const prevButtons = screen.getAllByRole('button', { name: /previous image/i });
        fireEvent.click(prevButtons[0]);

        expect(screen.getByText('event-banner.png'))
            .toBeInTheDocument();
    });

    it('navigates between images using left and right keyboard arrows', () => {
        render(
            <ImagePreviewModal
                images={sampleImages}
                open={true}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByText('event-banner.png'))
            .toBeInTheDocument();

        // Right arrow moves to next image
        fireEvent.keyDown(window, { key: 'ArrowRight' });
        expect(screen.getByText('schedule-chart.jpg'))
            .toBeInTheDocument();

        // Left arrow moves back to previous image
        fireEvent.keyDown(window, { key: 'ArrowLeft' });
        expect(screen.getByText('event-banner.png'))
            .toBeInTheDocument();
    });

    it('navigates directly by clicking bottom thumbnail buttons', () => {
        render(
            <ImagePreviewModal
                images={sampleImages}
                open={true}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByText('event-banner.png'))
            .toBeInTheDocument();

        const thumbnailBtn = screen.getByRole('button', { name: /view schedule-chart.jpg/i });
        fireEvent.click(thumbnailBtn);

        expect(screen.getByText('schedule-chart.jpg'))
            .toBeInTheDocument();
    });

    it('calls onDownload or triggers download when clicking download button', () => {
        const handleDownload = vi.fn();
        render(
            <ImagePreviewModal
                images={sampleImages}
                open={true}
                onClose={vi.fn()}
                onDownload={handleDownload}
            />
        );

        const downloadBtn = screen.getByRole('button', { name: /download image/i });
        fireEvent.click(downloadBtn);

        expect(handleDownload)
            .toHaveBeenCalledWith(sampleImages[0]);
    });
});