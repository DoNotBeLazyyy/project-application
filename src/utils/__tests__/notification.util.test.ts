import { describe, expect, it } from 'vitest';
import { resolveNotificationPath } from '@utils/notification.util';

describe('notification.util', () => {
    describe('resolveNotificationPath', () => {
        it('returns null when actionUrl or activeRole is null', () => {
            expect(resolveNotificationPath(null, 'Student')).toBeNull();
            expect(resolveNotificationPath('/student/subjects', null)).toBeNull();
        });

        it('resolves announcements query parameters', () => {
            expect(resolveNotificationPath('/announcements/123-abc', 'Student'))
                .toBe('?announcementId=123-abc');
            expect(resolveNotificationPath('/student/announcements/123-abc', 'Student'))
                .toBe('?announcementId=123-abc');
        });

        it('resolves events query parameters', () => {
            expect(resolveNotificationPath('/events/456-def', 'Faculty'))
                .toBe('?eventId=456-def');
            expect(resolveNotificationPath('/faculty/events/456-def', 'Faculty'))
                .toBe('?eventId=456-def');
        });

        it('normalizes student section urls to subjects', () => {
            expect(resolveNotificationPath('/student/sections/sec-uuid', 'Student'))
                .toBe('/student/subjects/sec-uuid');
        });

        it('preserves valid student subjects urls', () => {
            expect(resolveNotificationPath('/student/subjects/enrollment-uuid', 'Student'))
                .toBe('/student/subjects/enrollment-uuid');
        });

        it('normalizes faculty subjects urls to sections', () => {
            expect(resolveNotificationPath('/faculty/subjects/sec-uuid', 'Faculty'))
                .toBe('/faculty/sections/sec-uuid');
        });

        it('appends ?tab=assessments for faculty section notification when notification_type is Assessment', () => {
            expect(resolveNotificationPath('/faculty/sections/sec-uuid', 'Faculty', 'Assessment'))
                .toBe('/faculty/sections/sec-uuid?tab=assessments');
        });

        it('deep links to submissions for faculty assessment without submissions subpath', () => {
            expect(resolveNotificationPath('/faculty/sections/sec-uuid/assessments/asm-uuid', 'Faculty'))
                .toBe('/faculty/sections/sec-uuid/assessments/asm-uuid/submissions');
        });

        it('preserves existing submissions subpath for faculty assessment', () => {
            expect(resolveNotificationPath('/faculty/sections/sec-uuid/assessments/asm-uuid/submissions', 'Faculty'))
                .toBe('/faculty/sections/sec-uuid/assessments/asm-uuid/submissions');
        });
    });
});
