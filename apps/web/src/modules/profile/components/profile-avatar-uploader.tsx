"use client";

import * as React from "react";
import { Trash2, Loader2, Camera } from "lucide-react";
import { OrbitAvatar } from "@/components/ui/orbit-avatar";
import { Button } from "@/components/ui/button";
import { uploadAvatarAction, removeAvatarAction } from "../actions";

interface ProfileAvatarUploaderProps {
  userId: string;
  currentAvatarUrl: string | null;
  name: string | null;
  onAvatarChange?: (newUrl: string | null) => void;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function ProfileAvatarUploader({
  currentAvatarUrl,
  name,
  onAvatarChange,
}: ProfileAvatarUploaderProps) {
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(currentAvatarUrl);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setAvatarUrl(currentAvatarUrl);
  }, [currentAvatarUrl]);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);

    // 1. Validate file size (max 5MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMsg("Profile photo must be 5 MB or smaller.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 2. Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setErrorMsg("Unsupported format. Please upload a JPG, PNG, or WebP photo.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadAvatarAction(formData);

      if (!result.success) {
        console.error("Avatar upload error:", result.error);
        setErrorMsg(result.error || "Couldn't upload your photo. Please try again.");
        setIsUploading(false);
        return;
      }

      const newUrl = result.avatar_url || null;
      setAvatarUrl(newUrl);
      onAvatarChange?.(newUrl);
      setIsUploading(false);
    } catch (err: unknown) {
      console.error("Avatar upload unexpected error:", err);
      setErrorMsg("Couldn't upload your photo. Please try again.");
      setIsUploading(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveAvatar() {
    setIsRemoving(true);
    setErrorMsg(null);

    try {
      const result = await removeAvatarAction();
      if (!result.success) {
        console.error("Avatar remove error:", result.error);
        setErrorMsg(result.error || "Couldn't remove your photo. Please try again.");
        setIsRemoving(false);
        return;
      }

      setAvatarUrl(null);
      onAvatarChange?.(null);
      setIsRemoving(false);
    } catch (err: unknown) {
      console.error("Avatar remove unexpected error:", err);
      setErrorMsg("Couldn't remove your photo. Please try again.");
      setIsRemoving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Avatar Display */}
        <div className="relative group shrink-0">
          <OrbitAvatar
            src={avatarUrl}
            name={name}
            size="2xl"
            className="ring-2 ring-border/80 shadow-md"
          />
          {isUploading && (
            <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-xs">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Actions & Information */}
        <div className="flex-1 space-y-2 text-center sm:text-left">
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-foreground">Profile Photo</h4>
            <p className="text-xs text-muted-foreground">
              Accepted formats: JPG, PNG, WebP (up to 5MB).
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelected}
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              aria-label="Upload profile photo"
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUploading || isRemoving}
              onClick={() => fileInputRef.current?.click()}
              className="h-8 text-xs gap-1.5 cursor-pointer"
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
              <span>{avatarUrl ? "Change photo" : "Upload photo"}</span>
            </Button>

            {avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isUploading || isRemoving}
                onClick={handleRemoveAvatar}
                className="h-8 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20 gap-1.5 cursor-pointer"
              >
                {isRemoving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                <span>Remove</span>
              </Button>
            )}
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400 font-medium pt-1">{errorMsg}</p>
          )}
        </div>
      </div>
    </div>
  );
}
