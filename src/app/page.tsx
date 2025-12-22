'use client';

import { useAppStore } from '@/store';
import { Sidebar, InboxView, QueueView, ConfigView, PublishedView, Toast } from '@/components';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const {
    currentView,
    approveTweet,
    rejectTweet,
    setEditingTweetId,
    tweets,
    isLoading,
    isInitialized,
    initializeApp,
  } = useAppStore();

  // Initialize app on mount
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const pendingTweets = tweets.filter((t) => t.status === 'pending');
      const firstPendingTweet = pendingTweets[0];

      if (!firstPendingTweet) return;

      switch (e.key.toLowerCase()) {
        case 'a':
          approveTweet(firstPendingTweet.id);
          break;
        case 'r':
          rejectTweet(firstPendingTweet.id, 'Rechazado con atajo de teclado');
          break;
        case 'e':
          setEditingTweetId(firstPendingTweet.id);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tweets, approveTweet, rejectTweet, setEditingTweetId]);

  const renderView = () => {
    switch (currentView) {
      case 'inbox':
        return <InboxView />;
      case 'queue':
        return <QueueView />;
      case 'published':
        return <PublishedView />;
      case 'config':
        return <ConfigView />;
      default:
        return <InboxView />;
    }
  };

  // Loading state
  if (!isInitialized || isLoading) {
    return (
      <main className="flex h-screen items-center justify-center bg-[var(--bg-void)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--accent-cyan)]" />
          <p className="text-[var(--text-muted)] font-mono text-sm">Cargando XCrapper...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen bg-[var(--bg-void)]">
      <Sidebar />
      {renderView()}
      <Toast />
    </main>
  );
}
