import { useState, useRef } from "react";
import { Image, Video, X, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createPost } from "@/lib/api";
import { compressMedia } from "@/lib/compression";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface CreatePostProps {
  onPostCreated: () => void;
}

const CreatePost = ({ onPostCreated }: CreatePostProps) => {
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (file: File, type: "image" | "video") => {
    setIsCompressing(true);
    try {
      const compressedFile = await compressMedia(file, type);
      const compressionRatio = ((1 - compressedFile.size / file.size) * 100).toFixed(0);
      
      setMediaFile(compressedFile);
      setMediaType(type);
      const url = URL.createObjectURL(compressedFile);
      setMediaPreview(url);

      if (compressedFile.size < file.size) {
        toast({
          title: "Media compressed",
          description: `Reduced by ${compressionRatio}%`,
        });
      }
    } catch (error) {
      setMediaFile(file);
      setMediaType(type);
      const url = URL.createObjectURL(file);
      setMediaPreview(url);
    } finally {
      setIsCompressing(false);
    }
  };

  const clearMedia = () => {
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
    }
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
  };

  const handleSubmit = async () => {
    if (!content.trim() && !mediaFile) {
      toast({
        title: "Error",
        description: "Post must contain text or media",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await createPost(content, mediaFile, mediaType);
      setContent("");
      clearMedia();
      toast({
        title: "Success",
        description: "Post created successfully!",
      });
      onPostCreated();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-card/80 p-5 shadow-xl shadow-black/5"
    >
      {/* Decorative accent */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-accent/5 blur-3xl" />
      
      <div className="relative flex gap-4">
        {/* User Avatar Placeholder */}
        <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-accent/80 to-primary/40 ring-2 ring-accent/20 ring-offset-2 ring-offset-card" />
        
        <div className="flex flex-1 flex-col min-w-0">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[60px] w-full resize-none border-0 bg-transparent p-0 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-0"
          />

          {/* Media Preview Section */}
            {isCompressing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="my-2 flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent"
              >
                <Sparkles className="h-4 w-4 animate-pulse" />
                Compressing media...
              </motion.div>
            )}

            {mediaPreview && !isCompressing && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative my-3 w-full overflow-hidden rounded-xl border border-border shadow-sm"
              >
                <button
                  type="button"
                  onClick={clearMedia}
                  className="absolute right-2 top-2 z-20 rounded-full bg-black/60 p-1.5 text-white backdrop-blur-md transition-all hover:scale-110 hover:bg-black/80"
                >
                  <X className="h-4 w-4" />
                </button>
                
                {mediaType === "image" ? (
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="max-h-[300px] w-full object-cover"
                  />
                ) : (
                  <video
                    src={mediaPreview}
                    controls
                    className="max-h-[300px] w-full bg-black object-contain"
                  />
                )}
              </motion.div>
            )}

          {/* Action Footer */}
          <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-4">
            <div className="flex gap-1">
              <input
                type="file"
                ref={imageInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file, "image");
                }}
              />
              <input
                type="file"
                ref={videoInputRef}
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file, "video");
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => imageInputRef.current?.click()}
                disabled={isLoading || isCompressing}
                className="rounded-xl text-muted-foreground transition-all hover:bg-accent/10 hover:text-accent"
              >
                <Image className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => videoInputRef.current?.click()}
                disabled={isLoading || isCompressing}
                className="rounded-xl text-muted-foreground transition-all hover:bg-accent/10 hover:text-accent"
              >
                <Video className="h-5 w-5" />
              </Button>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isLoading || isCompressing || (!content.trim() && !mediaFile)}
              className="rounded-full bg-gradient-to-r from-accent to-accent/80 px-6 font-medium shadow-lg shadow-accent/20 transition-all hover:shadow-xl hover:shadow-accent/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post"
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CreatePost;
