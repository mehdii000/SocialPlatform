import { useState } from "react";
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
          <h1 className="text-2xl font-semibold text-foreground">Welcome</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {authMode === "login"
              ? "Sign in to your account"
              : "Create a new account"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-lg shadow-background/50">
          <div className="space-y-6">
            <AuthTabs activeTab={authMode} onTabChange={setAuthMode} />
            
            {authMode === "login" ? <LoginForm /> : <SignupForm />}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our <u className="underline-offset-4 hover:text-primary cursor-pointer">Terms and Privacy Policy</u>.
        </p>
      </div>
    </div>
  );
};

export default Index;
