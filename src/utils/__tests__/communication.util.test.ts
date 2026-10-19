import { canManageCommunication } from '@utils/communication.util';
import { describe, expect, it } from 'vitest';

describe('canManageCommunication', () => {
    it('returns false if currentUserId or currentRole is missing', () => {
        expect(canManageCommunication({ created_by: 'u1' }, null, 'Admin')).toBe(false);
        expect(canManageCommunication({ created_by: 'u1' }, 'u1', null)).toBe(false);
        expect(canManageCommunication({ created_by: 'u1' }, undefined, undefined)).toBe(false);
    });

    describe('Admin role', () => {
        it('allows Admin to manage any announcement regardless of author or audience', () => {
            expect(canManageCommunication({ created_by: 'someone-else', created_by_role: 'Dean', target_audience: 'Global' }, 'admin-id', 'Admin')).toBe(true);
            expect(canManageCommunication({ created_by: 'someone-else', created_by_role: 'Registrar', target_audience: 'Student' }, 'admin-id', 'Admin')).toBe(true);
            expect(canManageCommunication({ created_by: 'someone-else', created_by_role: 'Faculty', target_audience: 'Section' }, 'admin-id', 'Admin')).toBe(true);
        });
    });

    describe('Creator ownership', () => {
        it('allows any creator to manage their own item', () => {
            expect(canManageCommunication({ created_by: 'user-123', created_by_role: 'Faculty', target_audience: 'Section' }, 'user-123', 'Faculty')).toBe(true);
            expect(canManageCommunication({ created_by: 'user-123', created_by_role: 'Dean', target_audience: 'Global' }, 'user-123', 'Dean')).toBe(true);
            expect(canManageCommunication({ created_by: 'user-123', created_by_role: 'Registrar', target_audience: 'Student' }, 'user-123', 'Registrar')).toBe(true);
        });
    });

    describe('Dean role', () => {
        it('prevents a Dean from managing Admin announcements or events', () => {
            const adminItem = { created_by: 'admin-id', created_by_role: 'Admin', target_audience: 'Global' as const };
            expect(canManageCommunication(adminItem, 'dean-id', 'Dean')).toBe(false);
        });

        it('prevents a Dean from managing Registrar announcements or events', () => {
            const regItem = { created_by: 'reg-id', created_by_role: 'Registrar', target_audience: 'Global' as const };
            expect(canManageCommunication(regItem, 'dean-id', 'Dean')).toBe(false);
        });

        it('allows a Dean to manage institutional announcements created by other Deans', () => {
            const peerDeanItem = { created_by: 'other-dean', created_by_role: 'Dean', target_audience: 'Global' as const };
            expect(canManageCommunication(peerDeanItem, 'dean-id', 'Dean')).toBe(true);
        });

        it('prevents a Dean from managing Section announcements created by other Deans', () => {
            const peerSectionItem = { created_by: 'other-dean', created_by_role: 'Dean', target_audience: 'Section' as const };
            expect(canManageCommunication(peerSectionItem, 'dean-id', 'Dean')).toBe(false);
        });
    });

    describe('Registrar role', () => {
        it('prevents a Registrar from managing Admin announcements or events', () => {
            const adminItem = { created_by: 'admin-id', created_by_role: 'Admin', target_audience: 'Global' as const };
            expect(canManageCommunication(adminItem, 'reg-id', 'Registrar')).toBe(false);
        });

        it('prevents a Registrar from managing Dean announcements or events', () => {
            const deanItem = { created_by: 'dean-id', created_by_role: 'Dean', target_audience: 'Global' as const };
            expect(canManageCommunication(deanItem, 'reg-id', 'Registrar')).toBe(false);
        });

        it('allows a Registrar to manage institutional announcements created by other Registrars', () => {
            const peerRegItem = { created_by: 'other-reg', created_by_role: 'Registrar', target_audience: 'Student' as const };
            expect(canManageCommunication(peerRegItem, 'reg-id', 'Registrar')).toBe(true);
        });
    });

    describe('Faculty role', () => {
        it('prevents a Faculty from managing other users announcements', () => {
            expect(canManageCommunication({ created_by: 'admin-id', created_by_role: 'Admin', target_audience: 'Global' }, 'faculty-id', 'Faculty')).toBe(false);
            expect(canManageCommunication({ created_by: 'dean-id', created_by_role: 'Dean', target_audience: 'Faculty' }, 'faculty-id', 'Faculty')).toBe(false);
            expect(canManageCommunication({ created_by: 'other-prof', created_by_role: 'Faculty', target_audience: 'Section' }, 'faculty-id', 'Faculty')).toBe(false);
        });
    });

    describe('Student role', () => {
        it('prevents a Student from managing any communications', () => {
            expect(canManageCommunication({ created_by: 'student-id', created_by_role: 'Student', target_audience: 'Student' }, 'student-id', 'Student')).toBe(false);
        });
    });
});
