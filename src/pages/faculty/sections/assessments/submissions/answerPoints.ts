export const MANUAL_GRADE_TYPES = ['Essay', 'Short Answer', 'Fill in the Blank', 'File Upload'];

/**
 * Returns why the points typed for an answer cannot be saved, or an empty string when they can.
 * An empty box is kept as NaN so it is not quietly saved as 0.
 */
export function getPointsError(pointsEarned: number, maxPoints: number): string {
    if (Number.isNaN(pointsEarned)) return 'Enter the points earned.';
    if (pointsEarned < 0) return 'Points cannot be negative.';
    if (pointsEarned > maxPoints) return `Points cannot be more than ${maxPoints}.`;
    return '';
}