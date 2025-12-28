import { useState } from "react";
import { cn } from "@/lib/utils";
import AuthTabs from "@/components/auth/AuthTabs";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";

type AuthMode = "login" | "signup";

const Index = () => {
  const [authMode, setAuthMode] = useState<AuthMode>("login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <img src="../../res/MeteorLogo.png" alt="Logo" className="mx-auto h-32 w-32" />
          <p className="mt-2 text-sm text-muted-foreground">
            {authMode === "login"
              ? "Sign in to your account"
              : "Create a new account"}
          </p>
        </div>

        <div className={cn("rounded-xl border border-border bg-card p-6 shadow-lg shadow-background/50 transition-all duration-400 ease-in-out overflow-hidden", authMode === "signup" ? "max-h-[600px]" : "max-h-96")}>
          <div className="space-y-6">
            <AuthTabs activeTab={authMode} onTabChange={setAuthMode} />
            
            {authMode === "login" ? <LoginForm /> : <SignupForm />}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          <u className="underline-offset-4 hover:text-primary cursor-pointer">Continue as a guest for now</u>.
        </p>
      </div>
    </div>
  );
};

export default Index;
