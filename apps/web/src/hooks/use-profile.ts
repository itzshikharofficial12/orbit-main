"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const supabase = createBrowserClient();

    async function loadProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (isMounted) {
            setProfile(null);
            setIsLoading(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (isMounted) {
          if (!error && data) {
            setProfile(data as Profile);
          } else {
            const meta = user.user_metadata || {};
            setProfile({
              id: user.id,
              email: user.email || "",
              first_name: meta.first_name || meta.full_name?.split(" ")[0] || "User",
              last_name: meta.last_name || null,
              role: meta.role || "CLIENT",
              client_id: meta.client_id || null,
              avatar_url: meta.avatar_url || null,
              created_at: user.created_at,
              updated_at: user.updated_at || user.created_at,
            });
          }
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  return { profile, isLoading };
}
