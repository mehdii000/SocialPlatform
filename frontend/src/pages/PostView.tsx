import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth";
import { fetchPost, Post } from "@/lib/api";
import { ArrowLeft, Loader2 } from "lucide-react";
import PostCard from "@/components/posts/PostCard";

const PostView = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/");
      return;
    }

    const loadPost = async () => {
      try {
        if (!postId) throw new Error("No post ID");
        const data = await fetchPost(parseInt(postId));
        setPost(data);
      } catch (err) {
        setError("Post not found");
      } finally {
        setIsLoading(false);
      }
    };

    loadPost();
  }, [postId, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">{error || "Post not found"}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-primary hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2 transition-colors hover:bg-secondary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Post</h1>
        </div>
      </header>

      {/* Post Content */}
      <main className="mx-auto max-w-2xl p-4">
        <div className="mb-6">
          <PostCard post={post} onDeleted={() => navigate("/main")} />
        </div>

        {/* Comments Section Placeholder */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Comments</h2>
          
          {/* Comment Input Placeholder */}
          <div className="mb-6 flex gap-3">
            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-primary/60 to-accent" />
            <div className="flex-1 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
              Write a comment...
            </div>
          </div>

          {/* Empty State */}
          <div className="py-8 text-center">
            <p className="text-muted-foreground">No comments yet</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Be the first to share your thoughts!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PostView;
