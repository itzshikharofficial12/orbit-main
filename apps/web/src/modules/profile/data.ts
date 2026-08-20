import { createServerClient, getAuthenticatedProfile, getAuthenticatedUser } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import type { ProfileWithSettings } from "./types";
import type { UserPreferences, Profile } from "@/lib/supabase/types";

export async function getProfileAndPreferences(): Promise<ProfileWithSettings | null> {
  const profile = await getAuthenticatedProfile();
  const user = await getAuthenticatedUser();
  if (!profile || !user) return null;

  const adminClient = getAdminClient();
  const supabase = adminClient || (await createServerClient());

  let clientName: string | null = null;
  if (profile.client_id) {
    try {
      const { data: clientData } = await (supabase as any)
        .from("clients")
        .select("name")
        .eq("id", profile.client_id)
        .maybeSingle();

      if (clientData) {
        clientName = clientData.name;
      }
    } catch {
      // Non-critical client fetch error
    }
  }

  // Hydrate bio, department, and phone from metadata fallback if not in profile record
  const meta = user.user_metadata || {};
  const enrichedProfile: Profile = {
    ...profile,
    department: (profile as any).department || meta.department || null,
    bio: (profile as any).bio || meta.bio || null,
    phone: profile.phone || meta.phone || null,
    job_role: profile.job_role || meta.job_role || null,
  };

  // Fetch or construct default user preferences with fallback to user_metadata
  const metaPrefs = meta.preferences || {};
  const defaultPreferences: UserPreferences = {
    user_id: profile.id,
    in_app_notifications:
      metaPrefs.in_app_notifications !== undefined
        ? Boolean(metaPrefs.in_app_notifications)
        : true,
    notification_sound:
      metaPrefs.notification_sound !== undefined
        ? Boolean(metaPrefs.notification_sound)
        : true,
    email_notifications:
      metaPrefs.email_notifications !== undefined
        ? Boolean(metaPrefs.email_notifications)
        : true,
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };

  let preferences = defaultPreferences;

  try {
    const { data: prefData, error: prefError } = await (supabase as any)
      .from("user_preferences")
      .select("*")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (!prefError && prefData) {
      preferences = prefData as UserPreferences;
    }
  } catch {
    // Fall back gracefully to metadata preferences
  }

  return {
    profile: enrichedProfile,
    preferences,
    clientName,
  };
}
