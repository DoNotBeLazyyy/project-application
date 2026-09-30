import { describe, expect, it } from 'vitest';
import { ITEM_TYPE_OPTIONS } from '../pages/shared/announcement-management/AnnouncementForm';

describe('Combined Announcements & Events', () => {
    it('provides hardcoded item type options for Announcement and Event', () => {
        expect(ITEM_TYPE_OPTIONS).toBeDefined();
        expect(ITEM_TYPE_OPTIONS).toHaveLength(2);
        expect(ITEM_TYPE_OPTIONS).toEqual([
            { label: 'Announcement', value: 'Announcement' },
            { label: 'Event', value: 'Event' }
        ]);
    });

    it('verifies item types are strictly Announcement and Event values', () => {
        const values = ITEM_TYPE_OPTIONS.map((opt) => opt.value);
        expect(values).toContain('Announcement');
        expect(values).toContain('Event');
    });
});
