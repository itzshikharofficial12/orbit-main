import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <div className="space-y-4 max-w-md">
        <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
          <Compass className="h-6 w-6" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight font-mono text-foreground">404</h1>
        <h2 className="text-lg font-semibold text-foreground">Page Not Found</h2>
        <p className="text-xs text-muted-foreground">
          The page or resource you are looking for does not exist or has been relocated.
        </p>
        <div className="pt-2">
          <Link href="/">
            <Button size="sm" className="text-xs h-9 px-4">
              Return to Orbit HQ
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
