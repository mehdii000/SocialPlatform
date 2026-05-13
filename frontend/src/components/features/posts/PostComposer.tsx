import { useState, useRef, useEffect } from 'react';
import { Image, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createPost } from '@/api/posts';
import { extractTopics, engage } from '@/api/resonance';
import styles from './PostComposer.module.css';

interface PostComposerProps {
  onPostCreated: () => void;
}

export function PostComposer({ onPostCreated }: PostComposerProps) {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!content.trim() && !image) return;
    setLoading(true);
    setError('');
    try {
      const result = await createPost(content.trim(), image || undefined);
      setContent('');
      setImage(null);
      setImagePreview(null);
      onPostCreated();
      // Fire-and-forget: auto-tag post + record engagement
      const postId = result.post_id;
      extractTopics(postId, content.trim()).catch(() => {});
      engage(postId, 'create').catch(() => {});
    } catch (e) {
      setError((e as Error).message || 'Failed to create post');
    }
    setLoading(false);
  };

  const handleSelectImage = () => {
    fileRef.current?.click();
  };

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className={styles.composer}>
      <textarea
        className={styles.textarea}
        placeholder="What's on your mind?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={500}
        rows={3}
      />
      {imagePreview && (
        <div className={styles.previewWrap}>
          <img src={imagePreview} alt="Preview" className={styles.preview} />
          <button className={styles.removeImg} onClick={removeImage}><X size={14} /></button>
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button className={styles.imgBtn} onClick={handleSelectImage}>
          <Image size={18} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
        <span className={styles.count}>{content.length}/500</span>
        <Button size="sm" onClick={handleSubmit} loading={loading} disabled={!content.trim() && !image}>
          <Send size={14} /> Post
        </Button>
      </div>
    </div>
  );
}
