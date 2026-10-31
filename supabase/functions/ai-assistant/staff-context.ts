import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { AssistantMode } from './types.ts';

// Staff roles get their own dashboard figures as context. Each RPC runs with the caller's
// session, so the database's role checks and department scoping still apply.
const STAFF_DASHBOARD: Record<string, { rpc: string; mode: AssistantMode }> = {
    Admin: { rpc: 'fn_get_admin_dashboard_stats', mode: 'admin_overview' },
    Dean: { rpc: 'fn_get_dean_dashboard', mode: 'dean_overview' },
    Registrar: { rpc: 'fn_get_registrar_dashboard', mode: 'registrar_overview' }
};

// The reply still has to fit the client's timeout, so a slow database only costs the figures
export const CONTEXT_TIMEOUT_MS = 5000;

export function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T | null> {
    return Promise.race([
        Promise.resolve(promise),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))
    ]);
}

export async function loadStaffOverview(
    client: SupabaseClient,
    role: string
): Promise<{ mode: AssistantMode; dashboard: Record<string, unknown> } | null> {
    const entry = STAFF_DASHBOARD[role];

    if (!entry) {
        return null;
    }

    const result = await withTimeout(client.rpc(entry.rpc), CONTEXT_TIMEOUT_MS);

    if (!result || result.error || !result.data || typeof result.data !== 'object') {
        return null;
    }

    return { mode: entry.mode, dashboard: result.data as Record<string, unknown> };
}
