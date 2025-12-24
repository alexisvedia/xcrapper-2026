'use client';

import { useAppStore } from '@/store';
import { QueueItem } from '@/types';
import { ListOrdered, GripVertical, Trash2, Clock, Send, Calendar, Loader2, Image as ImageIcon, Film, Play, Timer, ExternalLink, PlayCircle, StopCircle, X } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo, useDragControls } from 'motion/react';
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
  const [isMobile, setIsMobile] = useState(false);
  
  // Swipe-to-delete motion values
  const x = useMotionValue(0);
  const dragControls = useDragControls();
  const deleteOpacity = useTransform(x, [-100, -50], [1, 0]);
  const deleteScale = useTransform(x, [-100, -50], [1, 0.8]);
  
  const isThisPublishing = isPublishing && publishingId === item.id;
  const hasMedia = item.tweet.media && item.tweet.media.length > 0;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x < -100) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }
      onRemove(item.id);
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition || 'transform 250ms cubic-bezier(0.25, 1, 0.5, 1)',
    zIndex: isDragging ? 50 : 1,
  };

  // Extract URLs from the custom text
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = item.customText.match(urlRegex) || [];

  const cardContent = (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        card p-0 overflow-hidden transition-all duration-300 relative group
        ${isDragging ? 'opacity-50 ring-2 ring-[var(--accent)] shadow-xl shadow-[var(--accent)]/20' : ''}
      `}
    >
      {/* Delete Indicator Background */}
      <motion.div 
        style={{ opacity: deleteOpacity }}
        className="absolute inset-0 bg-[var(--red)] flex items-center justify-end pr-6 z-0 rounded-xl"
      >
        <motion.div style={{ scale: deleteScale }}>
          <Trash2 className="w-6 h-6 text-white" />
        </motion.div>
      </motion.div>

      {/* Swipeable Content */}
      <motion.div
        style={{ x, touchAction: 'pan-y' }}
        drag={isMobile && !isPublishing ? "x" : false}
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ right: 0 }}
        dragElastic={{ right: 0.1 }}
        onDragEnd={handleDragEnd}
        className="relative z-10 bg-[var(--bg-secondary)] h-full"
      >
        <div className="flex items-stretch h-full">
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="drag-handle flex items-center justify-center px-3 bg-[var(--bg-secondary)] border-r border-[var(--border)] cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-5 h-5 text-[var(--text-muted)]" />
          </div>

          {/* Content */}
          <div 
            className="flex-1 min-w-0 p-3 md:p-4 overflow-hidden"
            onPointerDown={(e) => isMobile && !isPublishing && dragControls.start(e)}
          >
            {/* Header row with metadata */}
            <div className="flex items-center gap-1.5 md:gap-2 mb-2 flex-wrap">
            <span className="w-6 h-6 rounded bg-[var(--accent-dim)] text-[var(--accent)] text-xs font-mono font-bold flex items-center justify-center flex-shrink-0">
              {item.position + 1}
            </span>
            <span className="text-xs text-[var(--text-muted)] font-mono">
              @{item.tweet.authorUsername}
            </span>
            {item.scheduledAt ? (
              <span className="flex items-center gap-1 text-xs text-[var(--yellow)] font-mono">
                <Calendar className="w-3 h-3" />
                {format(item.scheduledAt, "HH:mm", { locale: es })}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-[var(--purple)] font-mono">
                <Timer className="w-3 h-3" />
                {format(estimatedPublishTime, "HH:mm", { locale: es })}
              </span>
            )}
            {hasMedia && (
              <span className="flex items-center gap-1 text-xs text-[var(--cyan)]">
                <ImageIcon className="w-3 h-3" />
                {item.tweet.media!.length}
              </span>
            )}
            {/* Character count inline */}
            <span className={`text-xs font-mono ml-auto ${item.customText.length > 280 ? 'text-[var(--red)]' : 'text-[var(--text-muted)]'}`}>
              {item.customText.length}/280
            </span>
          </div>

          {/* Tweet content */}
          <p className="text-sm text-[var(--text-primary)] leading-relaxed break-words overflow-hidden">
            {item.customText}
          </p>

          {/* Media Preview */}
          {hasMedia && (
            <div className="flex gap-2 mt-3">
              {item.tweet.media!.slice(0, 3).map((media, i) => (
                <button
                  key={i}
                  onClick={() => setExpandedMedia({ url: media.url, type: media.type })}
                  className="relative w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden bg-[var(--bg-secondary)] group cursor-pointer hover:ring-2 hover:ring-[var(--accent)] transition-all flex-shrink-0"
                >
                  <img
                    src={media.thumbnailUrl || media.url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                  />
                  {(media.type === 'VIDEO' || media.type === 'GIF') && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Play className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))}
              {item.tweet.media!.length > 3 && (
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-[var(--bg-secondary)] flex items-center justify-center text-xs text-[var(--text-muted)] flex-shrink-0">
                  +{item.tweet.media!.length - 3}
                </div>
              )}
            </div>
          )}

          {/* URLs Preview */}
          {urls.length > 0 && (
            <div className="mt-2">
              <a
                href={urls[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--cyan)] hover:underline"
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                <span className="truncate max-w-[200px]">{urls[0]}</span>
              </a>
            </div>
          )}

          {/* Actions - Bottom on mobile for thumb reachability (Fitts's Law) */}
          {/* Mobile: 3 equal buttons | Desktop: inline compact buttons */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border)]">
            <button
              onClick={() => onPublishNow(item.id)}
              disabled={isPublishing || item.customText.length > 280}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-[var(--accent)] text-[var(--bg-root)] rounded-lg text-xs font-medium py-2.5 md:py-2 min-h-[44px] md:min-h-0 md:px-3 hover:opacity-90 transition-opacity disabled:opacity-50"
              title="Publicar ahora"
            >
              {isThisPublishing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="hidden md:inline">Publicar</span>
            </button>
            <button
              onClick={() => setShowScheduler(!showScheduler)}
              disabled={isPublishing}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg text-xs font-medium py-2.5 md:py-2 min-h-[44px] md:min-h-0 md:px-3 hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-50"
              title="Programar"
            >
              <Clock className="w-4 h-4" />
              <span className="hidden md:inline">Programar</span>
            </button>
            <button
              onClick={() => onRemove(item.id)}
              disabled={isPublishing}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-[var(--red-dim)] text-[var(--red)] rounded-lg text-xs font-medium py-2.5 md:py-2 min-h-[44px] md:min-h-0 md:px-3 hover:bg-[var(--red)] hover:text-white transition-colors disabled:opacity-50 md:ml-auto"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden md:inline">Eliminar</span>
            </button>
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
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="datetime-local"
                    className="input input-mono text-sm flex-1"
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
      </motion.div>

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

  // Wrap in publishing animation when publishing
  if (isThisPublishing) {
    return (
      <div className="publishing-wrapper">
        {cardContent}
      </div>
    );
  }

  return cardContent;
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
  const queueRef = useRef(queue); // Keep queue ref updated without causing effect re-runs

  // Keep queueRef in sync with queue state
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

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

  // Sync countdown from nextPublishTime on mount and update every second
  useEffect(() => {
    if (!isAutoPublishing || !nextPublishTime) {
      // Clear countdown if not auto-publishing
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }

    // Initial sync
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((nextPublishTime.getTime() - Date.now()) / 1000));
      setAutoPublishCountdown(remaining);

      // If countdown reaches 0, it will be handled by the timer effect below
      if (remaining <= 0 && countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };

    // Update immediately
    updateCountdown();

    // Update every second
    countdownRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [isAutoPublishing, nextPublishTime, setAutoPublishCountdown]);

  // Handle auto-publish timer (triggers when countdown reaches 0)
  // IMPORTANT: Uses queueRef instead of queue to avoid re-running effect when queue changes
  useEffect(() => {
    if (!isAutoPublishing || !nextPublishTime) return;

    const executeAutoPublish = async () => {
      // Use queueRef.current to get the latest queue without causing re-renders
      const sortedQueue = [...queueRef.current].sort((a, b) => a.position - b.position);

      if (sortedQueue.length === 0) {
        stopAutoPublish();
        showToast('Cola completada', 'success');
        return;
      }

      const nextItem = sortedQueue[0];
      const success = await publishTweet(nextItem);

      if (success && queueRef.current.length > 1) {
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
    };

    // Auto-publish timer
    const timeUntilNext = nextPublishTime.getTime() - Date.now();

    // If time already passed (e.g., after page refresh or timer expired), execute immediately
    if (timeUntilNext <= 0) {
      executeAutoPublish();
      return;
    }

    autoPublishRef.current = setTimeout(executeAutoPublish, timeUntilNext);

    return () => {
      if (autoPublishRef.current) clearTimeout(autoPublishRef.current);
    };
  }, [isAutoPublishing, nextPublishTime, publishTweet, stopAutoPublish, config.publishIntervalMinutes, showToast, setNextPublishTime]);

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
      <header className="pl-14 md:pl-6 pr-4 md:pr-6 py-4 border-b border-[var(--border)] bg-[var(--bg-primary)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-base md:text-xl font-semibold flex items-center gap-2">
              <ListOrdered className="w-4 h-4 md:w-5 md:h-5 text-[var(--accent)] flex-shrink-0" />
              <span>Cola</span>
              {queue.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] md:text-xs font-mono bg-[var(--accent-dim)] text-[var(--accent)] rounded">
                  {queue.length}
                </span>
              )}
            </h1>
            <p className="text-[11px] md:text-sm text-[var(--text-muted)] mt-1">
              Intervalo: {config.publishIntervalMinutes || 30} min
            </p>
          </div>

          {/* Auto-publish controls - Desktop only, mobile uses FAB */}
          {queue.length > 0 && (
            <div className="hidden md:flex items-center gap-2 flex-shrink-0">
              {isAutoPublishing ? (
                <>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[var(--green-dim)] text-[var(--green)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
                    <span className="text-xs font-mono">
                      {formatCountdown(autoPublishCountdown)}
                    </span>
                  </div>
                  <button
                    onClick={stopAutoPublish}
                    disabled={isPublishing}
                    className="btn btn-ghost text-[var(--red)] hover:bg-[var(--red-dim)] text-xs px-2 py-1.5"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={startAutoPublish}
                  disabled={isPublishing}
                  className="btn btn-primary text-xs px-3 py-1.5"
                >
                  {isPublishing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <PlayCircle className="w-3.5 h-3.5" />
                  )}
                  <span className="ml-1">Auto</span>
                </button>
              )}
            </div>
          )}

          {/* Mobile: Show countdown badge in header when auto-publishing */}
          {queue.length > 0 && isAutoPublishing && (
            <div className="md:hidden flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[var(--green-dim)] text-[var(--green)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
              <span className="text-xs font-mono">
                {formatCountdown(autoPublishCountdown)}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Content - pb-24 on mobile for FAB clearance */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
        {queue.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="empty-state"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
              <ListOrdered className="w-8 h-8 md:w-10 md:h-10 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-base md:text-lg font-medium text-[var(--text-secondary)] mb-2">
              La cola está vacía
            </h3>
            <p className="text-xs md:text-sm text-[var(--text-muted)] max-w-md">
              Aprueba tweets desde el Inbox para añadirlos a la cola.
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-3xl mx-auto space-y-3"
          >
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
          </motion.div>
        )}
      </div>

      {/* FAB - Floating Action Button for Auto-publish (mobile only) */}
      {queue.length > 0 && (
        <div className="md:hidden fixed bottom-6 right-4 z-40">
          {isAutoPublishing ? (
            <button
              onClick={stopAutoPublish}
              disabled={isPublishing}
              className="w-14 h-14 rounded-full bg-[var(--red)] text-white shadow-lg shadow-[var(--red)]/30 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
            >
              <StopCircle className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={startAutoPublish}
              disabled={isPublishing}
              className="w-14 h-14 rounded-full bg-[var(--accent)] text-[var(--bg-root)] shadow-lg shadow-[var(--accent)]/30 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
            >
              {isPublishing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <PlayCircle className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
