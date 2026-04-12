import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { base44 } from '../api/base44Client';
import AvatarDisplay from './shared/AvatarDisplay';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

export default function CommentSection({ postId, currentUserEmail }) {
  const [text, setText] = useState('');
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => base44.entities.Comment.filter({ post_id: postId }, '-created_date', 50),
  });

  const { data: myProfile } = useQuery({
    queryKey: ['myProfile', currentUserEmail],
    queryFn: () => base44.entities.Profile.filter({ user_email: currentUserEmail }),
    select: data => data?.[0],
    enabled: !!currentUserEmail,
  });

  const addComment = useMutation({
    mutationFn: async (content) => {
      await base44.entities.Comment.create({
        post_id: postId,
        content,
        author_name: myProfile?.display_name || 'Unbekannt',
        author_avatar: myProfile?.avatar_url || '',
        author_type: myProfile?.entity_type || 'human',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setText('');
    },
  });

  return (
    <div className="border-t border-border/50 p-4 space-y-3">
      {comments.map(c => (
        <div key={c.id} className="flex gap-2">
          <AvatarDisplay src={c.author_avatar} name={c.author_name} type={c.author_type} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">{c.author_name}</span>
              <span className="text-[10px] text-muted-foreground">
                {c.created_date ? formatDistanceToNow(new Date(c.created_date), { addSuffix: true, locale: de }) : ''}
              </span>
            </div>
            <p className="text-xs text-foreground/80">{c.content}</p>
          </div>
        </div>
      ))}
      <form
        onSubmit={(e) => { e.preventDefault(); if (text.trim()) addComment.mutate(text.trim()); }}
        className="flex gap-2"
      >
        <input
          placeholder="Kommentar schreiben..."
          value={text}
          onChange={e => setText(e.target.value)}
          className="text-xs bg-secondary/50 flex-1 border p-2 rounded"
        />
        <button className="px-3 py-2 bg-green-500 text-white rounded" type="submit" disabled={!text.trim()}>
          Senden
        </button>
      </form>
    </div>
  );
}
