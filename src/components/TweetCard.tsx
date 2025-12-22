'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import { ScrapedTweet } from '@/types';
import { Check, X, Pencil, ExternalLink, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface TweetCardProps {
  tweet: ScrapedTweet;
  index: number;
}

export function TweetCard({ tweet, index }: TweetCardProps) {
  const { approveTweet, rejectTweet, updateTweetContent, editingTweetId, setEditingTweetId } = useAppStore();
  const [editedContent, setEditedContent] = useState(tweet.processedContent);
  const [expandedMedia, setExpandedMedia] = useState<{ url: string; type: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isEditing = editingTweetId === tweet.id;
  const charCount = editedContent.length;
  const maxChars = 280;

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(editedContent.length, editedContent.length);
    }
  }, [isEditing, editedContent.length]);

  const handleSave = () => {
    updateTweetContent(tweet.id, editedContent);
    setEditingTweetId(null);
  };

  const handleCancel = () => {
    setEditedContent(tweet.processedContent);
    setEditingTweetId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') handleCancel();
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave();
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-[var(--green)]';
    if (score >= 5) return 'text-[var(--yellow)]';
    return 'text-[var(--text-muted)]';
  };

  const getStatusBadge = () => {
    switch (tweet.status) {
      case 'approved':
        return <span className="badge badge-success">Aprobado</span>;
      case 'rejected':
        return <span className="badge badge-error">Rechazado</span>;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.03 }}
      className="card"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          {tweet.authorAvatar ? (
            <img
              src={tweet.authorAvatar}
              alt=""
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs text-[var(--text-muted)]">
              {tweet.authorName.charAt(0)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text-primary)]">{tweet.authorName}</span>
              <span className="text-xs text-[var(--text-muted)]">@{tweet.authorUsername}</span>
            </div>
            <span className="text-xs text-[var(--text-muted)]">
              {formatDistanceToNow(tweet.scrapedAt, { addSuffix: true, locale: es })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge()}
          <span className={`font-mono text-sm font-medium ${getScoreColor(tweet.relevanceScore)}`}>
            {tweet.relevanceScore}
          </span>
          <a
            href={tweet.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Media */}
      {tweet.media && tweet.media.length > 0 && (
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <div className="flex gap-2 overflow-x-auto">
            {tweet.media.map((m, i) => (
              <button
                key={i}
                onClick={() => setExpandedMedia({ url: m.url, type: m.type })}
                className="relative flex-shrink-0 rounded overflow-hidden hover:ring-1 hover:ring-[var(--accent)] transition-all group cursor-pointer"
              >
                <img
                  src={m.thumbnailUrl || m.url}
                  alt=""
                  className="h-16 w-auto object-cover"
                />
                {(m.type === 'VIDEO' || m.type === 'GIF') && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Play className="w-5 h-5 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
        {/* Original */}
        <div className="p-4">
          <p className="label mb-2">Original</p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-mono">
            {tweet.originalContent}
          </p>
        </div>

        {/* Processed */}
        <div className="p-4 bg-[var(--bg-secondary)]">
          <div className="flex items-center justify-between mb-2">
            <p className="label">Procesado</p>
            {!isEditing && tweet.status === 'pending' && (
              <button
                onClick={() => setEditingTweetId(tweet.id)}
                className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <textarea
                  ref={textareaRef}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="textarea text-sm"
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <span className={`char-counter ${charCount > maxChars ? 'danger' : charCount > maxChars - 20 ? 'warning' : ''}`}>
                    {charCount}/{maxChars}
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={handleCancel} className="btn btn-ghost text-xs py-1 px-2">
                      Cancelar
                    </button>
                    <button onClick={handleSave} className="btn btn-primary text-xs py-1 px-2">
                      Guardar
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-[var(--text-primary)] leading-relaxed"
              >
                {tweet.processedContent}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Actions - Only show for pending tweets */}
      {tweet.status === 'pending' && (
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
          <button
            onClick={() => rejectTweet(tweet.id, 'Rechazado manualmente')}
            className="btn btn-reject text-xs"
          >
            <X className="w-3.5 h-3.5" />
            Rechazar
          </button>
          <button
            onClick={() => approveTweet(tweet.id)}
            className="btn btn-approve text-xs"
          >
            <Check className="w-3.5 h-3.5" />
            Aprobar
          </button>
        </div>
      )}

      {/* Rejection reason */}
      {tweet.status === 'rejected' && tweet.rejectionReason && (
        <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--red-dim)]">
          <p className="text-xs text-[var(--red)]">{tweet.rejectionReason}</p>
        </div>
      )}

      {/* Media Lightbox */}
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
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[90vh] w-full"
            >
              <button
                onClick={() => setExpandedMedia(null)}
                className="absolute -top-10 right-0 p-2 rounded hover:bg-white/10 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              {expandedMedia.type === 'VIDEO' ? (
                <video
                  src={expandedMedia.url}
                  controls
                  autoPlay
                  className="w-full h-full max-h-[85vh] object-contain rounded"
                />
              ) : (
                <img
                  src={expandedMedia.url}
                  alt=""
                  className="w-full h-full max-h-[85vh] object-contain rounded"
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
