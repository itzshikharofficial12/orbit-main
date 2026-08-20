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
  initialError?: string;
  initialErrorDescription?: string;
}

export function SetPasswordForm({
  initialEmail,
  initialError,
  initialErrorDescription,
}: SetPasswordFormProps) {
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

    async function initializeAndVerifySession() {
      try {
        // 1. Check for URL fragment tokens (#access_token=...&refresh_token=...)
        const rawHash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
        const hashParams = new URLSearchParams(rawHash);
        const hashAccessToken = hashParams.get("access_token");
        const hashRefreshToken = hashParams.get("refresh_token");
        const hashError = hashParams.get("error");
        const hashErrorCode = hashParams.get("error_code");
        const hashErrorDescription = hashParams.get("error_description");

        const url = new URL(window.location.href);
        const searchParams = url.searchParams;
        const queryCode = searchParams.get("code");
        const queryTokenHash = searchParams.get("token_hash");
        const queryOtpType = searchParams.get("type");
        const queryError = searchParams.get("error") || initialError;
        const queryErrorCode = searchParams.get("error_code");
        const queryErrorDescription = searchParams.get("error_description") || initialErrorDescription;

        // Check for explicit error returned by Supabase Auth in hash or query
        const explicitError = hashErrorCode || hashError || queryErrorCode || queryError;
        const explicitDesc = hashErrorDescription || queryErrorDescription;

        // 2. If access_token is present in URL hash, establish Supabase session
        if (hashAccessToken) {
          const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken || hashAccessToken,
          });

          if (!sessionErr && sessionData.session?.user) {
            if (isMounted) {
              setUserEmail(sessionData.session.user.email || null);
              setSessionError(null);
              setIsVerifyingSession(false);
            }

            // Remove sensitive access token fragment from browser address bar
            try {
              window.history.replaceState(null, "", window.location.pathname);
            } catch {
              // Ignore history state errors in restricted environments
            }
            return;
          }
        }

        // 3. If PKCE code is present in query parameters
        if (queryCode) {
          const { data: codeData, error: codeErr } = await supabase.auth.exchangeCodeForSession(queryCode);
          if (!codeErr && codeData.session?.user) {
            if (isMounted) {
              setUserEmail(codeData.session.user.email || null);
              setSessionError(null);
              setIsVerifyingSession(false);
            }
            try {
              window.history.replaceState(null, "", window.location.pathname);
            } catch {}
            return;
          }
        }

        // 4. If token_hash and type are present in query parameters
        if (queryTokenHash && queryOtpType) {
          const { data: otpData, error: otpErr } = await supabase.auth.verifyOtp({
            token_hash: queryTokenHash,
            type: queryOtpType as any,
          });
          if (!otpErr && otpData.session?.user) {
            if (isMounted) {
              setUserEmail(otpData.session.user.email || null);
              setSessionError(null);
              setIsVerifyingSession(false);
            }
            try {
              window.history.replaceState(null, "", window.location.pathname);
            } catch {}
            return;
          }
        }

        // 5. Check existing active Supabase session or authenticated user
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          if (isMounted) {
            setUserEmail(sessionData.session.user.email || null);
            setSessionError(null);
            setIsVerifyingSession(false);
          }
          if (window.location.hash || window.location.search) {
            try {
              window.history.replaceState(null, "", window.location.pathname);
            } catch {}
          }
          return;
        }

        const { data: { user: currentUser }, error: userErr } = await supabase.auth.getUser();
        if (!userErr && currentUser) {
          if (isMounted) {
            setUserEmail(currentUser.email || null);
            setSessionError(null);
            setIsVerifyingSession(false);
          }
          if (window.location.hash || window.location.search) {
            try {
              window.history.replaceState(null, "", window.location.pathname);
            } catch {}
          }
          return;
        }

        // 6. Listen for Supabase onAuthStateChange in case session is hydrating asynchronously
        let resolved = false;
        const { data: authListener } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (!isMounted || resolved) return;
            if (session?.user) {
              resolved = true;
              setUserEmail(session.user.email || null);
              setSessionError(null);
              setIsVerifyingSession(false);
              try {
                window.history.replaceState(null, "", window.location.pathname);
              } catch {}
            }
          }
        );

        // 7. If no valid session could be established, resolve the error description
        let displayError = "This invitation link has expired or has already been used. Please request a fresh invitation from Celestia Studios.";
        if (explicitError === "access_denied" && explicitDesc?.toLowerCase().includes("expired")) {
          displayError = "This invitation link has expired or has already been used. Please request a fresh invitation from Celestia Studios.";
        } else if (explicitError === "access_denied") {
          displayError = "Access denied. The invitation link is invalid or has expired. Please request a new invitation.";
        } else if (explicitDesc) {
          displayError = explicitDesc.replace(/\+/g, " ");
        }

        const timer = setTimeout(() => {
          if (isMounted && !resolved) {
            setSessionError(displayError);
            setIsVerifyingSession(false);
          }
        }, 500);

        return () => {
          clearTimeout(timer);
          authListener.subscription.unsubscribe();
        };
      } catch {
        if (isMounted) {
          setSessionError(
            "This invitation link has expired or has already been used. Please request a fresh invitation from Celestia Studios."
          );
          setIsVerifyingSession(false);
        }
      }
    }

    initializeAndVerifySession();

    return () => {
      isMounted = false;
    };
  }, [initialError, initialErrorDescription]);

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

      // 1. Verify active session exists before attempting password update
      const { data: sessionData } = await supabase.auth.getSession();
      let activeUser = sessionData.session?.user || null;
      if (!activeUser) {
        const { data: userData } = await supabase.auth.getUser();
        activeUser = userData.user || null;
      }

      if (!activeUser) {
        setErrorMessage("Your invitation session has expired. Please request a fresh invitation from Celestia Studios.");
        setIsLoading(false);
        return;
      }

      // 2. Update password via Supabase Auth
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

      // 3. Resolve role and determine correct portal destination
      const userRole = data.user.user_metadata?.role || "CLIENT";
      const targetUrl = userRole === "SUPER_ADMIN" || userRole === "EMPLOYEE" ? "/hq" : "/client";

      setSuccessMessage("Account created successfully. Opening your workspace...");
      setIsLoading(false);

      setTimeout(() => {
        window.location.href = targetUrl;
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
