import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup";

interface AuthTabsProps {
  activeTab: AuthMode;
  onTabChange: (tab: AuthMode) => void;
}

const AuthTabs = ({ activeTab, onTabChange }: AuthTabsProps) => {
  return (
    <div className="relative flex rounded-lg bg-secondary p-1">
      <div
        className={cn(
          "absolute top-1 h-[calc(100%-8px)] w-[calc(50%-5px)] rounded-md bg-card transition-transform duration-300 ease-out",
          activeTab === "signup" && "translate-x-[calc(100%)]"
        )}
      />
      <button
        type="button"
        onClick={() => onTabChange("login")}
        className={cn(
          "relative z-10 flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200",
          activeTab === "login" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        Login
      </button>
      <button
        type="button"
        onClick={() => onTabChange("signup")}
        className={cn(
          "relative z-10 flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200",
          activeTab === "signup" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        Sign up
      </button>
    </div>
  );
};

export default AuthTabs;
