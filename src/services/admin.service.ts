import { callRpc } from '@services/supabase.wrapper';
import { AdminDashboardStats } from '@type/admin.type';
import { ServiceResult } from '@type/service.type';

export async function getAdminDashboardStats(): Promise<ServiceResult<AdminDashboardStats>> {
    return callRpc<AdminDashboardStats>('fn_get_admin_dashboard_stats');
}