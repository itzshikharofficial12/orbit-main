"use client";

import * as React from "react";
import {
  User,
  Shield,
  Bell,
  CheckCircle2,
  Lock,
  Loader2,
  Save,
  Volume2,
  Info,
  LogOut,
  Building2,
  Phone,
  Briefcase,
  Layers,
} from "lucide-react";
import type { ProfileWithSettings } from "../types";
import { ProfileAvatarUploader } from "./profile-avatar-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNotificationSound } from "@/modules/notifications/hooks/use-notification-sound";
import { signOutAction } from "@/modules/auth/actions";
import {
  updateProfileDetailsAction,
  changePasswordAction,
  updatePreferencesAction,
} from "../actions";

interface ProfileSettingsViewProps {
  initialData: ProfileWithSettings;
  basePath: "/hq" | "/client";
}

type TabKey = "profile" | "security" | "notifications" | "account";

export function ProfileSettingsView({
  initialData,
  basePath,
}: ProfileSettingsViewProps) {
  const [activeTab, setActiveTab] = React.useState<TabKey>("profile");

  // Profile Form State
  const [profileData, setProfileData] = React.useState({
    first_name: initialData.profile.first_name || "",
    last_name: initialData.profile.last_name || "",
    phone: initialData.profile.phone || "",
    job_role: initialData.profile.job_role || "",
    department: (initialData.profile as any).department || "",
    bio: (initialData.profile as any).bio || "",
  });
  const [profileAvatarUrl, setProfileAvatarUrl] = React.useState<string | null>(
    initialData.profile.avatar_url
  );
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [profileSuccess, setProfileSuccess] = React.useState<string | null>(null);
  const [profileError, setProfileError] = React.useState<string | null>(null);
  const [profileFieldErrors, setProfileFieldErrors] = React.useState<
    Record<string, string[]>
  >({});

  // Security Form State
  const [passwordData, setPasswordData] = React.useState({
    current_password: "",
    new_password: "",
    confirm_new_password: "",
  });
  const [passwordLoading, setPasswordLoading] = React.useState(false);
  const [passwordSuccess, setPasswordSuccess] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [passwordFieldErrors, setPasswordFieldErrors] = React.useState<
    Record<string, string[]>
  >({});

  // Preferences Form State
  const [preferences, setPreferences] = React.useState({
    in_app_notifications: initialData.preferences.in_app_notifications,
    notification_sound: initialData.preferences.notification_sound,
    email_notifications: initialData.preferences.email_notifications,
  });
  const [prefLoading, setPrefLoading] = React.useState(false);
  const [prefSuccess, setPrefSuccess] = React.useState<string | null>(null);
  const [prefError, setPrefError] = React.useState<string | null>(null);

  const { playSound } = useNotificationSound();

  const isHQ =
    initialData.profile.role === "SUPER_ADMIN" ||
    initialData.profile.role === "EMPLOYEE";

  const fullName = `${profileData.first_name}${profileData.last_name ? ` ${profileData.last_name}` : ""}`.trim();

  // 1. Submit Profile Updates
  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(null);
    setProfileFieldErrors({});

    const formData = new FormData();
    formData.append("first_name", profileData.first_name);
    if (profileData.last_name) formData.append("last_name", profileData.last_name);
    if (profileData.phone) formData.append("phone", profileData.phone);
    if (isHQ) {
      if (profileData.job_role) formData.append("job_role", profileData.job_role);
      if (profileData.department) formData.append("department", profileData.department);
      if (profileData.bio) formData.append("bio", profileData.bio);
    }

    try {
      const result = await updateProfileDetailsAction(formData);
      if (!result.success) {
        setProfileError(result.error || "Failed to update profile.");
        if (result.fieldErrors) setProfileFieldErrors(result.fieldErrors);
        setProfileLoading(false);
        return;
      }

      setProfileSuccess(result.message || "Profile updated successfully.");
      setProfileLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setProfileError(msg);
      setProfileLoading(false);
    }
  }

  // 2. Submit Password Change
  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    setPasswordFieldErrors({});

    const formData = new FormData();
    formData.append("current_password", passwordData.current_password);
    formData.append("new_password", passwordData.new_password);
    formData.append("confirm_new_password", passwordData.confirm_new_password);

    try {
      const result = await changePasswordAction(formData);
      if (!result.success) {
        setPasswordError(result.error || "Failed to update password.");
        if (result.fieldErrors) setPasswordFieldErrors(result.fieldErrors);
        setPasswordLoading(false);
        return;
      }

      setPasswordSuccess("Password updated successfully.");
      setPasswordData({
        current_password: "",
        new_password: "",
        confirm_new_password: "",
      });
      setPasswordLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setPasswordError(msg);
      setPasswordLoading(false);
    }
  }

  // 3. Submit Preferences Change
  async function handlePreferencesSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPrefLoading(true);
    setPrefError(null);
    setPrefSuccess(null);

    const formData = new FormData();
    formData.append("in_app_notifications", String(preferences.in_app_notifications));
    formData.append("notification_sound", String(preferences.notification_sound));
    formData.append("email_notifications", String(preferences.email_notifications));

    try {
      const result = await updatePreferencesAction(formData);
      if (!result.success) {
        setPrefError(result.error || "Failed to save preferences.");
        setPrefLoading(false);
        return;
      }

      setPrefSuccess("Notification preferences saved successfully.");
      setPrefLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setPrefError(msg);
      setPrefLoading(false);
    }
  }

  const tabs: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: "profile", label: "Profile", icon: User },
    { key: "security", label: "Security", icon: Shield },
    { key: "notifications", label: "Notifications", icon: Bell },
    { key: "account", label: "Account", icon: Info },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-border/60 pb-px overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer shrink-0 ${
                isActive
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. PROFILE TAB */}
      {activeTab === "profile" && (
        <div className="rounded-xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-semibold text-foreground">General Profile</h3>
            <p className="text-xs text-muted-foreground">
              Manage your personal information and public representation across Orbit.
            </p>
          </div>

          {/* Avatar Uploader */}
          <div className="pt-2 pb-4 border-b border-border/40">
            <ProfileAvatarUploader
              userId={initialData.profile.id}
              currentAvatarUrl={profileAvatarUrl}
              name={fullName || initialData.profile.email}
              onAvatarChange={(newUrl) => setProfileAvatarUrl(newUrl)}
            />
          </div>

          {profileError && (
            <Alert variant="destructive" className="py-2.5">
              <AlertDescription className="text-xs">{profileError}</AlertDescription>
            </Alert>
          )}

          {profileSuccess && (
            <Alert className="py-2.5 border-emerald-900/60 bg-emerald-950/40 text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mr-2" />
              <AlertDescription className="text-xs">{profileSuccess}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* First Name */}
              <div className="space-y-1.5">
                <Label htmlFor="first_name" className="text-xs">
                  First Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="first_name"
                  type="text"
                  value={profileData.first_name}
                  onChange={(e) =>
                    setProfileData((prev) => ({ ...prev, first_name: e.target.value }))
                  }
                  required
                  disabled={profileLoading}
                  className="h-9 text-xs"
                />
                {profileFieldErrors.first_name && (
                  <p className="text-[11px] text-red-400">
                    {profileFieldErrors.first_name[0]}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-1.5">
                <Label htmlFor="last_name" className="text-xs">
                  Last Name
                </Label>
                <Input
                  id="last_name"
                  type="text"
                  value={profileData.last_name}
                  onChange={(e) =>
                    setProfileData((prev) => ({ ...prev, last_name: e.target.value }))
                  }
                  disabled={profileLoading}
                  className="h-9 text-xs"
                />
                {profileFieldErrors.last_name && (
                  <p className="text-[11px] text-red-400">
                    {profileFieldErrors.last_name[0]}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Work Email (Read-only) */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs flex items-center justify-between">
                  <span>Work Email</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Read-only</span>
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    value={initialData.profile.email}
                    disabled
                    className="h-9 text-xs pr-8 bg-muted/40 text-muted-foreground cursor-not-allowed"
                  />
                  <Lock className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs">
                  Phone Number
                </Label>
                <div className="relative">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={profileData.phone}
                    onChange={(e) =>
                      setProfileData((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    disabled={profileLoading}
                    className="h-9 text-xs pl-8"
                  />
                  <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* HQ Only Fields */}
            {isHQ && (
              <div className="pt-2 border-t border-border/40 space-y-4">
                <div className="text-xs font-mono uppercase text-muted-foreground/80 tracking-wider">
                  HQ Operational Details
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Job Role */}
                  <div className="space-y-1.5">
                    <Label htmlFor="job_role" className="text-xs">
                      Job Function / Role
                    </Label>
                    <div className="relative">
                      <select
                        id="job_role"
                        value={profileData.job_role}
                        onChange={(e) =>
                          setProfileData((prev) => ({ ...prev, job_role: e.target.value }))
                        }
                        disabled={profileLoading}
                        aria-label="Job Function / Role"
                        className="w-full h-9 rounded-md border border-input bg-background pl-8 pr-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Select job function</option>
                        <option value="PROJECT_MANAGER">Project Manager</option>
                        <option value="DEVELOPER">Developer</option>
                        <option value="DESIGNER">Designer</option>
                        <option value="CONTENT">Content Specialist</option>
                        <option value="MARKETING">Marketing Lead</option>
                        <option value="SALES">Sales & Partnerships</option>
                        <option value="OTHER">Executive / General</option>
                      </select>
                      <Briefcase className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  {/* Department */}
                  <div className="space-y-1.5">
                    <Label htmlFor="department" className="text-xs">
                      Department
                    </Label>
                    <div className="relative">
                      <Input
                        id="department"
                        type="text"
                        placeholder="e.g. Engineering, Creative, Strategy"
                        value={profileData.department}
                        onChange={(e) =>
                          setProfileData((prev) => ({ ...prev, department: e.target.value }))
                        }
                        disabled={profileLoading}
                        className="h-9 text-xs pl-8"
                      />
                      <Layers className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="bio" className="text-xs">
                      Short Bio
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {profileData.bio.length}/500
                    </span>
                  </div>
                  <Textarea
                    id="bio"
                    placeholder="Brief description of your focus at Celestia Studios..."
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        bio: e.target.value.slice(0, 500),
                      }))
                    }
                    disabled={profileLoading}
                    maxLength={500}
                    rows={3}
                    className="text-xs resize-none"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Max 500 characters. Visible to team members across HQ.
                  </p>
                </div>
              </div>
            )}

            {/* Client Company Name (Read-only for clients) */}
            {!isHQ && initialData.clientName && (
              <div className="pt-2 border-t border-border/40 space-y-2">
                <Label htmlFor="company" className="text-xs flex items-center justify-between">
                  <span>Connected Organization</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Managed by HQ</span>
                </Label>
                <div className="relative">
                  <Input
                    id="company"
                    type="text"
                    value={initialData.clientName}
                    disabled
                    className="h-9 text-xs pl-8 bg-muted/40 text-muted-foreground cursor-not-allowed"
                  />
                  <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            )}

            <div className="pt-3 flex justify-end">
              <Button
                type="submit"
                disabled={profileLoading}
                className="h-9 px-4 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                {profileLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>{profileLoading ? "Saving..." : "Save Changes"}</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 2. SECURITY TAB */}
      {activeTab === "security" && (
        <div className="rounded-xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-semibold text-foreground">Password & Authentication</h3>
            <p className="text-xs text-muted-foreground">
              Update your account password. You will stay signed in on this device.
            </p>
          </div>

          {passwordError && (
            <Alert variant="destructive" className="py-2.5">
              <AlertDescription className="text-xs">{passwordError}</AlertDescription>
            </Alert>
          )}

          {passwordSuccess && (
            <Alert className="py-2.5 border-emerald-900/60 bg-emerald-950/40 text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mr-2" />
              <AlertDescription className="text-xs">{passwordSuccess}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
            {/* Current Password */}
            <div className="space-y-1.5">
              <Label htmlFor="current_password" className="text-xs">
                Current Password <span className="text-red-400">*</span>
              </Label>
              <Input
                id="current_password"
                type="password"
                placeholder="••••••••••••"
                value={passwordData.current_password}
                onChange={(e) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    current_password: e.target.value,
                  }))
                }
                required
                disabled={passwordLoading}
                autoComplete="current-password"
                className="h-9 text-xs"
              />
              {passwordFieldErrors.current_password && (
                <p className="text-[11px] text-red-400">
                  {passwordFieldErrors.current_password[0]}
                </p>
              )}
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <Label htmlFor="new_password" className="text-xs">
                New Password <span className="text-red-400">*</span>
              </Label>
              <Input
                id="new_password"
                type="password"
                placeholder="••••••••••••"
                value={passwordData.new_password}
                onChange={(e) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    new_password: e.target.value,
                  }))
                }
                required
                disabled={passwordLoading}
                autoComplete="new-password"
                className="h-9 text-xs"
              />
              {passwordFieldErrors.new_password && (
                <p className="text-[11px] text-red-400">
                  {passwordFieldErrors.new_password[0]}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Must be at least 8 characters.
              </p>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm_new_password" className="text-xs">
                Confirm New Password <span className="text-red-400">*</span>
              </Label>
              <Input
                id="confirm_new_password"
                type="password"
                placeholder="••••••••••••"
                value={passwordData.confirm_new_password}
                onChange={(e) =>
                  setPasswordData((prev) => ({
                    ...prev,
                    confirm_new_password: e.target.value,
                  }))
                }
                required
                disabled={passwordLoading}
                autoComplete="new-password"
                className="h-9 text-xs"
              />
              {passwordFieldErrors.confirm_new_password && (
                <p className="text-[11px] text-red-400">
                  {passwordFieldErrors.confirm_new_password[0]}
                </p>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={passwordLoading}
                className="h-9 px-4 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                {passwordLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Shield className="h-3.5 w-3.5" />
                )}
                <span>{passwordLoading ? "Updating..." : "Update Password"}</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 3. NOTIFICATIONS TAB */}
      {activeTab === "notifications" && (
        <div className="rounded-xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-semibold text-foreground">Notification Preferences</h3>
            <p className="text-xs text-muted-foreground">
              Configure how and when Orbit notifies you of project deliverables, meetings, and updates.
            </p>
          </div>

          {prefError && (
            <Alert variant="destructive" className="py-2.5">
              <AlertDescription className="text-xs">{prefError}</AlertDescription>
            </Alert>
          )}

          {prefSuccess && (
            <Alert className="py-2.5 border-emerald-900/60 bg-emerald-950/40 text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mr-2" />
              <AlertDescription className="text-xs">{prefSuccess}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handlePreferencesSubmit} className="space-y-5 divide-y divide-border/40">
            {/* In-app Notifications */}
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5 max-w-sm">
                <Label htmlFor="in_app_notifications" className="text-xs font-medium text-foreground cursor-pointer">
                  In-App Notification Feed
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Receive alerts in the Orbit header notification bell and activity feed.
                </p>
              </div>
              <Switch
                id="in_app_notifications"
                checked={preferences.in_app_notifications}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...prev,
                    in_app_notifications: checked,
                  }))
                }
                disabled={prefLoading}
              />
            </div>

            {/* Notification Sound */}
            <div className="flex items-center justify-between pt-4">
              <div className="space-y-0.5 max-w-sm">
                <Label htmlFor="notification_sound" className="text-xs font-medium text-foreground cursor-pointer">
                  Audio Tone on Arrival
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Play a subtle acoustic chime when new urgent requests or approvals arrive.
                </p>
                <button
                  type="button"
                  onClick={playSound}
                  className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 pt-0.5 cursor-pointer"
                >
                  <Volume2 className="h-3 w-3" />
                  <span>Test tone</span>
                </button>
              </div>
              <Switch
                id="notification_sound"
                checked={preferences.notification_sound}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...prev,
                    notification_sound: checked,
                  }))
                }
                disabled={prefLoading}
              />
            </div>

            {/* Email Notifications */}
            <div className="flex items-center justify-between pt-4">
              <div className="space-y-0.5 max-w-sm">
                <Label htmlFor="email_notifications" className="text-xs font-medium text-foreground cursor-pointer">
                  Email Notifications
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Receive email digests for deliverable reviews and scheduled meetings.
                </p>
              </div>
              <Switch
                id="email_notifications"
                checked={preferences.email_notifications}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({
                    ...prev,
                    email_notifications: checked,
                  }))
                }
                disabled={prefLoading}
              />
            </div>

            <div className="pt-5 flex justify-end">
              <Button
                type="submit"
                disabled={prefLoading}
                className="h-9 px-4 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                {prefLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>{prefLoading ? "Saving..." : "Save Preferences"}</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 4. ACCOUNT TAB */}
      {activeTab === "account" && (
        <div className="rounded-xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-base font-semibold text-foreground">Account Overview</h3>
            <p className="text-xs text-muted-foreground">
              Technical session details and account access controls.
            </p>
          </div>

          <div className="rounded-lg border border-border/50 bg-secondary/20 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs py-1 border-b border-border/30">
              <span className="text-muted-foreground">Account Role</span>
              <Badge variant="role">
                {initialData.profile.role === "SUPER_ADMIN"
                  ? "HQ Super Admin"
                  : initialData.profile.role === "EMPLOYEE"
                  ? "HQ Team Member"
                  : "Client Portal User"}
              </Badge>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-border/30">
              <span className="text-muted-foreground">Authentication Email</span>
              <span className="font-mono text-foreground">{initialData.profile.email}</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-border/30">
              <span className="text-muted-foreground">Member Since</span>
              <span className="text-foreground">
                {new Date(initialData.profile.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-muted-foreground">User ID</span>
              <span className="font-mono text-[11px] text-muted-foreground">{initialData.profile.id}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-border/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h4 className="text-xs font-medium text-foreground">Sign Out of Orbit</h4>
              <p className="text-[11px] text-muted-foreground">
                End your active authentication session on this device.
              </p>
            </div>

            <form action={signOutAction}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="h-9 text-xs text-muted-foreground hover:text-red-400 hover:border-red-900/60 gap-1.5 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
