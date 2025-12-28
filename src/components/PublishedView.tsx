'use client';

import { useAppStore } from '@/store';
import { CheckCircle, ExternalLink, Calendar, Image as ImageIcon, Play, X, Trash2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';

export function PublishedView() {
  const { tweets, deleteTweets } = useAppStore();
  const [expandedMedia, setExpandedMedia] = useState<{ url: string; type: string } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const publishedTweets = tweets
    .filter((t) => t.status === 'published')
    .sort((a, b) => b.scrapedAt.getTime() - a.scrapedAt.getTime());

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    if (window.confirm(`¿Estás seguro de eliminar ${selectedIds.size} tweets?`)) {
      await deleteTweets(Array.from(selectedIds));
      setIsSelecting(false);
      setSelectedIds(new Set());
    }
  };

  const cancelSelection = () => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="pl-4 md:pl-6 pr-4 md:pr-6 py-4 border-b border-[var(--border)] bg-[var(--bg-primary)] flex items-start justify-between gap-4">
        <div>
          <h1 className="hidden md:flex text-base md:text-xl font-semibold items-center gap-2">
            <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-[var(--green)] flex-shrink-0" />
            <span>Publicados</span>
            {publishedTweets.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] md:text-xs font-mono bg-[var(--green-dim)] text-[var(--green)] rounded">
                {publishedTweets.length}
              </span>
            )}
          </h1>
          <p className="text-[11px] md:text-sm text-[var(--text-muted)] mt-1">
            Historial de publicaciones
          </p>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-2">
          {publishedTweets.length > 0 && (
            isSelecting ? (
              <div className="flex items-center gap-2 animate-in fade-in duration-200">
                <span className="text-xs text-[var(--text-muted)] mr-1">
                  {selectedIds.size} seleccionados
                </span>
                <button
                  onClick={cancelSelection}
                  className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={selectedIds.size === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[var(--red)] hover:bg-[var(--red-hover)] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsSelecting(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--red)] hover:bg-[var(--red-dim)] rounded-md transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            )
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 relative">
        {publishedTweets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="empty-state"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-base md:text-lg font-medium text-[var(--text-secondary)] mb-2">
              Sin publicaciones aún
            </h3>
            <p className="text-xs md:text-sm text-[var(--text-muted)] max-w-md">
              Los tweets que publiques aparecerán aquí.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-3xl mx-auto space-y-3 md:space-y-4"
          >
            {publishedTweets.map((tweet, index) => (
              <motion.div
                key={tweet.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => isSelecting && toggleSelection(tweet.id)}
                className={`card p-3 md:p-4 transition-all duration-200 ${
                  isSelecting 
                    ? 'cursor-pointer active:scale-[0.98]' 
                    : ''
                } ${
                  selectedIds.has(tweet.id) 
                    ? 'ring-2 ring-[var(--accent)] bg-[var(--bg-secondary)]' 
                    : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2 md:gap-4">
                  {isSelecting && (
                    <div className={`
                      flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center mt-1 transition-colors
                      ${selectedIds.has(tweet.id)
                        ? 'bg-[var(--accent)] border-[var(--accent)]'
                        : 'border-[var(--text-muted)] bg-transparent'
                      }
                    `}>
                      {selectedIds.has(tweet.id) && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 md:gap-2 mb-2 flex-wrap">
                      <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-[var(--green)] flex-shrink-0" />
                      <span className="text-[10px] md:text-xs text-[var(--text-muted)] font-mono flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5 md:w-3 md:h-3" />
                        <span className="hidden sm:inline">{format(tweet.scrapedAt, "d MMM yyyy, HH:mm", { locale: es })}</span>
                        <span className="sm:hidden">{format(tweet.scrapedAt, "d MMM, HH:mm", { locale: es })}</span>
                      </span>
                      <span className="text-[10px] md:text-xs text-[var(--text-muted)] truncate">
                        <span className="hidden sm:inline">· Fuente: </span>@{tweet.authorUsername}
                      </span>
                      {tweet.media && tweet.media.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px] md:text-xs text-[var(--cyan)]">
                          <ImageIcon className="w-2.5 h-2.5 md:w-3 md:h-3" />
                          {tweet.media.length}
                        </span>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-[var(--text-primary)]">{tweet.processedContent}</p>

                    {/* Media preview */}
                    {tweet.media && tweet.media.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {tweet.media.slice(0, 4).map((media, i) => (
                          <button
                            key={i}
                            onClick={(e) => {
                              if (isSelecting) return;
                              e.stopPropagation();
                              setExpandedMedia({ url: media.url, type: media.type });
                            }}
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
                  {!isSelecting && (
                    <a
                      href={tweet.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 md:p-2 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* FAB - Mobile Only */}
      <AnimatePresence>
        {publishedTweets.length > 0 && (
          <div className="fixed bottom-6 right-6 md:hidden z-50 flex flex-col items-end gap-3">
            {isSelecting && selectedIds.size > 0 && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={handleDeleteSelected}
                className="w-14 h-14 rounded-full bg-red-500 text-white shadow-lg flex items-center justify-center"
              >
                <Trash2 className="w-6 h-6" />
              </motion.button>
            )}
            
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={() => isSelecting ? cancelSelection() : setIsSelecting(true)}
              className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors ${
                isSelecting 
                  ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border)]' 
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)]'
              }`}
            >
              {isSelecting ? (
                <X className="w-6 h-6" />
              ) : (
                <Trash2 className="w-6 h-6" />
              )}
            </motion.button>
          </div>
        )}
      </AnimatePresence>

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
