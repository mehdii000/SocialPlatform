import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, User, FileText, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { fetchUserPosts, Post } from "@/lib/api";
import PostCard from "@/components/posts/PostCard";

interface PublicProfile {
  id: number;
  username: string;
  bio: string;
  profile_picture_url: string | null;
}

const Profile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "about">("posts");

  const loadUserPosts = async (userId: number) => {
    setPostsLoading(true);
    try {
      const userPosts = await fetchUserPosts(userId);
      setPosts(userPosts);
    } catch (err) {
      console.error("Failed to fetch user posts:", err);
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    const fetchPublicProfile = async () => {
      try {
        const response = await fetch(`http://localhost/api/users/profiles/getpublic?username=${username}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          throw new Error("User not found");
        }

        const data = await response.json();
        setProfile(data);
        
        // Fetch user's posts after getting profile
        if (data.id) {
          loadUserPosts(data.id);
        }
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
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
          <p className="text-muted-foreground text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <User className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">{error || "User not found"}</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-lg leading-tight">{profile.username}</h1>
            <p className="text-xs text-muted-foreground">{posts.length} posts</p>
          </div>
        </div>
      </header>

      {/* Profile Content */}
      <div className="max-w-2xl mx-auto">
        {/* Cover & Avatar */}
        <div className="relative">
          <div className="h-36 bg-gradient-to-br from-accent/30 via-accent/10 to-primary/5" />
          <div className="absolute -bottom-14 left-6">
            <Avatar className="w-28 h-28 border-4 border-background ring-2 ring-accent/20">
              <AvatarImage src={profile.profile_picture_url || undefined} />
              <AvatarFallback className="text-3xl bg-gradient-to-br from-accent/20 to-accent/5 text-accent">
                {profile.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Profile Info */}
        <div className="pt-16 px-6 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">{profile.username}</h2>
              <p className="text-muted-foreground text-sm">@{profile.username}</p>
            </div>
            <Button 
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => {/* TODO: Implement messaging */}}
            >
              <MessageCircle className="w-4 h-4" />
              Message
            </Button>
          </div>

          {profile.bio && (
            <p className="mt-4 text-foreground/90 leading-relaxed">{profile.bio}</p>
          )}

          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>Joined recently</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-y border-border/50 bg-card/30">
          <div className="flex">
            <button 
              onClick={() => setActiveTab("posts")}
              className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 relative ${
                activeTab === "posts" 
                  ? "text-accent" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <FileText className="w-4 h-4" />
              Posts
              {activeTab === "posts" && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-accent rounded-full" />
              )}
            </button>
            <button 
              onClick={() => setActiveTab("about")}
              className={`flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 relative ${
                activeTab === "about" 
                  ? "text-accent" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <User className="w-4 h-4" />
              About
              {activeTab === "about" && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-accent rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === "posts" ? (
            postsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="font-medium text-foreground/80">No posts yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  When {profile.username} posts, they'll show up here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} onDeleted={() => loadUserPosts(profile.id)} />
                ))}
              </div>
            )
          ) : (
            <div className="py-8">
              <div className="rounded-2xl border border-border/50 bg-card/50 p-6">
                <h3 className="font-semibold mb-4">About {profile.username}</h3>
                {profile.bio ? (
                  <p className="text-foreground/80">{profile.bio}</p>
                ) : (
                  <p className="text-muted-foreground italic">No bio provided yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
