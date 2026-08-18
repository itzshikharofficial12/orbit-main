import type { OrbitRole, Profile } from "@/lib/supabase/types";

export interface AuthState {
  user: Profile | null;
  role: OrbitRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthActionResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
}
