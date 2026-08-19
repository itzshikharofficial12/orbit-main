"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowRight, CheckCircle2, AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { OrbitBrand } from "@/components/brand/orbit-brand";
import { setPasswordSchema, type SetPasswordInput } from "../schema";

interface SetPasswordFormProps {
  initialEmail?: string;
}

export function SetPasswordForm({ initialEmail }: SetPasswordFormProps) {
  const router = useRouter();
  const [formData, setFormData] = React.useState<SetPasswordInput>({
    password: "",
    confirm_password: "",
  });
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isVerifyingSession, setIsVerifyingSession] = React.useState(true);
  const [sessionError, setSessionError] = React.useState<string | null>(null);
  const [userEmail, setUserEmail] = React.useState<string | null>(initialEmail || null);

  React.useEffect(() => {
    let isMounted = true;
    const supabase = createBrowserClient();

    // 1. Check for errors in URL search params or URL hash
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const searchParams = url.searchParams;

    const errorParam = searchParams.get("error") || hashParams.get("error");
    const errorCode = searchParams.get("error_code") || hashParams.get("error_code");
    const errorDesc = searchParams.get("error_description") || hashParams.get("error_description");

    if (errorParam || errorCode) {
      if (errorCode === "otp_expired" || errorParam === "invalid_or_expired_invitation") {
        setSessionError(
          "This invitation link has expired or has already been used. Please contact Celestia Studios to request a fresh invitation."
        );
      } else {
        setSessionError(
          errorDesc?.replace(/\+/g, " ") || "The invitation or recovery link is invalid. Please request a new link."
        );
      }
      setIsVerifyingSession(false);
      return;
    }

    // 2. Check for active session or listen for token exchange from hash
    async function checkSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          if (isMounted) {
            setSessionError("Unable to verify invitation session. Please request a new invite.");
            setIsVerifyingSession(false);
          }
          return;
        }

        if (session?.user) {
          if (isMounted) {
            setUserEmail(session.user.email || null);
            setIsVerifyingSession(false);
          }
        } else {
          // If no session found yet, wait for onAuthStateChange (handles hash fragment parsing)
          const { data: authListener } = supabase.auth.onAuthStateChange(
            async (event, currentSession) => {
              if (!isMounted) return;

              if (currentSession?.user) {
                setUserEmail(currentSession.user.email || null);
                setIsVerifyingSession(false);
              } else if (event === "SIGNED_OUT" || !currentSession) {
                setTimeout(() => {
                  if (isMounted) {
                    setUserEmail((prev) => {
                      if (!prev) {
                        setSessionError(
                          "No active invitation session found. Please use the invitation link sent to your email."
                        );
                        setIsVerifyingSession(false);
                      }
                      return prev;
                    });
                  }
                }, 1500);
              }
            }
          );

          const timer = setTimeout(() => {
            if (isMounted) {
              setSessionError((prev) =>
                prev ? prev : "No active invitation session found. Please use the invitation link sent to your email."
              );
              setIsVerifyingSession(false);
            }
          }, 2000);

          return () => {
            clearTimeout(timer);
            authListener.subscription.unsubscribe();
          };
        }
      } catch (err) {
        console.error("Failed to check auth state:", err);
        if (isMounted) {
          setSessionError("An unexpected error occurred while verifying your session.");
          setIsVerifyingSession(false);
        }
      }
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setFieldErrors({});

    const validation = setPasswordSchema.safeParse(formData);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        if (!errors[field]) errors[field] = err.message;
      });
      setFieldErrors(errors);
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createBrowserClient();
      const { data, error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) {
        setErrorMessage(error.message || "Failed to set account password.");
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        setErrorMessage("Unable to verify user account. Please try again.");
        setIsLoading(false);
        return;
      }

      setSuccessMessage("Password established successfully. Opening your workspace...");
      setIsLoading(false);

      setTimeout(() => {
        router.refresh();
        router.push("/client");
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(message);
      setIsLoading(false);
    }
  }

  // Loading state
  if (isVerifyingSession) {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center mb-1">
          <OrbitBrand size="lg" />
        </div>
        <div className="rounded-xl border border-border/80 bg-card p-8 shadow-2xl flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Verifying invitation access...</p>
        </div>
      </div>
    );
  }

  // Expired or Invalid Link Error state
  if (sessionError) {
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <div className="flex justify-center mb-1">
            <OrbitBrand size="lg" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Invitation Expired
          </h1>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            The invitation link you followed is no longer valid.
          </p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-6 shadow-2xl space-y-5">
          <div className="flex items-start gap-3 p-3.5 rounded-lg bg-amber-950/20 border border-amber-800/40 text-amber-300 text-xs leading-relaxed">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>{sessionError}</div>
          </div>

          <div className="pt-2">
            <Link href="/login" className="w-full block">
              <Button
                variant="outline"
                className="w-full h-10 text-xs font-medium gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Sign In</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Active Password Setup Form
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <div className="flex justify-center mb-1">
          <OrbitBrand size="lg" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Set up your account
        </h1>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Create a secure password to finish setting up your Orbit Client Portal account.
        </p>
      </div>

      <div className="rounded-xl border border-border/80 bg-card p-6 shadow-2xl space-y-5">
        {userEmail && (
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 text-xs">
            <span className="text-muted-foreground block text-[10px] uppercase font-mono">Account Email</span>
            <span className="font-medium text-foreground">{userEmail}</span>
          </div>
        )}

        {errorMessage && (
          <Alert variant="destructive" className="py-2.5">
            <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="py-2.5 border-emerald-900/60 bg-emerald-950/40 text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 mr-2" />
            <AlertDescription className="text-xs">{successMessage}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new_password">New Password *</Label>
            <div className="relative">
              <Input
                id="new_password"
                type="password"
                placeholder="••••••••••••"
                value={formData.password}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                disabled={isLoading}
                autoComplete="new-password"
                required
                className="pr-10"
              />
              <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            {fieldErrors.password && (
              <p className="text-xs text-red-400">{fieldErrors.password}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Must be at least 8 characters.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm_password">Confirm Password *</Label>
            <div className="relative">
              <Input
                id="confirm_password"
                type="password"
                placeholder="••••••••••••"
                value={formData.confirm_password}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, confirm_password: e.target.value }))
                }
                disabled={isLoading}
                autoComplete="new-password"
                required
                className="pr-10"
              />
              <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            {fieldErrors.confirm_password && (
              <p className="text-xs text-red-400">{fieldErrors.confirm_password}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading || Boolean(successMessage)}
            className="w-full h-10 text-xs font-semibold uppercase tracking-wider gap-2 mt-2"
          >
            <span>{isLoading ? "Setting password..." : "Create Account"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
