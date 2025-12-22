'use client';

import { useAppStore } from '@/store';
import { QueueItem } from '@/types';
import { ListOrdered, GripVertical, Trash2, Clock, Send, Calendar, Loader2, Image as ImageIcon, Film, Play, Timer, ExternalLink, PlayCircle, StopCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, addMinutes, differenceInSeconds } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useEffect, useRef, useCallback } from 'react';

interface SortableItemProps {
  item: QueueItem;
  estimatedPublishTime: Date;
  onRemove: (id: string) => void;
  onSchedule: (id: string, date: Date) => void;
  onPublishNow: (id: string) => Promise<void>;
  isPublishing: boolean;
  publishingId: string | null;
}

function SortableQueueItem({ item, estimatedPublishTime, onRemove, onSchedule, onPublishNow, isPublishing, publishingId }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const [showScheduler, setShowScheduler] = useState(false);
  const [expandedMedia, setExpandedMedia] = useState<{ url: string; type: string } | null>(null);
  const isThisPublishing = isPublishing && publishingId === item.id;
  const hasMedia = item.tweet.media && item.tweet.media.length > 0;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition || 'transform 250ms cubic-bezier(0.25, 1, 0.5, 1)',
    zIndex: isDragging ? 50 : 1,
  };

  // Extract URLs from the custom text
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = item.customText.match(urlRegex) || [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        card p-0 overflow-hidden transition-shadow duration-200
        ${isDragging ? 'opacity-50 ring-2 ring-[var(--accent)] shadow-xl shadow-[var(--accent)]/20' : ''}
        ${isThisPublishing ? 'opacity-70' : ''}
      `}
    >
      <div className="flex items-stretch">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="drag-handle flex items-center justify-center px-3 bg-[var(--bg-secondary)] border-r border-[var(--border)]"
        >
          <GripVertical className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Position badge and metadata */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="w-6 h-6 rounded bg-[var(--accent-dim)] text-[var(--accent)] text-xs font-mono font-bold flex items-center justify-center">
                  {item.position + 1}
                </span>
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  @{item.tweet.authorUsername}
                </span>
                {item.scheduledAt ? (
                  <span className="flex items-center gap-1 text-xs text-[var(--yellow)] font-mono">
                    <Calendar className="w-3 h-3" />
                    {format(item.scheduledAt, "d MMM, HH:mm", { locale: es })}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-[var(--purple)] font-mono">
                    <Timer className="w-3 h-3" />
                    {format(estimatedPublishTime, "HH:mm", { locale: es })}
                  </span>
                )}
                {hasMedia && (
                  <span className="flex items-center gap-1 text-xs text-[var(--cyan)]">
                    {item.tweet.media![0].type === 'VIDEO' ? (
                      <Film className="w-3 h-3" />
                    ) : item.tweet.media![0].type === 'GIF' ? (
                      <Play className="w-3 h-3" />
                    ) : (
                      <ImageIcon className="w-3 h-3" />
                    )}
                    {item.tweet.media!.length}
                  </span>
                )}
              </div>

              {/* Tweet content */}
              <p className="text-sm text-[var(--text-primary)] line-clamp-2">
                {item.customText}
              </p>

              {/* Character count */}
              <p className={`text-xs font-mono mt-1 ${item.customText.length > 280 ? 'text-[var(--red)]' : 'text-[var(--text-muted)]'}`}>
                {item.customText.length}/280
              </p>

              {/* Media Preview - Always visible */}
              {hasMedia && (
                <div className="flex gap-2 mt-3">
                  {item.tweet.media!.slice(0, 4).map((media, i) => (
                    <button
                      key={i}
                      onClick={() => setExpandedMedia({ url: media.url, type: media.type })}
                      className="relative w-16 h-16 rounded-lg overflow-hidden bg-[var(--bg-secondary)] group cursor-pointer hover:ring-2 hover:ring-[var(--accent)] transition-all"
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
                  {item.tweet.media!.length > 4 && (
                    <div className="w-16 h-16 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-xs text-[var(--text-muted)]">
                      +{item.tweet.media!.length - 4}
                    </div>
                  )}
                </div>
              )}

              {/* URLs Preview - Always visible */}
              {urls.length > 0 && (
                <div className="mt-2 space-y-1">
                  {urls.slice(0, 2).map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-[var(--cyan)] hover:underline truncate"
                    >
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{url}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowScheduler(!showScheduler)}
                disabled={isPublishing}
                className="p-2 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--yellow)] transition-colors disabled:opacity-50"
                title="Programar"
              >
                <Clock className="w-4 h-4" />
              </button>
              <button
                onClick={() => onPublishNow(item.id)}
                disabled={isPublishing || item.customText.length > 280}
                className="p-2 rounded hover:bg-[var(--accent-dim)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
                title="Publicar ahora"
              >
                {isThisPublishing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => onRemove(item.id)}
                disabled={isPublishing}
                className="p-2 rounded hover:bg-[var(--red-dim)] text-[var(--text-muted)] hover:text-[var(--red)] transition-colors disabled:opacity-50"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scheduler */}
          <AnimatePresence>
            {showScheduler && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 pt-3 border-t border-[var(--border)]"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="datetime-local"
                    className="input input-mono text-sm"
                    defaultValue={item.scheduledAt ? format(item.scheduledAt, "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        onSchedule(item.id, new Date(e.target.value));
                        setShowScheduler(false);
                      }
                    }}
                  />
                  <button
                    onClick={() => setShowScheduler(false)}
                    className="btn btn-ghost text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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

export function QueueView() {
  const {
    queue,
    removeFromQueue,
    reorderQueue,
    updateQueueItem,
    refreshQueue,
    refreshTweets,
    showToast,
    config,
    isAutoPublishing,
    setIsAutoPublishing,
    nextPublishTime,
    setNextPublishTime,
    autoPublishCountdown,
    setAutoPublishCountdown,
  } = useAppStore();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const autoPublishRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate estimated publish time for each tweet based on auto-publish state
  const getEstimatedPublishTime = useCallback((position: number) => {
    const intervalMinutes = config.publishIntervalMinutes || 30;
    if (isAutoPublishing && nextPublishTime) {
      return addMinutes(nextPublishTime, position * intervalMinutes);
    }
    return addMinutes(new Date(), position * intervalMinutes);
  }, [config.publishIntervalMinutes, isAutoPublishing, nextPublishTime]);

  // Publish a single tweet
  const publishTweet = useCallback(async (item: QueueItem) => {
    if (item.customText.length > 280) {
      showToast('El tweet excede los 280 caracteres', 'error');
      return false;
    }

    setIsPublishing(true);
    setPublishingId(item.id);

    try {
      const response = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueItemId: item.id, text: item.customText }),
      });

      const data = await response.json();

      if (data.success) {
        showToast('Tweet publicado exitosamente', 'success');
        await Promise.all([refreshQueue(), refreshTweets()]);
        return true;
      } else {
        showToast(`Error: ${data.error}`, 'error');
        return false;
      }
    } catch (error) {
      showToast('Error al publicar el tweet', 'error');
      console.error('Publish error:', error);
      return false;
    } finally {
      setIsPublishing(false);
      setPublishingId(null);
    }
  }, [refreshQueue, refreshTweets, showToast]);

  // Start auto-publishing
  const startAutoPublish = useCallback(async () => {
    const sortedQueue = [...queue].sort((a, b) => a.position - b.position);
    if (sortedQueue.length === 0) {
      showToast('La cola está vacía', 'error');
      return;
    }

    setIsAutoPublishing(true);

    // Publish the first tweet immediately
    const firstItem = sortedQueue[0];
    const success = await publishTweet(firstItem);

    if (!success) {
      setIsAutoPublishing(false);
      return;
    }

    // Schedule next publish
    const intervalMs = (config.publishIntervalMinutes || 30) * 60 * 1000;
    const nextTime = new Date(Date.now() + intervalMs);
    setNextPublishTime(nextTime);
    setAutoPublishCountdown(Math.floor(intervalMs / 1000));

  }, [queue, publishTweet, config.publishIntervalMinutes, showToast, setIsAutoPublishing, setNextPublishTime, setAutoPublishCountdown]);

  // Stop auto-publishing
  const stopAutoPublish = useCallback(() => {
    setIsAutoPublishing(false);
    setNextPublishTime(null);
    setAutoPublishCountdown(0);
    if (autoPublishRef.current) {
      clearTimeout(autoPublishRef.current);
      autoPublishRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    showToast('Auto-publicación detenida', 'info');
  }, [showToast, setIsAutoPublishing, setNextPublishTime, setAutoPublishCountdown]);

  // Handle auto-publish timer (countdown is handled in Sidebar)
  useEffect(() => {
    if (!isAutoPublishing || !nextPublishTime) return;

    // Auto-publish timer
    const timeUntilNext = nextPublishTime.getTime() - Date.now();
    autoPublishRef.current = setTimeout(async () => {
      const sortedQueue = [...queue].sort((a, b) => a.position - b.position);

      if (sortedQueue.length === 0) {
        stopAutoPublish();
        showToast('Cola completada', 'success');
        return;
      }

      const nextItem = sortedQueue[0];
      const success = await publishTweet(nextItem);

      if (success && queue.length > 1) {
        // Schedule next
        const intervalMs = (config.publishIntervalMinutes || 30) * 60 * 1000;
        setNextPublishTime(new Date(Date.now() + intervalMs));
      } else if (!success) {
        stopAutoPublish();
      } else {
        // Last tweet published
        stopAutoPublish();
        showToast('¡Todos los tweets publicados!', 'success');
      }
    }, timeUntilNext);

    return () => {
      if (autoPublishRef.current) clearTimeout(autoPublishRef.current);
    };
  }, [isAutoPublishing, nextPublishTime, queue, publishTweet, stopAutoPublish, config.publishIntervalMinutes, showToast]);

  // Format countdown
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      reorderQueue(active.id as string, over.id as string);
    }
  };

  const activeItem = activeId ? queue.find((item) => item.id === activeId) : null;

  const handleSchedule = (id: string, date: Date) => {
    updateQueueItem(id, { scheduledAt: date });
    showToast(`Programado para ${format(date, "d MMM, HH:mm", { locale: es })}`, 'success');
  };

  const handlePublishNow = async (id: string) => {
    const item = queue.find((q) => q.id === id);
    if (item) {
      await publishTweet(item);
    }
  };

  const sortedQueue = [...queue].sort((a, b) => a.position - b.position);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="px-6 py-4 border-b border-[var(--border)] bg-[var(--bg-primary)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-[var(--accent)]" />
              Cola de Publicación
              {queue.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-mono bg-[var(--accent-dim)] text-[var(--accent)] rounded">
                  {queue.length} en cola
                </span>
              )}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Arrastra para reordenar. Intervalo: {config.publishIntervalMinutes || 30} min entre tweets.
            </p>
          </div>

          {/* Auto-publish controls */}
          {queue.length > 0 && (
            <div className="flex items-center gap-3">
              {isAutoPublishing ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--green-dim)] text-[var(--green)]">
                    <div className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
                    <span className="text-sm font-mono">
                      Próximo en {formatCountdown(autoPublishCountdown)}
                    </span>
                  </div>
                  <button
                    onClick={stopAutoPublish}
                    disabled={isPublishing}
                    className="btn btn-ghost flex items-center gap-2 text-[var(--red)] hover:bg-[var(--red-dim)]"
                  >
                    <StopCircle className="w-4 h-4" />
                    Detener
                  </button>
                </>
              ) : (
                <button
                  onClick={startAutoPublish}
                  disabled={isPublishing}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {isPublishing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlayCircle className="w-4 h-4" />
                  )}
                  {isPublishing ? 'Publicando...' : 'Auto-publicar'}
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {queue.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="empty-state"
          >
            <div className="w-20 h-20 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
              <ListOrdered className="empty-state-icon" />
            </div>
            <h3 className="text-lg font-medium text-[var(--text-secondary)] mb-2">
              La cola está vacía
            </h3>
            <p className="text-sm text-[var(--text-muted)] max-w-md">
              Aprueba tweets desde el Inbox para añadirlos a la cola de publicación.
            </p>
          </motion.div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedQueue.map((item) => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {sortedQueue.map((item, index) => (
                  <SortableQueueItem
                    key={item.id}
                    item={item}
                    estimatedPublishTime={getEstimatedPublishTime(index)}
                    onRemove={removeFromQueue}
                    onSchedule={handleSchedule}
                    onPublishNow={handlePublishNow}
                    isPublishing={isPublishing}
                    publishingId={publishingId}
                  />
                ))}
              </SortableContext>
              <DragOverlay>
                {activeItem ? (
                  <motion.div
                    initial={{ scale: 1 }}
                    animate={{ scale: 1.05, rotate: 1 }}
                    className="card p-4 shadow-2xl ring-2 ring-[var(--accent)] bg-[var(--bg-primary)]"
                    style={{ cursor: 'grabbing' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded bg-[var(--accent)] text-[var(--bg-secondary)] text-xs font-mono font-bold flex items-center justify-center">
                        {activeItem.position + 1}
                      </span>
                      <p className="text-sm text-[var(--text-primary)] line-clamp-1 flex-1">
                        {activeItem.customText}
                      </p>
                      <GripVertical className="w-5 h-5 text-[var(--accent)]" />
                    </div>
                  </motion.div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}
      </div>
    </div>
  );
}
