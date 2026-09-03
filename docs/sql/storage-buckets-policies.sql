INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('materials', 'materials', true),
    ('announcements', 'announcements', true),
    ('events', 'events', true),
    ('submissions', 'submissions', false),
    ('logos', 'logos', true),
    ('discussions', 'discussions', false),
    ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "materials_objects_select" ON storage.objects;
CREATE POLICY "materials_objects_select"
    ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'materials');

DROP POLICY IF EXISTS "materials_objects_insert" ON storage.objects;
CREATE POLICY "materials_objects_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'materials');

DROP POLICY IF EXISTS "materials_objects_update" ON storage.objects;
CREATE POLICY "materials_objects_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'materials');

DROP POLICY IF EXISTS "materials_objects_delete" ON storage.objects;
CREATE POLICY "materials_objects_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'materials');

DROP POLICY IF EXISTS "announcements_objects_select" ON storage.objects;
CREATE POLICY "announcements_objects_select"
    ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'announcements');

DROP POLICY IF EXISTS "announcements_objects_insert" ON storage.objects;
CREATE POLICY "announcements_objects_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'announcements');

DROP POLICY IF EXISTS "announcements_objects_update" ON storage.objects;
CREATE POLICY "announcements_objects_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'announcements');

DROP POLICY IF EXISTS "announcements_objects_delete" ON storage.objects;
CREATE POLICY "announcements_objects_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'announcements');

DROP POLICY IF EXISTS "events_objects_select" ON storage.objects;
CREATE POLICY "events_objects_select"
    ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'events');

DROP POLICY IF EXISTS "events_objects_insert" ON storage.objects;
CREATE POLICY "events_objects_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'events');

DROP POLICY IF EXISTS "events_objects_update" ON storage.objects;
CREATE POLICY "events_objects_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'events');

DROP POLICY IF EXISTS "events_objects_delete" ON storage.objects;
CREATE POLICY "events_objects_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'events');

DROP POLICY IF EXISTS "submissions_objects_select" ON storage.objects;
CREATE POLICY "submissions_objects_select"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'submissions');

DROP POLICY IF EXISTS "submissions_objects_insert" ON storage.objects;
CREATE POLICY "submissions_objects_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'submissions');

DROP POLICY IF EXISTS "submissions_objects_update" ON storage.objects;
CREATE POLICY "submissions_objects_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'submissions');

DROP POLICY IF EXISTS "submissions_objects_delete" ON storage.objects;
CREATE POLICY "submissions_objects_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'submissions');

DROP POLICY IF EXISTS "logos_objects_select" ON storage.objects;
CREATE POLICY "logos_objects_select"
    ON storage.objects
    FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "logos_objects_insert" ON storage.objects;
CREATE POLICY "logos_objects_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'logos');

DROP POLICY IF EXISTS "logos_objects_update" ON storage.objects;
CREATE POLICY "logos_objects_update"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "logos_objects_delete" ON storage.objects;
CREATE POLICY "logos_objects_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'logos');

