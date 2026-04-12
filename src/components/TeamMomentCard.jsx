import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { base44 } from '../api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import AvatarDisplay from './AvatarDisplay';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import MoodBarometer from './MoodBarometer';

export default function TeamMomentCard({ moment, currentUserEmail }) {
  const [liked, setLiked] = useState(moment.liked_by?.includes(currentUserEmail));
  const queryClient = useQueryClient();

  const toggleLike = async () => {
    const newLikedBy = liked ? (moment.liked_by || []).filter(e => e !== currentUserEmail) : [...(moment.liked_by || []), currentUserEmail];
    await base44.entities.TeamMoment.update?.(moment.id, { liked_by: newLikedBy, likes_count: newLikedBy.length }) || base44.entities.TeamMoment.create({ ...moment, liked_by: newLikedBy, likes_count: newLikedBy.length });
    setLiked(!liked);
    queryClient.invalidateQueries({ queryKey: ['teamMoments', moment.team_id] });
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden p-4">
      <div className="flex items-center gap-3 mb-2">
        <AvatarDisplay src={moment.author_avatar} name={moment.author_name} size="sm" />
        <div className="flex-1">
          <div className="font-medium text-sm">{moment.title || 'Moment'}</div>
          <div className="text-xs text-muted-foreground">{moment.created_date ? formatDistanceToNow(new Date(moment.created_date), { addSuffix: true, locale: de }) : ''}</div>
        </div>
      </div>

      <div className="pb-3">
        <p className="text-sm whitespace-pre-wrap">{moment.content}</p>
      </div>

      {moment.image_url && (
        <div className="pb-3">
          <img src={moment.image_url} alt="Moment" className="w-full rounded-lg object-cover max-h-96" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={toggleLike} className={`flex items-center gap-2 ${liked ? 'text-red-400' : 'text-muted-foreground'}`}>
            <Heart className="w-4 h-4" />
            <span>{moment.likes_count || 0}</span>
          </button>
        </div>
        <div className="flex-1 ml-4">
          <MoodBarometer text={moment.content} autoStart={false} isPremium={moment.is_premium} onlyPremium={false} />
        </div>
      </div>
    </div>
  );
}
