import Tooltip from '@mui/material/Tooltip';
import { classMerge } from '@utils/css.util';
import { createElement, useEffect, useRef, useState } from 'react';

type TruncatedTextTag = 'p' | 'span' | 'div' | 'h3';

interface TruncatedTextProps {
    text: string;
    /** Lines to show before clamping. 1 renders a single-line ellipsis. */
    lines?: 1 | 2 | 3 | 4;
    className?: string;
    /** Element to render. Defaults to `p`. */
    as?: TruncatedTextTag;
}

const CLAMP_CLASS: Record<number, string> = {
    1: 'truncate',
    2: 'line-clamp-2',
    3: 'line-clamp-3',
    4: 'line-clamp-4'
};

/**
 * Renders text clamped to a fixed number of lines. When (and only when) the
 * content is actually cut off, hovering reveals the full value in a tooltip.
 *
 * This is the shared primitive for every place a management-list card shows a
 * potentially long, user-entered value.
 */
export default function TruncatedText({
    text,
    lines = 1,
    className,
    as = 'p'
}: TruncatedTextProps) {
    const ref = useRef<HTMLElement | null>(null);
    const [isOverflowing, setIsOverflowing] = useState(false);

    useEffect(function() {
        const element = ref.current;

        if (!element) {
            return;
        }

        function measure() {
            if (!element) {
                return;
            }

            setIsOverflowing(
                element.scrollHeight > element.clientHeight + 1
                    || element.scrollWidth > element.clientWidth + 1
            );
        }

        measure();

        const observer = new ResizeObserver(measure);
        observer.observe(element);

        return function() {
            observer.disconnect();
        };
    }, [text, lines]);

    const node = createElement(
        as,
        {
            ref,
            className: classMerge(CLAMP_CLASS[lines], className)
        },
        text
    );

    if (!isOverflowing) {
        return node;
    }

    return (
        <Tooltip arrow enterDelay={300} title={text}>
            {node}
        </Tooltip>
    );
}