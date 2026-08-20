"use server";

import { revalidatePath } from "next/cache";
import { createServerClient, getAuthenticatedUser, getAuthenticatedProfile } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  updateProfileSchema,
  changePasswordSchema,
  updatePreferencesSchema,
} from "./schema";
import type {
  ProfileActionResult,
  PasswordActionResult,
  PreferencesActionResult,
} from "./types";

/**
 * Update profile details (Name, Phone, and for HQ: Job Role, Department, Bio).
 * Enforces server-side authorization so a user can only update their own profile.
 */
export async function updateProfileDetailsAction(
  formData: FormData
): Promise<ProfileActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      success: false,
      error: "Authentication required. Please sign in to update your profile.",
    };
  }

  const rawData: Record<string, unknown> = {
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name") || undefined,
    phone: formData.get("phone") || undefined,
    job_role: formData.get("job_role") || undefined,
    department: formData.get("department") || undefined,
    bio: formData.get("bio") || undefined,
  };

  const validation = updateProfileSchema.safeParse(rawData);
  if (!validation.success) {
    const fieldErrors: Record<string, string[]> = {};
    validation.error.errors.forEach((err) => {
      const field = err.path[0] as string;
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(err.message);
    });
    return {
      success: false,
      error: "Please correct the highlighted errors.",
      fieldErrors,
    };
  }

  const profile = await getAuthenticatedProfile();
  const isHQ = profile?.role === "SUPER_ADMIN" || profile?.role === "EMPLOYEE";

  try {
    const adminClient = getAdminClient();
    const supabase = adminClient || (await createServerClient());

    const updatePayload: Record<string, unknown> = {
      first_name: validation.data.first_name,
      last_name: validation.data.last_name,
      phone: validation.data.phone,
      updated_at: new Date().toISOString(),
    };

    // Only allow HQ users to update internal operational fields
    if (isHQ) {
      if (validation.data.job_role !== undefined) {
        updatePayload.job_role = validation.data.job_role;
      }
      if (validation.data.department !== undefined) {
        updatePayload.department = validation.data.department;
      }
      if (validation.data.bio !== undefined) {
        updatePayload.bio = validation.data.bio;
      }
    }

    // Attempt update with full payload
    const { error: updateError } = await (supabase as any)
      .from("profiles")
      .update(updatePayload)
      .eq("id", user.id);

    // If PostgREST reports missing columns (e.g. bio or department in schema cache),
    // fallback to updating the core columns in profiles table
    if (updateError) {
      const isColumnError =
        updateError.message?.toLowerCase().includes("column") ||
        updateError.code === "PGRST204" ||
        updateError.code === "42703";

      if (isColumnError) {
        const basePayload: Record<string, unknown> = {
          first_name: validation.data.first_name,
          last_name: validation.data.last_name,
          phone: validation.data.phone,
          updated_at: new Date().toISOString(),
        };
        if (isHQ && validation.data.job_role !== undefined) {
          basePayload.job_role = validation.data.job_role;
        }

        await (supabase as any)
          .from("profiles")
          .update(basePayload)
          .eq("id", user.id);
      } else {
        return {
          success: false,
          error: "Couldn't update your profile. Please try again.",
        };
      }
    }

    // Always sync metadata to auth.users so bio, department, and custom fields persist reliably
    if (adminClient) {
      try {
        const currentMeta = user.user_metadata || {};
        await adminClient.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...currentMeta,
            first_name: validation.data.first_name,
            last_name: validation.data.last_name,
            full_name: `${validation.data.first_name}${validation.data.last_name ? ` ${validation.data.last_name}` : ""}`,
            phone: validation.data.phone,
            job_role: isHQ ? validation.data.job_role : currentMeta.job_role,
            department: isHQ ? validation.data.department : currentMeta.department,
            bio: isHQ ? validation.data.bio : currentMeta.bio,
          },
        });
      } catch (syncErr) {
        // Non-critical metadata sync notice
      }
    }

    revalidatePath("/hq/settings");
    revalidatePath("/client/settings");
    revalidatePath("/hq");
    revalidatePath("/client");

    return {
      success: true,
      message: "Profile updated successfully.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: "Couldn't update your profile. Please try again.",
    };
  }
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Upload an avatar image directly through a secure server action.
 * Enforces authenticated user ownership, MIME type validation, and file size limits.
 */
