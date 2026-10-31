import LinkifiedText from '@components/text/LinkifiedText';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('LinkifiedText', () => {
    it('renders regular text without links', () => {
        render(<LinkifiedText text="This is a simple answer without any link." />);
        expect(screen.getByText('This is a simple answer without any link.'))
            .toBeInTheDocument();
    });

    it('renders URLs as clickable external links', () => {
        render(<LinkifiedText text="Here is my project: https://github.com/student/my-project" />);
        const link = screen.getByRole('link', { name: /https:\/\/github\.com\/student\/my-project/i });

        expect(link)
            .toBeInTheDocument();
        expect(link)
            .toHaveAttribute('href', 'https://github.com/student/my-project');
        expect(link)
            .toHaveAttribute('target', '_blank');
        expect(link)
            .toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('auto-prefixes www. URLs with https://', () => {
        render(<LinkifiedText text="Check out www.example.com for my report" />);
        const link = screen.getByRole('link', { name: /www\.example\.com/i });

        expect(link)
            .toBeInTheDocument();
        expect(link)
            .toHaveAttribute('href', 'https://www.example.com');
        expect(link)
            .toHaveAttribute('target', '_blank');
    });

    it('returns null when text is empty', () => {
        const { container } = render(<LinkifiedText text="" />);
        expect(container)
            .toBeEmptyDOMElement();
    });
});