-- ==========================================================
-- Orbit by Celestia Studios — Profile & Settings Foundation
-- Migration: 00018_profile_and_settings_schema.sql
-- ==========================================================

-- 1. Extend public.profiles with department and bio for HQ users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department TEXT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department);

-- 2. Create public.user_preferences Table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  in_app_notifications BOOLEAN NOT NULL DEFAULT true,
  notification_sound BOOLEAN NOT NULL DEFAULT true,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- Attach updated_at trigger to user_preferences
DROP TRIGGER IF EXISTS set_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER set_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for user_preferences
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
  CREATE POLICY "Users can view own preferences"
    ON public.user_preferences
    FOR SELECT
    USING (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
  CREATE POLICY "Users can insert own preferences"
    ON public.user_preferences
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
  CREATE POLICY "Users can update own preferences"
    ON public.user_preferences
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
END $$;

-- 4. Create profile-images Storage Bucket if it does not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 5. Storage RLS Policies for profile-images Bucket
-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Public can view profile images (so avatars load across UI components)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public can view profile images" ON storage.objects;
  CREATE POLICY "Public can view profile images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'profile-images');

  -- Users can upload/insert avatars ONLY into their own folder: profile-images/<user-id>/...
  DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
  CREATE POLICY "Users can upload own avatar"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'profile-images' AND
      (auth.uid())::text = (storage.foldername(name))[1]
    );

  -- Users can update/replace avatars ONLY in their own folder
  DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
  CREATE POLICY "Users can update own avatar"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'profile-images' AND
      (auth.uid())::text = (storage.foldername(name))[1]
    )
    WITH CHECK (
      bucket_id = 'profile-images' AND
      (auth.uid())::text = (storage.foldername(name))[1]
    );

  -- Users can delete avatars ONLY in their own folder
  DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
  CREATE POLICY "Users can delete own avatar"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'profile-images' AND
      (auth.uid())::text = (storage.foldername(name))[1]
    );
END $$;
