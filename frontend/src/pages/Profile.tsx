import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PublicProfile {
  username: string;
  bio: string;
  profile_picture_url: string | null;
}

const Profile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicProfile = async () => {
      try {
        const response = await fetch(`http://localhost/api/profiles/getpublic?username=${username}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error("User not found");
        }

        const data = await response.json();
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    if (username) {
      fetchPublicProfile();
    }
  }, [username]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{error || "User not found"}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-lg">{profile.username}</h1>
        </div>
      </header>

      {/* Profile Content */}
      <div className="max-w-2xl mx-auto">
        {/* Cover & Avatar */}
        <div className="relative">
          <div className="h-32 bg-gradient-to-br from-primary/20 to-accent/20" />
          <div className="absolute -bottom-12 left-6">
            <Avatar className="w-24 h-24 border-4 border-background">
              <AvatarImage src={profile.profile_picture_url || undefined} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {profile.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Profile Info */}
        <div className="pt-16 px-6 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{profile.username}</h2>
              <p className="text-muted-foreground text-sm">@{profile.username}</p>
            </div>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => {/* TODO: Implement messaging */}}
            >
              <MessageCircle className="w-4 h-4" />
              Message
            </Button>
          </div>

          <p className="mt-4 text-foreground/90">{profile.bio}</p>
        </div>

        {/* Tabs Placeholder */}
        <div className="border-t border-border/50">
          <div className="flex">
            <button className="flex-1 py-4 text-sm font-medium text-primary border-b-2 border-primary flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" />
              Posts
            </button>
            <button className="flex-1 py-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2">
              <User className="w-4 h-4" />
              About
            </button>
          </div>
        </div>

        {/* Posts Placeholder */}
        <div className="p-6">
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No posts yet</p>
            <p className="text-sm">When {profile.username} posts, they'll show up here.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
