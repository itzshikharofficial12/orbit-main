import type { Profile, UserPreferences, EmployeeJobRole } from "@/lib/supabase/types";

export interface ProfileWithSettings {
  profile: Profile;
  preferences: UserPreferences;
  clientName?: string | null;
}

export interface ProfileActionResult {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  avatar_url?: string | null;
}

export interface PasswordActionResult {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export interface PreferencesActionResult {
  success: boolean;
  message?: string;
  error?: string;
}
