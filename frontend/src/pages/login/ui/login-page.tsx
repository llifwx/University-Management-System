import { GraduationCap } from "lucide-react";

import { LoginForm } from "@/features/auth-by-email";
import { Card, CardContent } from "@/shared/ui/card";
import { FormError } from "@/shared/ui/form-field";

export function LoginPage({ next, expired, unavailable }: { next?: string; expired?: boolean; unavailable?: boolean }) {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="bg-primary text-primary-foreground grid size-12 place-items-center rounded-xl">
            <GraduationCap className="size-6" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">University Management System</h1>
            <p className="text-muted-foreground mt-1 text-sm">Sign in with your university account</p>
          </div>
        </div>
        <Card className="shadow-sm">
          <CardContent className="space-y-4 p-6">
            {expired && <p role="status" className="bg-muted rounded-md px-3 py-2 text-sm">Your session has ended. Please sign in again.</p>}
            {unavailable && <FormError message="The university service is unavailable right now. Please try again shortly." />}
            <LoginForm next={next} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
