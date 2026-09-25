import { callFunction } from '@services/supabase.wrapper';
import { inviteSingleUser } from '@services/user.service';
import {
    beforeEach, describe, expect, it, vi
} from 'vitest';

vi.mock('@services/supabase.wrapper', () => ({
    callFunction: vi.fn(),
    callRpc: vi.fn()
}));

describe('user.service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('invokes admin-user-provision Edge Function with invite_single_user action and correct parameters', async() => {
        const mockCallFunction = vi.mocked(callFunction);
        mockCallFunction.mockResolvedValueOnce({ data: null, error: null });

        const params = {
            email: 'test.user@example.com',
            first_name: 'Test',
            last_name: 'User',
            role_code: 'Student' as const
        };

        const result = await inviteSingleUser(params);

        expect(mockCallFunction)
            .toHaveBeenCalledWith('admin-user-provision', {
                action: 'invite_single_user',
                email: 'test.user@example.com',
                first_name: 'Test',
                last_name: 'User',
                role_code: 'Student',
                redirect_to: `${window.location.origin}/set-password`
            });

        expect(result)
            .toEqual({ data: null, error: null });
    });
});