export async function uploadAvatarAction(
  formData: FormData
): Promise<ProfileActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      success: false,
      error: "Your session has expired. Please sign in again.",
    };
  }

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File) || file.size === 0) {
    return {
      success: false,
      error: "No image file provided.",
    };
  }

  // 1. Validate file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      error: "Profile photo must be 5 MB or smaller.",
    };
  }

  // 2. Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      success: false,
      error: "Unsupported format. Please upload a JPG, PNG, or WebP photo.",
    };
  }

  try {
    const adminClient = getAdminClient();
    const supabase = adminClient || (await createServerClient());

    // Ensure bucket exists in Supabase storage
    if (adminClient) {
      try {
        await adminClient.storage.createBucket("profile-images", {
          public: true,
          fileSizeLimit: 5242880,
          allowedMimeTypes: ALLOWED_MIME_TYPES,
        });
      } catch {
        // Bucket already created
      }
    }

    const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload new avatar file to profile-images bucket
    const { error: uploadError } = await (supabase as any).storage
      .from("profile-images")
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return {
        success: false,
        error: "Couldn't upload your photo. Please try again.",
      };
    }

    // Get public URL
    const { data: publicUrlData } = (supabase as any).storage
      .from("profile-images")
      .getPublicUrl(filePath);

    const newPublicUrl = publicUrlData.publicUrl;

    // Delete previous avatar file if exists
    const profile = await getAuthenticatedProfile();
    if (profile?.avatar_url && adminClient) {
      try {
        const oldUrl = new URL(profile.avatar_url);
        const parts = oldUrl.pathname.split("/profile-images/");
        if (parts[1]) {
          const oldPath = decodeURIComponent(parts[1]);
          if (oldPath !== filePath) {
            await adminClient.storage.from("profile-images").remove([oldPath]);
          }
        }
      } catch {}
    }

    // Update profiles table
    const { error: dbError } = await (supabase as any)
      .from("profiles")
      .update({
        avatar_url: newPublicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (dbError) {
      console.error("Profile avatar DB update error:", dbError);
    }

    // Sync auth user metadata
    if (adminClient) {
      try {
        await adminClient.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            avatar_url: newPublicUrl,
          },
        });
      } catch {}
    }

    revalidatePath("/hq/settings");
    revalidatePath("/client/settings");
    revalidatePath("/hq");
    revalidatePath("/client");

    return {
      success: true,
      message: "Profile photo updated successfully.",
      avatar_url: newPublicUrl,
    };
  } catch (err: unknown) {
    console.error("Avatar upload handler error:", err);
    return {
      success: false,
      error: "Couldn't upload your photo. Please try again.",
    };
  }
}

/**
 * Update the user's avatar URL.
 */
export async function updateAvatarAction(
  avatarUrl: string
): Promise<ProfileActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      success: false,
      error: "Authentication required.",
    };
  }

  try {
    const adminClient = getAdminClient();
    const supabase = adminClient || (await createServerClient());

    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      return {
        success: false,
        error: "Couldn't update profile photo. Please try again.",
      };
    }

    if (adminClient) {
      try {
        await adminClient.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            avatar_url: avatarUrl,
          },
        });
      } catch {}
    }

    revalidatePath("/hq/settings");
    revalidatePath("/client/settings");
    revalidatePath("/hq");
    revalidatePath("/client");

    return {
      success: true,
      message: "Profile photo updated successfully.",
      avatar_url: avatarUrl,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: "Couldn't update profile photo. Please try again.",
    };
  }
}

/**
 * Remove the user's avatar (clears DB record and deletes image from storage).
 */
