'use client';

import { useAppStore } from '@/store';
import { CheckCircle, ExternalLink, Calendar, Image as ImageIcon, Play, Film, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';

export function PublishedView() {
  const { tweets } = useAppStore();
  const [expandedMedia, setExpandedMedia] = useState<{ url: string; type: string } | null>(null);

  const publishedTweets = tweets
    .filter((t) => t.status === 'published')
    .sort((a, b) => b.scrapedAt.getTime() - a.scrapedAt.getTime());

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-primary)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-[var(--green)]" />
              Publicados
              {publishedTweets.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-mono bg-[var(--green-dim)] text-[var(--green)] rounded">
                  {publishedTweets.length} tweets
                </span>
              )}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Historial de tweets publicados
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {publishedTweets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="empty-state"
          >
            <div className="w-20 h-20 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
              <CheckCircle className="empty-state-icon" />
            </div>
            <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">
              Sin publicaciones aún
            </h3>
            <p className="text-sm text-[var(--text-muted)] max-w-md">
              Los tweets que publiques aparecerán aquí.
            </p>
          </motion.div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {publishedTweets.map((tweet, index) => (
              <motion.div
                key={tweet.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-[var(--green)]" />
                      <span className="text-xs text-[var(--text-muted)] font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(tweet.scrapedAt, "d MMM yyyy, HH:mm", { locale: es })}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        · Fuente: @{tweet.authorUsername}
                      </span>
                      {tweet.media && tweet.media.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-[var(--cyan)]">
                          <ImageIcon className="w-3 h-3" />
                          {tweet.media.length}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-primary)]">{tweet.processedContent}</p>

                    {/* Media preview */}
                    {tweet.media && tweet.media.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {tweet.media.slice(0, 4).map((media, i) => (
                          <button
                            key={i}
                            onClick={() => setExpandedMedia({ url: media.url, type: media.type })}
                            className="relative w-16 h-16 rounded-lg overflow-hidden bg-[var(--bg-secondary)] cursor-pointer hover:ring-2 hover:ring-[var(--accent)] transition-all group"
                          >
                            <img
                              src={media.thumbnailUrl || media.url}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                            />
                            {(media.type === 'VIDEO' || media.type === 'GIF') && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                <Play className="w-5 h-5 text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                        {tweet.media.length > 4 && (
                          <div className="w-16 h-16 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-xs text-[var(--text-muted)]">
                            +{tweet.media.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <a
                    href={tweet.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Media Lightbox Modal */}
      <AnimatePresence>
        {expandedMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedMedia(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[90vh] w-full"
            >
              <button
                onClick={() => setExpandedMedia(null)}
                className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              {expandedMedia.type === 'VIDEO' ? (
                <video
                  src={expandedMedia.url}
                  controls
                  autoPlay
                  className="w-full h-full max-h-[85vh] object-contain rounded-lg"
                />
              ) : (
                <img
                  src={expandedMedia.url}
                  alt=""
                  className="w-full h-full max-h-[85vh] object-contain rounded-lg"
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
