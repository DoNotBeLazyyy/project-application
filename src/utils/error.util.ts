import { ServiceErrorProps } from '@type/service.type';

export function parseServiceError(error: unknown): ServiceErrorProps {
    if (typeof error === 'object' && error !== null) {
        const raw = error as Record<string, unknown>;
        return {
            message: typeof raw['message'] === 'string'
                ? raw['message']
                : (error instanceof Error ? error.message : 'An unexpected error occurred'),
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