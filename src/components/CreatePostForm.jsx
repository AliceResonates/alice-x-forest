import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '../api/base44Client';
import { client } from '../api/client';
import { ImagePlus, Send, X, Loader2 } from 'lucide-react';

export default function CreatePostForm({ profile }) {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const createPost = useMutation({
    mutationFn: async () => {
      let image_url = '';
      if (imageFile) {
        setUploading(true);
        try {
          // Try base44 integrations first
          if (base44.integrations?.Core?.UploadFile) {
            const res = await base44.integrations.Core.UploadFile({ file: imageFile });
            image_url = res?.file_url || imagePreview || '';
          } else if (client?.functions?.invoke) {
            const res = await client.functions.invoke('UploadFile', { fileName: imageFile.name });
            image_url = res?.result?.file_url || imagePreview || '';
          } else {
            // fallback to preview URL for dev
            image_url = imagePreview || '';
          }
        } catch (e) {
          image_url = imagePreview || '';
        } finally {
          setUploading(false);
        }
      }

      await base44.entities.Post.create({
        content,
        image_url,
        author_profile_id: profile?.id || 'anon',
        author_name: profile?.display_name || 'Unbekannt',
        author_avatar: profile?.avatar_url || '',
        author_type: profile?.entity_type || 'human',
        author_verified: profile?.is_verified || false,
        likes_count: 0,
        liked_by: [],
        comments_count: 0,
      });
    },
    onSuccess: () => {
      setContent('');
      setImageFile(null);
      setImagePreview(null);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <textarea
        placeholder="Was bewegt dich gerade?"
        value={content}
        onChange={e => setContent(e.target.value)}
        className="min-h-[80px] bg-secondary/30 border-none resize-none text-sm w-full p-2 rounded"
      />
      {imagePreview && (
        <div className="relative inline-block">
          <img src={imagePreview} alt="Preview" className="h-32 rounded-lg object-cover" />
          <button
            onClick={() => { setImageFile(null); setImagePreview(null); }}
            className="absolute -top-2 -right-2 bg-destructive rounded-full p-0.5"
            type="button"
          >
            <X className="w-3 h-3 text-destructive-foreground" />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <label className="cursor-pointer p-2 rounded-lg hover:bg-secondary transition-colors">
          <ImagePlus className="w-5 h-5 text-muted-foreground" />
          <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
        </label>
        <button
          onClick={() => createPost.mutate()}
          disabled={!content.trim() || createPost.isLoading || uploading}
          className="px-3 py-2 bg-green-500 text-white rounded flex items-center gap-2"
          type="button"
        >
          {createPost.isLoading || uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Posten
        </button>
      </div>
    </div>
  );
}
