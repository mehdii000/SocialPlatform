import { useState, useEffect, useRef } from "react";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import { fetchProfile, HOST_URL, UserProfile } from "@/lib/api";
import { clearTokens } from "@/lib/auth";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  onOpenProfile: () => void;
}

const Header = ({ onOpenProfile }: HeaderProps) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProfile()
      .then(setProfile)
      .catch(console.error);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearTokens();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-64 right-0 h-16 border-b border-border/50 bg-card/30 backdrop-blur-xl z-50">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Feed
          </h1>
          <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-3 transition-all hover:bg-secondary/50 border border-transparent hover:border-border/50"
          >
            <div className="relative h-8 w-8 rounded-full bg-gradient-to-br from-accent/60 to-primary/40 overflow-hidden ring-2 ring-accent/20">
              {profile?.profile_picture_url ? (
                <img src={`${HOST_URL}/api/media/profiles/` + profile.profile_picture_url}
                alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
            <span className="text-sm font-medium text-foreground">
              {profile?.username || "Loading..."}
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${dropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border/50 bg-card/95 backdrop-blur-xl p-1.5 shadow-xl shadow-black/20 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="border-b border-border/50 px-3 py-2.5 mb-1.5">
                <p className="text-sm font-medium text-foreground">{profile?.username}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </div>
              
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  onOpenProfile();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary/50"
              >
                <User className="h-4 w-4" />
                View Profile
              </button>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary/50">
                <Settings className="h-4 w-4" />
                Settings
              </button>
              <div className="my-1.5 border-t border-border/50" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
