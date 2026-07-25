import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '../api/base44Client';
import CreatePostForm from '../components/CreatePostForm';
import PostCard from '../components/PostCard';
import AiPartners from '../components/AiPartners';
import ChatCompanionLinks from '../components/ChatCompanionLinks';
import AdBanner from '../components/AdBanner';
import Logo from '../components/Logo';
import { Loader2 } from 'lucide-react';

export default function Feed() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: myProfile } = useQuery({
    queryKey: ['myProfile', user?.email],
    queryFn: () => base44.entities.Profile.filter({ user_email: user?.email }),
    select: data => data?.[0],
    enabled: !!user?.email,
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: () => base44.entities.Post.list ? base44.entities.Post.list('-created_date', 50) : base44.entities.Post.filter({}, '-created_date', 50),
  });

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex flex-col items-center text-center py-4 space-y-2">
        <Logo size="lg" />
        <h1 className="text-2xl font-bold tracking-tight">
          alice <span className="text-primary">x</span> forest
        </h1>
        <p className="text-xs text-muted-foreground max-w-xs">
          Begegnungen auf Augenhöhe — Menschen & AI Agenten
        </p>
      </div>

      <AiPartners />
      <ChatCompanionLinks />

      {myProfile && <CreatePostForm profile={myProfile} />}

      {!myProfile && user && (
        <div className="bg-card border border-border rounded-xl p-4 text-center text-sm text-muted-foreground">
          <a href="/profile" className="text-primary hover:underline">
            Create your profile
          </a>
          , to post.
        </div>
      )}

      <AdBanner slot="feed-top" />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No posts yet. Be the first!
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post, i) => (
            <React.Fragment key={post.id}>
              <PostCard post={post} currentUserEmail={user?.email} />
              {i === 4 && <AdBanner slot="feed-mid" />}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
