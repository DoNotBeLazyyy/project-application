import { listUsers } from '@services/user.service';
import * as supabaseWrapper from '@services/supabase.wrapper';
import { describe, expect, it, vi } from 'vitest';

describe('Admin User Management Role Filter Navigation', () => {
    it('queries users with Student role when p_role_code is Student', async () => {
        const callRpcSpy = vi.spyOn(supabaseWrapper, 'callRpc').mockResolvedValue({
            data: {
                page: 1,
                rows: [],
                size: 20,
                total_count: 0
            },
            error: null
        });

        await listUsers(1, 20, '', [], {
            city: '',
            province: '',
            role_code: 'Student',
            status: 'All'
        });

        expect(callRpcSpy).toHaveBeenCalledWith('fn_list_users_json', {
            p_city: null,
            p_page: 1,
            p_province: null,
            p_role_code: 'Student',
            p_search: null,
            p_size: 20,
            p_sort: null,
            p_status: 'All'
        });

        callRpcSpy.mockRestore();
    });

    it('queries users with Faculty role when p_role_code is Faculty', async () => {
        const callRpcSpy = vi.spyOn(supabaseWrapper, 'callRpc').mockResolvedValue({
            data: {
                page: 1,
                rows: [],
                size: 20,
                total_count: 0
            },
            error: null
        });

        await listUsers(1, 20, '', [], {
            city: '',
            province: '',
            role_code: 'Faculty',
            status: 'All'
        });

        expect(callRpcSpy).toHaveBeenCalledWith('fn_list_users_json', {
            p_city: null,
            p_page: 1,
            p_province: null,
            p_role_code: 'Faculty',
            p_search: null,
            p_size: 20,
            p_sort: null,
            p_status: 'All'
        });

        callRpcSpy.mockRestore();
    });
});
