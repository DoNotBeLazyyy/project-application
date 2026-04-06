import { ClassValue } from 'class-variance-authority/types';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge conditional Tailwind classes.
 *
 * @param classes - List of class values to merge.
 * @returns
 */
export function classMerge(...classes: ClassValue[]) {
    return twMerge(clsx(classes));
}