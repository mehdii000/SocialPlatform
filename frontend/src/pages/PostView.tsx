import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth";
import { fetchPost, HOST_URL, Post } from "@/lib/api";
import { ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { getVideoTimestamp, setVideoTimestamp } from "@/lib/videoTimestamps";
import { formatDistanceToNow } from "date-fns";

const PostView = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
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

  // Restore video timestamp when post loads
  useEffect(() => {
    if (post && videoRef.current && post.media_type !== 1) {
      const savedTime = getVideoTimestamp(post.id);
      if (savedTime > 0) {
        videoRef.current.currentTime = savedTime;
      }
    }
  }, [post]);

  const handleVideoTimeUpdate = () => {
    if (videoRef.current && post) {
      setVideoTimestamp(post.id, videoRef.current.currentTime);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <div className="rounded-full bg-muted p-6">
          <MessageCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">{error || "Post not found"}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-accent transition-colors hover:text-accent/80 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2 text-muted-foreground transition-all hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Post</h1>
        </div>
      </header>

      {/* Post Content - Full width version for detail view */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        <motion.article 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-card/80 shadow-xl shadow-black/5"
        >
          {/* Post Header */}
          <div className="flex items-center gap-3 border-b border-border/50 p-5">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-accent/80 to-primary/40 ring-2 ring-accent/20 ring-offset-2 ring-offset-card" />
            <div className="flex-1">
              <p className="font-semibold text-foreground">
                {post.username || `User #${post.user_id}`}
              </p>
              <p className="text-xs text-muted-foreground/70">{timeAgo}</p>
            </div>
          </div>

          {/* Post Content */}
          {post.content && (
            <div className="p-5 pb-4">
              <p className="text-base leading-relaxed text-foreground/90">{post.content}</p>
            </div>
          )}

          {/* Media */}
          {post.media_url && (
            <div className="border-t border-border/50 bg-muted/30">
              {post.media_type === 1 ? (
                <img 
                  src={`${HOST_URL}/api/media/posts/` + post.media_url}
                  alt="Post" 
                  className="w-full object-contain max-h-[500px]" 
                />
              ) : (
                <video 
                  ref={videoRef}
                  src={post.media_url} 
                  controls 
                  className="w-full"
                  onTimeUpdate={handleVideoTimeUpdate}
                />
              )}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 border-t border-border/50 px-5 py-4 text-sm text-muted-foreground">
            <span>{post.likes_count} likes</span>
            <span>{post.comments_count} comments</span>
          </div>
        </motion.article>

        {/* Comments Section Placeholder */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-card/80 shadow-lg shadow-black/5"
        >
          <div className="border-b border-border/50 px-5 py-4">
            <h2 className="font-semibold text-foreground">Comments</h2>
          </div>
          
          {/* Comment Input Placeholder */}
          <div className="flex gap-3 border-b border-border/50 p-5">
            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-br from-accent/60 to-primary/30 ring-2 ring-accent/10 ring-offset-2 ring-offset-card" />
            <div className="flex-1 cursor-text rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground/60 transition-all hover:border-accent/30 hover:bg-secondary/50">
              Write a comment...
            </div>
          </div>

          {/* Empty State */}
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
              <MessageCircle className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="font-medium text-muted-foreground">No comments yet</p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Be the first to share your thoughts!
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default PostView;