export async function removeAvatarAction(): Promise<ProfileActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      success: false,
      error: "Authentication required.",
    };
  }

  try {
    const profile = await getAuthenticatedProfile();
    const adminClient = getAdminClient();
    const supabase = adminClient || (await createServerClient());

    // If an existing avatar URL is in storage, delete it
    if (profile?.avatar_url && adminClient) {
      try {
        const url = new URL(profile.avatar_url);
        const parts = url.pathname.split("/profile-images/");
        if (parts[1]) {
          const filePath = decodeURIComponent(parts[1]);
          await adminClient.storage.from("profile-images").remove([filePath]);
        }
      } catch {
        // Continue even if storage deletion fails
      }
    }

    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      return {
        success: false,
        error: "Couldn't remove avatar. Please try again.",
      };
    }

    if (adminClient) {
      try {
        await adminClient.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            avatar_url: null,
          },
        });
      } catch {}
    }

    revalidatePath("/hq/settings");
    revalidatePath("/client/settings");
    revalidatePath("/hq");
    revalidatePath("/client");

    return {
      success: true,
      message: "Avatar removed successfully.",
      avatar_url: null,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: "Couldn't remove avatar. Please try again.",
    };
  }
}

/**
 * Change the user's password securely via Supabase Auth.
 * Reauthenticates the current password and sets the new password.
 * Passwords are never stored in database tables or logged.
 */
export async function changePasswordAction(
  formData: FormData
): Promise<PasswordActionResult> {
  const user = await getAuthenticatedUser();
  if (!user || !user.email) {
    return {
      success: false,
      error: "Authentication required.",
    };
  }

  const currentPassword = formData.get("current_password") as string;
  const newPassword = formData.get("new_password") as string;
  const confirmNewPassword = formData.get("confirm_new_password") as string;

  const validation = changePasswordSchema.safeParse({
    current_password: currentPassword,
    new_password: newPassword,
    confirm_new_password: confirmNewPassword,
  });

  if (!validation.success) {
    const fieldErrors: Record<string, string[]> = {};
    validation.error.errors.forEach((err) => {
      const field = err.path[0] as string;
      if (!fieldErrors[field]) fieldErrors[field] = [];
      fieldErrors[field].push(err.message);
    });
    return {
      success: false,
      error: validation.error.errors[0]?.message || "Invalid input.",
      fieldErrors,
    };
  }

  try {
    const supabase = await createServerClient();

    // 1. Verify current password by attempting sign in
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: validation.data.current_password,
    });

    if (verifyErr) {
      return {
        success: false,
        error: "Current password is incorrect.",
      };
    }

    // 2. Update to new password
    const { error: updateErr } = await supabase.auth.updateUser({
      password: validation.data.new_password,
    });

    if (updateErr) {
      return {
        success: false,
        error: updateErr.message || "Failed to update password.",
      };
    }

    return {
      success: true,
      message: "Password updated successfully.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: "An unexpected error occurred while updating your password.",
    };
  }
}

/**
 * Update user notification preferences.
 */
export async function updatePreferencesAction(
  formData: FormData
): Promise<PreferencesActionResult> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      success: false,
      error: "Authentication required.",
    };
  }

  const inApp = formData.get("in_app_notifications") === "true";
  const sound = formData.get("notification_sound") === "true";
  const email = formData.get("email_notifications") === "true";

  const validation = updatePreferencesSchema.safeParse({
    in_app_notifications: inApp,
    notification_sound: sound,
    email_notifications: email,
  });

  if (!validation.success) {
    return {
      success: false,
      error: "Invalid preference data.",
    };
  }

  try {
    const adminClient = getAdminClient();
    const supabase = adminClient || (await createServerClient());

    const prefPayload = {
      user_id: user.id,
      in_app_notifications: validation.data.in_app_notifications,
      notification_sound: validation.data.notification_sound,
      email_notifications: validation.data.email_notifications,
      updated_at: new Date().toISOString(),
    };

    const { error } = await (supabase as any)
      .from("user_preferences")
      .upsert(prefPayload, {
        onConflict: "user_id",
      });

    // If table doesn't exist, store in user metadata fallback
    if (error && adminClient) {
      try {
        await adminClient.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            preferences: {
              in_app_notifications: validation.data.in_app_notifications,
              notification_sound: validation.data.notification_sound,
              email_notifications: validation.data.email_notifications,
            },
          },
        });
      } catch {}
    }

    revalidatePath("/hq/settings");
    revalidatePath("/client/settings");

    return {
      success: true,
      message: "Preferences saved successfully.",
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: "Failed to update preferences.",
    };
  }
}
