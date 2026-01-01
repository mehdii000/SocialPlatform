import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuthTabs from "@/components/auth/AuthTabs";
import LoginForm from "@/components/auth/LoginForm";
import SignupForm from "@/components/auth/SignupForm";
import { isAuthenticated } from "@/lib/auth";

type AuthMode = "login" | "signup";

const Index = () => {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [containerHeight, setContainerHeight] = useState<number | "auto">("auto");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/main");
    }
  }, [navigate]);

  useEffect(() => {
    if (contentRef.current) {
      setContainerHeight(contentRef.current.scrollHeight);
    }
  }, [authMode]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <img src="../../res/logo.png" alt="App Logo" className="mx-auto h-32 w-32" />
          
          <p className="mt-2 text-sm text-muted-foreground">
            {authMode === "login"
              ? "Sign in to your account"
              : "Create a new account"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-lg shadow-background/50">
          <div className="space-y-6">
            <AuthTabs activeTab={authMode} onTabChange={setAuthMode} />
            
            <div 
              className="overflow-hidden transition-all duration-300 ease-out"
              style={{ height: containerHeight }}
            >
              <div ref={contentRef}>
                {authMode === "login" ? <LoginForm /> : <SignupForm />}
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default Index;
