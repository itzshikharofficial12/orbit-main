"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loginAction } from "../actions";

export function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    try {
      const result = await loginAction(formData);
      if (result && !result.success) {
        setErrorMessage(result.error || "Invalid email or password.");
        setIsLoading(false);
      }
    } catch {
      // Server Action redirect handled by Next.js
    }
  }

  return (
    <div className="w-full">
      <div className="flex flex-col space-y-7">
        {/* Brand Header */}
        <div className="flex flex-col space-y-1.5 text-left">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Orbit
          </h2>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground font-mono">
            by Celestia Studios
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs font-normal">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Work Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@company.com"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            className="w-full font-medium"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
