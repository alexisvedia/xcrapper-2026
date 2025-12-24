'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import { ScrapedTweet } from '@/types';
import { Check, X, Pencil, ExternalLink, Play, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'motion/react';
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
  const [showOriginal, setShowOriginal] = useState(false);
  const [reasonModal, setReasonModal] = useState<{ type: 'reject' | 'approve'; isOpen: boolean }>({ type: 'reject', isOpen: false });
  const [reason, setReason] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reasonInputRef = useRef<HTMLTextAreaElement>(null);

  // Swipe logic
  const x = useMotionValue(0);
  const checkOpacity = useTransform(x, [50, 100], [0, 1]);
  const xOpacity = useTransform(x, [-100, -50], [1, 0]);
  
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 100) {
      if (navigator.vibrate) navigator.vibrate(50);
      approveTweet(tweet.id);
    } else if (info.offset.x < -100) {
      if (navigator.vibrate) navigator.vibrate(50);
      rejectTweet(tweet.id, 'Rechazado manualmente');
    }
  };

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

  // Reason modal handlers
  const openRejectModal = () => {
    setReason('');
    setReasonModal({ type: 'reject', isOpen: true });
    setTimeout(() => reasonInputRef.current?.focus(), 100);
  };

  const openApproveModal = () => {
    setReason('');
    setReasonModal({ type: 'approve', isOpen: true });
    setTimeout(() => reasonInputRef.current?.focus(), 100);
  };

  const handleReasonSubmit = () => {
    if (reasonModal.type === 'reject') {
      rejectTweet(tweet.id, reason || 'Sin razón especificada');
    } else {
      approveTweet(tweet.id, reason || undefined);
    }
    setReasonModal({ type: 'reject', isOpen: false });
    setReason('');
  };

  const handleReasonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setReasonModal({ type: 'reject', isOpen: false });
      setReason('');
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleReasonSubmit();
    }
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
      <div className="flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
          {tweet.authorAvatar ? (
            <img
              src={tweet.authorAvatar}
              alt=""
              className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-xs text-[var(--text-muted)] flex-shrink-0">
              {tweet.authorName.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
              <span className="text-xs md:text-sm font-medium text-[var(--text-primary)] truncate">{tweet.authorName}</span>
              <span className="text-[10px] md:text-xs text-[var(--text-muted)] truncate">@{tweet.authorUsername}</span>
            </div>
            <span className="text-[10px] md:text-xs text-[var(--text-muted)]">
              {formatDistanceToNow(tweet.scrapedAt, { addSuffix: true, locale: es })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
          {getStatusBadge()}
          <span className={`font-mono text-xs md:text-sm font-medium ${getScoreColor(tweet.relevanceScore)}`}>
            {tweet.relevanceScore}
          </span>
          <a
            href={tweet.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 md:p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4" />
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

      {/* Content - Mobile: Stacked with accordion | Desktop: Side by side */}
      <div className="hidden md:grid md:grid-cols-2 md:divide-x divide-[var(--border)]">
        {/* Original - Desktop */}
        <div className="p-4">
          <p className="label mb-2">Original</p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-mono">
            {tweet.originalContent}
          </p>
        </div>

        {/* Processed - Desktop */}
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

      {/* Content - Mobile Only: Processed first with collapsible original */}
      <div className="md:hidden relative overflow-hidden">
        {tweet.status === 'pending' && (
          <>
            <motion.div style={{ opacity: checkOpacity }} className="absolute inset-y-0 left-0 flex items-center pl-6 bg-[var(--green)] w-full z-0">
              <Check className="text-[var(--bg-primary)] w-6 h-6" />
            </motion.div>
            <motion.div style={{ opacity: xOpacity }} className="absolute inset-y-0 right-0 flex items-center justify-end pr-6 bg-[var(--red)] w-full z-0">
              <X className="text-[var(--bg-primary)] w-6 h-6" />
            </motion.div>
          </>
        )}
        <motion.div
          drag={tweet.status === 'pending' && !isEditing ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          style={{ x }}
          onDragEnd={handleDragEnd}
          className="relative z-10 bg-[var(--bg-primary)]"
        >
        {/* Processed Content - Primary on mobile */}
        <div className="p-3 bg-[var(--bg-secondary)]">
          <div className="flex items-center justify-between mb-2">
            <p className="label">Procesado</p>
            {!isEditing && tweet.status === 'pending' && (
              <button
                onClick={() => setEditingTweetId(tweet.id)}
                className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <textarea
                  ref={textareaRef}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="textarea text-sm"
                  rows={4}
                />
                <div className="flex items-center justify-between">
                  <span className={`char-counter ${charCount > maxChars ? 'danger' : charCount > maxChars - 20 ? 'warning' : ''}`}>
                    {charCount}/{maxChars}
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={handleCancel} className="btn btn-ghost text-xs py-1.5 px-3">
                      Cancelar
                    </button>
                    <button onClick={handleSave} className="btn btn-primary text-xs py-1.5 px-3">
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

        {/* Original Content - Collapsible accordion on mobile */}
        <div className="border-t border-[var(--border)]">
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-[var(--bg-secondary)] transition-colors"
          >
            <span className="label">Ver original</span>
            <ChevronDown
              className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${showOriginal ? 'rotate-180' : ''}`}
            />
          </button>
          <AnimatePresence>
            {showOriginal && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3">
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-mono bg-[var(--bg-tertiary)] p-2.5 rounded-lg">
                    {tweet.originalContent}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </motion.div>
      </div>

      {/* Actions - Only show for pending tweets */}
      {/* Fitts's Law: Large touch targets (min 44px), full-width on mobile */}
      {tweet.status === 'pending' && (
        <div className="flex items-center gap-2 px-3 md:px-4 py-3 border-t border-[var(--border)]">
          <button
            onClick={openRejectModal}
            className="flex-1 md:flex-none btn btn-reject text-sm py-2.5 min-h-[44px]"
          >
            <X className="w-4 h-4" />
            <span className="ml-1">Rechazar</span>
          </button>
          <button
            onClick={() => approveTweet(tweet.id)}
            className="flex-1 md:flex-none btn btn-approve text-sm py-2.5 min-h-[44px]"
          >
            <Check className="w-4 h-4" />
            <span className="ml-1">Aprobar</span>
          </button>
        </div>
      )}

      {/* Actions for rejected tweets - can approve with reason */}
      {tweet.status === 'rejected' && (
        <div className="flex items-center gap-2 px-3 md:px-4 py-3 border-t border-[var(--border)]">
          <button
            onClick={openApproveModal}
            className="flex-1 md:flex-none btn btn-approve text-sm py-2.5 min-h-[44px]"
          >
            <Check className="w-4 h-4" />
            <span className="ml-1">Aprobar (indicar por qué)</span>
          </button>
        </div>
      )}

      {/* Rejection reason */}
      {tweet.status === 'rejected' && tweet.rejectionReason && (
        <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--red-dim)]">
          <p className="text-xs text-[var(--red)]">Rechazado: {tweet.rejectionReason}</p>
        </div>
      )}

      {/* Approval reason (for previously rejected tweets) */}
      {tweet.status === 'approved' && tweet.approvalReason && (
        <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--green-dim)]">
          <p className="text-xs text-[var(--green)]">Aprobado: {tweet.approvalReason}</p>
        </div>
      )}

      {/* Reason Modal */}
      <AnimatePresence>
        {reasonModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setReasonModal({ type: 'reject', isOpen: false })}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <h3 className="text-sm font-medium text-[var(--text-primary)]">
                  {reasonModal.type === 'reject' ? '¿Por qué rechazas este tweet?' : '¿Por qué apruebas este tweet?'}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Esta info ayudará a mejorar el prompt del AI
                </p>
              </div>
              <div className="p-4">
                <textarea
                  ref={reasonInputRef}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  onKeyDown={handleReasonKeyDown}
                  placeholder={reasonModal.type === 'reject'
                    ? "Ej: No es noticia, es opinión personal..."
                    : "Ej: El AI lo rechazó pero es relevante porque..."
                  }
                  className="textarea text-sm w-full"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
                <button
                  onClick={() => setReasonModal({ type: 'reject', isOpen: false })}
                  className="btn btn-ghost text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReasonSubmit}
                  className={`btn text-xs ${reasonModal.type === 'reject' ? 'btn-reject' : 'btn-approve'}`}
                >
                  {reasonModal.type === 'reject' ? 'Rechazar' : 'Aprobar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
