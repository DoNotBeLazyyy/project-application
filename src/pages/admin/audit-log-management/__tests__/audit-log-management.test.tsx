import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import AuditLogDetailContent from '../components/AuditLogDetailContent';
import FilterAuditLogForm from '../forms/FilterAuditLogForm';
import { useAuditLogTableConfig } from '../hooks/useAuditLogTableConfig';
import { AuditLogFilterValues, AuditLogRow } from '@type/audit-log.type';

describe('useAuditLogTableConfig', () => {
    it('configures table columns with required fields and payload inspector', () => {
        const onViewPayload = vi.fn();
        let columnDefs: any[] = [];

        function TestComponent() {
            const config = useAuditLogTableConfig({ onViewPayload });
            columnDefs = config.columnDefs;
            return null;
        }

        render(<TestComponent />);

        const fieldNames = columnDefs.map((col) => col.field);
        expect(fieldNames).toContain('changed_at');
        expect(fieldNames).toContain('action');
        expect(fieldNames).toContain('event_name');
        expect(fieldNames).toContain('table_name');
        expect(fieldNames).toContain('changed_by_name');
        expect(fieldNames).toContain('id');
    });
});

describe('AuditLogDetailContent (JSON Payload Inspector)', () => {
    const mockUserProvisionedLog: AuditLogRow = {
        id: '11111111-1111-1111-1111-111111111111',
        action: 'INSERT',
        event_name: 'USER_PROVISIONED',
        table_name: 'users',
        record_id: 'user-1234',
        old_data: null,
        new_data: {
            id: 'user-1234',
            email: 'baki@aujas.edu.ph',
            first_name: 'Baki',
            last_name: 'Hanma',
            status: 'Active'
        },
        changed_fields: null,
        changed_by: 'admin-001',
        changed_by_name: 'Admin Master',
        description: 'USER_PROVISIONED: baki@aujas.edu.ph',
        changed_at: '2026-10-19T09:00:00Z',
        total_count: 1
    };

    it('renders transaction banner with action badge and event name', () => {
        render(<AuditLogDetailContent row={mockUserProvisionedLog} />);

        expect(screen.getByText('INSERT')).toBeInTheDocument();
        expect(screen.getByText('USER_PROVISIONED')).toBeInTheDocument();
        expect(screen.getByText('Admin Master')).toBeInTheDocument();
        expect(screen.getByText('USER_PROVISIONED: baki@aujas.edu.ph')).toBeInTheDocument();
    });

    it('displays state diff with field details and indicates initial creation for INSERT', () => {
        render(<AuditLogDetailContent row={mockUserProvisionedLog} />);

        // By default State Diff tab is active
        expect(screen.getByText('State Diff (Before / After)')).toBeInTheDocument();
        expect(screen.getByText('email')).toBeInTheDocument();
        expect(screen.getByText('baki@aujas.edu.ph')).toBeInTheDocument();
        expect(screen.getAllByText('(None — initial creation)').length).toBeGreaterThan(0);
    });

    it('switches to raw JSON payload view when clicked', () => {
        render(<AuditLogDetailContent row={mockUserProvisionedLog} />);

        const jsonTab = screen.getByRole('button', { name: /raw json payload/i });
        fireEvent.click(jsonTab);

        expect(screen.getByText(/payload before/i)).toBeInTheDocument();
        expect(screen.getByText(/payload after/i)).toBeInTheDocument();
        expect(screen.getByText(/None \(Initial creation/i)).toBeInTheDocument();
        expect(screen.getByText(/"email": "baki@aujas.edu.ph"/i)).toBeInTheDocument();
    });
});

describe('FilterAuditLogForm', () => {
    function FilterWrapper() {
        const { control } = useForm<AuditLogFilterValues>({
            defaultValues: {
                action: 'All',
                table_name: 'All',
                event_name: 'All',
                changed_by: 'All',
                date_from: '',
                date_to: ''
            }
        });

        return (
            <FilterAuditLogForm
                control={control}
                id="test-filter-form"
                tableOptions={[{ label: 'Users', value: 'users' }]}
                eventOptions={[{ label: 'USER_PROVISIONED', value: 'USER_PROVISIONED' }]}
                operatorOptions={[{ label: 'Admin Master', value: 'Admin Master' }]}
            />
        );
    }

    it('renders all filterable fields for forensic audit trail', () => {
        render(<FilterWrapper />);

        expect(screen.getByText('Action Type')).toBeInTheDocument();
        expect(screen.getByText('Transaction Event')).toBeInTheDocument();
        expect(screen.getByText('Target Entity / Table')).toBeInTheDocument();
        expect(screen.getByText('Operator / Performed By')).toBeInTheDocument();
        expect(screen.getByText('Date From')).toBeInTheDocument();
        expect(screen.getByText('Date To')).toBeInTheDocument();
    });
});
