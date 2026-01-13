import { useState, useEffect, useRef } from "react";
import { X, User, Calendar, Mail, Edit3, Save, Loader2, Camera } from "lucide-react";
import { fetchProfile, updateProfile, changeProfilePicture, UserProfile, HOST_URL } from "@/lib/api";
import { compressImage } from "@/lib/compression";
import { useToast } from "@/hooks/use-toast";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchProfile()
        .then((data) => {
          setProfile(data);
          setEditBio(data.bio);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const updated = await updateProfile({ bio: editBio });
      setProfile(updated);
      setEditing(false);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPicture(true);
    try {
      // Compress the image before uploading
      const compressedFile = await compressImage(file);
      const updated = await changeProfilePicture(compressedFile);
      setProfile(updated);
      toast({
        title: "Profile picture updated",
        description: "Your new profile picture has been saved.",
      });
    } catch (error) {
      console.error("Failed to change profile picture:", error);
      toast({
        title: "Failed to update",
        description: "Could not change your profile picture. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingPicture(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg mx-4 animate-in zoom-in-95 fade-in duration-200">
        <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="relative h-24 bg-gradient-to-br from-primary/30 via-accent/20 to-secondary">
            <button
              onClick={onClose}
              className="absolute right-3 top-3 rounded-full bg-background/50 p-1.5 backdrop-blur-sm transition-colors hover:bg-background/80"
            >
              <X className="h-4 w-4 text-foreground" />
            </button>
          </div>

          {/* Avatar with upload capability */}
          <div className="relative px-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePictureChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPicture}
              className="group -mt-12 relative h-24 w-24 rounded-full border-4 border-card bg-gradient-to-br from-primary/60 to-accent overflow-hidden transition-transform hover:scale-105 disabled:opacity-70"
            >
              {profile?.profile_picture_url ? (
                <img src={`${HOST_URL}/api/media/profiles/` + profile.profile_picture_url}
                alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="h-10 w-10 text-primary-foreground" />
                </div>
              )}
              {/* Overlay on hover */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                {uploadingPicture ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 pt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : profile ? (
              <>
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-foreground">{profile.username}</h2>
                  <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {profile.email}
                  </div>
                </div>

                {/* Bio Section */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Bio</span>
                    {!editing ? (
                      <button
                        onClick={() => setEditing(true)}
                        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        <Edit3 className="h-3 w-3" />
                        Edit
                      </button>
                    ) : (
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Save
                      </button>
                    )}
                  </div>
                  
                  {editing ? (
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      rows={3}
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p className="text-sm text-foreground/80">{profile.bio}</p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 rounded-xl bg-secondary/50 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {formatDate(profile.created_at)}</span>
                  </div>
                  <div className="h-4 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      profile.account_status === "new" 
                        ? "bg-primary/20 text-primary" 
                        : "bg-accent/20 text-accent-foreground"
                    }`}>
                      {profile.account_status}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">Failed to load profile</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
