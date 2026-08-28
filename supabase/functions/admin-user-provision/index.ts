import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
    });
}

function failure(message: string, status: number, detail?: unknown): Response {
    return jsonResponse({ success: false, message, detail }, status);
}

function success(data: Record<string, unknown>, message?: string): Response {
    return jsonResponse({ success: true, message, ...data }, 200);
}

interface UserInvitePayload {
    email: string;
    first_name: string;
    last_name: string;
    role_code: string;
}

interface RequestBody {
    action: 'invite_single_user' | 'bulk_provision_users' | 'resend_invite' | 'reset_password';
    email?: string;
    first_name?: string;
    last_name?: string;
    role_code?: string;
    users?: UserInvitePayload[];
    redirect_to?: string;
}

Deno.serve(async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
        return failure('Unsupported request method.', 405);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
        return failure('Server configuration error: missing Supabase environment keys.', 500);
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        return failure('Missing Authorization header.', 401);
    }

    // Client bound to caller's JWT to verify Admin authority
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? serviceRoleKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false }
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
        return failure('Unauthorized: invalid session.', 401);
    }

    // Assert that the caller has Admin role in database
    const { error: roleGuardError } = await userClient.rpc('fn_assert_role', {
        p_role_code: 'Admin'
    });

    if (roleGuardError) {
        return failure('Forbidden: caller does not have administrative privileges.', 403, roleGuardError.message);
    }

    // Service-role admin client (bypasses RLS exclusively on server)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    let body: RequestBody;
    try {
        body = await request.json();
    }
    catch {
        return failure('Invalid JSON payload.', 400);
    }

    const { action } = body;
    const defaultRedirect = body.redirect_to || `${request.headers.get('origin') || ''}/set-password`;

    // 1. Single User Invitation Flow
    if (action === 'invite_single_user') {
        const { email, first_name, last_name, role_code } = body;
        if (!email || !first_name || !last_name || !role_code) {
            return failure('Missing required user fields (email, first_name, last_name, role_code).', 400);
        }

        const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
            data: { first_name, last_name },
            redirectTo: defaultRedirect
        });

        if (inviteError) {
            return failure(inviteError.message, 400);
        }

        const authId = inviteData.user.id;

        const { data: provisionData, error: provisionError } = await adminClient.rpc('fn_provision_single_user', {
            p_auth_id: authId,
            p_email: email,
            p_first_name: first_name,
            p_last_name: last_name,
            p_role_code: role_code
        });

        if (provisionError) {
            // Roll back created auth user on database failure
            await adminClient.auth.admin.deleteUser(authId);
            return failure(provisionError.message, 400);
        }

        return success({ data: provisionData }, 'User invited successfully.');
    }

    // 2. Resend Invite / Reset Password Flow
    if (action === 'resend_invite' || action === 'reset_password') {
        const { email } = body;
        if (!email) {
            return failure('Email is required.', 400);
        }

        const { error: resetError } = await adminClient.auth.resetPasswordForEmail(email, {
            redirectTo: defaultRedirect
        });

        if (resetError) {
            return failure(resetError.message, 400);
        }

        return success({}, 'Password setup link sent successfully.');
    }

    // 3. Bulk User Provisioning Flow
    if (action === 'bulk_provision_users') {
        const users = body.users;
        if (!Array.isArray(users) || users.length === 0) {
            return failure('Users array is required.', 400);
        }

        const provisionedUsers: {
            auth_id: string;
            email: string;
            first_name: string;
            last_name: string;
            role_code: string;
        }[] = [];
        const errors: string[] = [];

        for (const user of users) {
            try {
                const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
                    user.email,
                    {
                        data: {
                            first_name: user.first_name,
                            last_name: user.last_name
                        },
                        redirectTo: defaultRedirect
                    }
                );

                if (inviteError) {
                    errors.push(`${user.email}: ${inviteError.message}`);
                    continue;
                }

                provisionedUsers.push({
                    auth_id: inviteData.user.id,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    role_code: user.role_code
                });
            }
            catch (err: unknown) {
                const msg = err instanceof Error ? err.message : 'Unknown error during invitation';
                errors.push(`${user.email}: ${msg}`);
            }
        }

        if (provisionedUsers.length === 0) {
            return success({ provisioned_count: 0, errors }, 'No accounts were provisioned.');
        }

        const { data: bulkData, error: bulkError } = await adminClient.rpc('fn_bulk_provision_users', {
            p_users: provisionedUsers
        });

        if (bulkError) {
            // Roll back all invited auth users
            for (const user of provisionedUsers) {
                await adminClient.auth.admin.deleteUser(user.auth_id);
            }
            return failure(bulkError.message, 400, { errors: [...errors, bulkError.message] });
        }

        const orphanedAuthIds: string[] = (bulkData as { failed_auth_ids?: string[] })?.failed_auth_ids ?? [];
        for (const orphanId of orphanedAuthIds) {
            await adminClient.auth.admin.deleteUser(orphanId);
        }

        const provisionedCount = (bulkData as { provisioned_count?: number })?.provisioned_count ?? 0;
        const rpcErrors = (bulkData as { errors?: string[] })?.errors ?? [];

        return success({
            provisioned_count: provisionedCount,
            errors: [...errors, ...rpcErrors]
        }, `Provisioned ${provisionedCount} user(s).`);
    }

    return failure(`Unknown action: ${action}`, 400);
});
