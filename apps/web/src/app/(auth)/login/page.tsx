import { Suspense } from "react";
import { LoginForm } from "@/modules/auth/components/login-form";

export const metadata = {
  title: "Sign in",
  description: "Sign in to Orbit by Celestia Studios.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md border border-border/80 bg-card p-8 sm:p-10 shadow-2xl rounded-xl">
        <Suspense
          fallback={
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
              Loading...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
