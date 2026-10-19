import { ArrowSquareOutIcon } from '@phosphor-icons/react';
import { ReactNode } from 'react';

const URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s]|www\.[^\s<]+[^<.,:;"')\]\s])/gi;

interface LinkifiedTextProps {
    className?: string;
    text: string;
}

export default function LinkifiedText({ className, text }: LinkifiedTextProps) {
    if (!text) return null;

    const parts: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    const regex = new RegExp(URL_REGEX);

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }

        const rawUrl = match[0];
        const href = rawUrl.toLowerCase().startsWith('http://') || rawUrl.toLowerCase().startsWith('https://')
            ? rawUrl
            : `https://${rawUrl}`;

        parts.push(
            <a
                className="break-all font-medium gap-0.5 inline-flex items-center text-(--mui-palette-primary-main) underline hover:opacity-80"
                href={href}
                key={`link-${match.index}`}
                rel="noopener noreferrer"
                target="_blank"
                onClick={function(e) {
                    e.stopPropagation();
                }}
            >
                <span>{rawUrl}</span>
                <ArrowSquareOutIcon
                    className="inline shrink-0"
                    size={12}
                    weight="bold"
                />
            </a>
        );

        lastIndex = match.index + rawUrl.length;
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return (
        <span className={className}>
            {parts}
        </span>
    );
}
