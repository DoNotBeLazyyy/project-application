import { ServiceErrorProps } from '@type/service.type';

export function formatHumanReadableDbError(raw: Record<string, unknown>): string | null {
    const code = typeof raw['code'] === 'string'
        ? raw['code']
        : '';
    const rawMessage = typeof raw['message'] === 'string'
        ? raw['message']
        : '';
    const details = typeof raw['details'] === 'string'
        ? raw['details']
        : '';

    const isUniqueViolation = code === '23505'
        || /unique constraint|duplicate key value violates unique constraint/i.test(rawMessage);

    if (isUniqueViolation) {
        // Extract key and value from PostgreSQL details format:
        // e.g. "Key (name)=(College of Computer Studies) already exists."
        // or "Key (code)=(CCS) already exists."
        const detailsMatch = details.match(/Key\s*\((.*?)\)\s*=\s*\((.*?)\)\s*already exists/i);
        const fieldFromDetails = detailsMatch
            ? detailsMatch[1].trim()
            : '';
        const valueFromDetails = detailsMatch
            ? detailsMatch[2].trim()
            : '';

        // Extract constraint name: e.g. "uidx_departments_name"
        const constraintMatch = rawMessage.match(/constraint\s*["']?([^"'\s]+)["']?/i);
        const constraintName = constraintMatch
            ? constraintMatch[1].trim()
            : '';

        // Specific humanization for departments
        const isDepartment = /department/i.test(constraintName) || /department/i.test(rawMessage);
        if (isDepartment) {
            const isName = fieldFromDetails.toLowerCase() === 'name' || /departments_name/i.test(constraintName);
            const isCode = fieldFromDetails.toLowerCase() === 'code' || /departments_code/i.test(constraintName);

            if (isName) {
                return valueFromDetails
                    ? `A department named "${valueFromDetails}" already exists. Please choose a different name.`
                    : 'A department with this name already exists. Please choose a different name.';
            }

            if (isCode) {
                return valueFromDetails
                    ? `A department with code "${valueFromDetails}" already exists. Please choose a different code.`
                    : 'A department with this code already exists. Please choose a different code.';
            }

            return valueFromDetails
                ? `A department with this ${fieldFromDetails || 'information'} ("${valueFromDetails}") already exists.`
                : 'A department with this information already exists. Please check for duplicates.';
        }

        // Specific humanization for programs
        const isProgram = /program/i.test(constraintName) || /program/i.test(rawMessage);
        if (isProgram) {
            const isName = fieldFromDetails.toLowerCase() === 'name' || /programs_name/i.test(constraintName);
            const isCode = fieldFromDetails.toLowerCase() === 'code' || /programs_code/i.test(constraintName);

            if (isName) {
                return valueFromDetails
                    ? `A program named "${valueFromDetails}" already exists. Please choose a different name.`
                    : 'A program with this name already exists. Please choose a different name.';
            }
            if (isCode) {
                return valueFromDetails
                    ? `A program with code "${valueFromDetails}" already exists. Please choose a different code.`
                    : 'A program with this code already exists. Please choose a different code.';
            }
        }

        // Specific humanization for courses
        const isCourse = /course/i.test(constraintName) || /course/i.test(rawMessage);
        if (isCourse) {
            const isCode = fieldFromDetails.toLowerCase() === 'code' || /courses_code/i.test(constraintName);
            const isTitle = fieldFromDetails.toLowerCase() === 'title' || /courses_title/i.test(constraintName);

            if (isCode) {
                return valueFromDetails
                    ? `A course with code "${valueFromDetails}" already exists. Please choose a different code.`
                    : 'A course with this code already exists. Please choose a different code.';
            }
            if (isTitle) {
                return valueFromDetails
                    ? `A course titled "${valueFromDetails}" already exists. Please choose a different title.`
                    : 'A course with this title already exists. Please choose a different title.';
            }
        }

        // Specific humanization for sections
        const isSection = /section/i.test(constraintName) || /section/i.test(rawMessage);
        if (isSection) {
            return valueFromDetails
                ? `A section with code "${valueFromDetails}" already exists.`
                : 'A section with this code already exists. Please use a unique section code.';
        }

        // Specific humanization for user emails
        const isEmail = fieldFromDetails.toLowerCase() === 'email' || /users_email/i.test(constraintName);
        if (isEmail) {
            return valueFromDetails
                ? `The email address "${valueFromDetails}" is already registered. Please use a different email.`
                : 'This email address is already in use. Please enter a different email.';
        }

        // Generic fallback for any other unique constraint
        if (fieldFromDetails && valueFromDetails) {
            const fieldLabel = fieldFromDetails.charAt(0)
                .toUpperCase() + fieldFromDetails.slice(1)
                .replace(/_/g, ' ');
            return `${fieldLabel} "${valueFromDetails}" already exists. Please use a different value.`;
        }

        if (fieldFromDetails) {
            const fieldLabel = fieldFromDetails.charAt(0)
                .toUpperCase() + fieldFromDetails.slice(1)
                .replace(/_/g, ' ');
            return `A record with this ${fieldLabel.toLowerCase()} already exists. Please use a unique value.`;
        }

        return 'This record already exists. Please make sure all values are unique and try again.';
    }

    // Foreign key violation (23503)
    if (code === '23503' || /foreign key constraint/i.test(rawMessage)) {
        return 'This record cannot be modified or deleted because it is linked to other data in the system.';
    }

    // Not-null constraint violation (23502)
    if (code === '23502' || /violates not-null constraint/i.test(rawMessage)) {
        const colMatch = rawMessage.match(/column\s*["']?([^"'\s]+)["']?/i);
        const colName = colMatch
            ? colMatch[1].charAt(0)
                .toUpperCase() + colMatch[1].slice(1)
                .replace(/_/g, ' ')
            : 'A required field';
        return `${colName} is required. Please fill in all required fields.`;
    }

    // Check constraint violation (23514)
    if (code === '23514' || /check constraint/i.test(rawMessage)) {
        return 'One of the values provided does not meet the requirements. Please review your input and try again.';
    }

    // Permission denied (42501)
    if (code === '42501' || /permission denied/i.test(rawMessage)) {
        return 'You do not have permission to perform this action.';
    }

    return null;
}

export function parseServiceError(error: unknown): ServiceErrorProps {
    if (typeof error === 'object' && error !== null) {
        const raw = error as Record<string, unknown>;
        const humanReadable = formatHumanReadableDbError(raw);

        let fallbackMessage = 'An unexpected error occurred';
        if (typeof raw['message'] === 'string' && raw['message'].trim() !== '') {
            fallbackMessage = raw['message'];
        }
        else if (error instanceof Error && error.message) {
            fallbackMessage = error.message;
        }

        return {
            message: humanReadable || fallbackMessage,
            code: typeof raw['code'] === 'string'
                ? raw['code']
                : null,
            status: typeof raw['status'] === 'number'
                ? raw['status']
                : null
        };
    }

    if (error instanceof Error) {
        return {
            message: error.message,
            code: null,
            status: null
        };
    }

    return {
        message: 'An unexpected error occurred',
        code: null,
        status: null
    };
}