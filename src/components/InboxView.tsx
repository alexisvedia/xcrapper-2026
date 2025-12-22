'use client';

import { useAppStore } from '@/store';
import { TweetCard } from './TweetCard';
import { RefreshCw, Loader2, Square, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useCallback, useRef } from 'react';

type FilterPreset = 'review' | 'pending' | 'all' | 'approved' | 'rejected';

export function InboxView() {
  const {
    tweets,
    refreshTweets,
    refreshQueue,
    showToast,
    approveTweet,
    config,
    isScrapingActive,
    lastScrapeTime,
    setLastScrapeTime,
    scrapeProgress,
    setScrapeProgress,
    scrapeAbortController,
    setScrapeAbortController,
    setCurrentView,
    scrapeLog,
    addToScrapeLog,
    clearScrapeLog,
  } = useAppStore();

  const [activeFilter, setActiveFilter] = useState<FilterPreset>('review');
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [showLog, setShowLog] = useState(true); // Default to showing log
  const autoScrapeTriggeredRef = useRef(false);
  const handleScrapeRef = useRef<() => Promise<void>>(undefined);

  const isScrapingLoading = scrapeProgress !== null;

  // Load last scrape time from localStorage on mount
  useEffect(() => {
    if (!lastScrapeTime) {
      const stored = localStorage.getItem('lastScrapeTime');
      if (stored) {
        setLastScrapeTime(new Date(stored));
      }
    }
  }, [lastScrapeTime, setLastScrapeTime]);

  // Save last scrape time to localStorage when it changes
  useEffect(() => {
    if (lastScrapeTime) {
      localStorage.setItem('lastScrapeTime', lastScrapeTime.toISOString());
    }
  }, [lastScrapeTime]);

  // Format countdown time
  const formatCountdown = useCallback((ms: number): string => {
    if (ms <= 0) return 'ahora';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (!isScrapingActive || !lastScrapeTime) {
      setCountdown('');
      return;
    }

    const intervalHours = config.scrapeIntervalHours || 4;
    const nextScrapeTime = new Date(lastScrapeTime.getTime() + intervalHours * 60 * 60 * 1000);

    const updateCountdown = () => {
      const now = new Date();
      const remaining = nextScrapeTime.getTime() - now.getTime();
      setCountdown(formatCountdown(remaining));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isScrapingActive, lastScrapeTime, config.scrapeIntervalHours, formatCountdown]);

  // Auto-trigger scrape when countdown reaches 0
  useEffect(() => {
    if (!isScrapingActive || !lastScrapeTime || isScrapingLoading) {
      autoScrapeTriggeredRef.current = false;
      return;
    }

    const intervalHours = config.scrapeIntervalHours || 4;
    const nextScrapeTime = new Date(lastScrapeTime.getTime() + intervalHours * 60 * 60 * 1000);

    const checkAndTrigger = () => {
      const now = new Date();
      if (now >= nextScrapeTime && !autoScrapeTriggeredRef.current && !isScrapingLoading && handleScrapeRef.current) {
        autoScrapeTriggeredRef.current = true;
        handleScrapeRef.current();
      }
    };

    checkAndTrigger();
    const interval = setInterval(checkAndTrigger, 5000);
    return () => clearInterval(interval);
  }, [isScrapingActive, lastScrapeTime, config.scrapeIntervalHours, isScrapingLoading]);

  useEffect(() => {
    if (!isScrapingLoading) {
      autoScrapeTriggeredRef.current = false;
    }
  }, [isScrapingLoading]);

  // Filter logic - simplified presets
  const filteredTweets = tweets
    .filter((t) => {
      switch (activeFilter) {
        case 'review':
          return t.status === 'pending' && t.relevanceScore >= 7;
        case 'pending':
          return t.status === 'pending';
        case 'all':
          return true;
        case 'approved':
          return t.status === 'approved';
        case 'rejected':
          return t.status === 'rejected';
        default:
          return true;
      }
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Counts
  const pendingCount = tweets.filter((t) => t.status === 'pending').length;
  const reviewCount = tweets.filter((t) => t.status === 'pending' && t.relevanceScore >= 7).length;
  const allCount = tweets.length;
  const approvedCount = tweets.filter((t) => t.status === 'approved').length;
  const rejectedCount = tweets.filter((t) => t.status === 'rejected').length;

  const handleScrape = async () => {
    const abortController = new AbortController();
    setScrapeAbortController(abortController);
    setScrapeProgress({ percent: 0, current: 0, total: 0, message: 'Iniciando...' });
    clearScrapeLog();

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: config.tweetsPerScrape || 30 }),
        signal: abortController.signal,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('Error al leer respuesta');

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'status') {
                setScrapeProgress((prev) => prev ? { ...prev, message: data.message } : null);
              } else if (data.type === 'start') {
                setScrapeProgress({
                  percent: 0,
                  current: 0,
                  total: data.total,
                  message: data.message,
                });
              } else if (data.type === 'processing' || data.type === 'progress') {
                setScrapeProgress({
                  percent: data.percent,
                  current: data.current,
                  total: data.total,
                  message: data.message || `Procesando ${data.author}`,
                  author: data.author,
                  status: data.status,
                  results: data.results,
                });
                if (data.type === 'progress' && data.status) {
                  addToScrapeLog({
                    author: data.author,
                    status: data.status,
                    relevance: data.relevance,
                    originalContent: data.originalContent,
                    processedContent: data.processedContent,
                    rejectionReason: data.rejectionReason,
                    errorMessage: data.errorMessage,
                  });
                  // Refresh tweets to show new ones as they arrive
                  if (data.status === 'approved' || data.status === 'auto-queued' || data.status === 'rejected' || data.status === 'breaking-news') {
                    refreshTweets();
                  }
                }
              } else if (data.type === 'complete') {
                await refreshTweets();
                await refreshQueue();
                setLastScrapeTime(new Date());
                const r = data.results;
                const parts = [];
                if (r.approved > 0) parts.push(`${r.approved} aprobados`);
                if (r.rejected > 0) parts.push(`${r.rejected} rechazados`);
                if (r.duplicates > 0) parts.push(`${r.duplicates} duplicados`);
                if (r.similar > 0) parts.push(`${r.similar} similares`);
                if (r.errors > 0) parts.push(`${r.errors} errores`);
                showToast(parts.join(' · ') || 'Sin resultados', r.errors > 0 ? 'error' : 'success');
                addToScrapeLog({
                  author: 'Resumen',
                  status: 'complete',
                  originalContent: `${r.processed} procesados · ${r.approved} aprobados · ${r.rejected} rechazados · ${r.duplicates} duplicados · ${r.errors} errores`,
                });
                if (r.autoQueued > 0) {
                  setCurrentView('queue');
                  showToast(`${r.autoQueued} añadidos a cola`, 'info');
                }
              } else if (data.type === 'error') {
                showToast(`Error: ${data.message}`, 'error');
              }
            } catch (e) {
              console.error('Error parsing SSE:', e);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        await refreshTweets();
        showToast('Scraping cancelado', 'info');
      } else {
        showToast('Error de conexión', 'error');
        console.error('Scrape error:', error);
      }
    } finally {
      setScrapeAbortController(null);
      setScrapeProgress(null);
    }
  };

  handleScrapeRef.current = handleScrape;

  const handleCancelScrape = async () => {
    // Call abort endpoint to stop server-side processing
    try {
      await fetch('/api/scrape/abort', { method: 'POST' });
    } catch (e) {
      console.error('Error calling abort:', e);
    }
    // Also abort client-side fetch
    if (scrapeAbortController) {
      scrapeAbortController.abort();
    }
  };

  const handleApproveAll = async () => {
    const tweetsToApprove = filteredTweets.filter(t => t.status === 'pending');
    if (tweetsToApprove.length === 0) return;

    setIsApprovingAll(true);
    for (const tweet of tweetsToApprove) {
      await approveTweet(tweet.id);
    }
    showToast(`${tweetsToApprove.length} tweets aprobados`, 'success');
    setIsApprovingAll(false);
  };

  const pendingInView = filteredTweets.filter(t => t.status === 'pending').length;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="px-6 py-5 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-medium text-[var(--text-primary)]">Bandeja de entrada</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              {allCount} tweets · {pendingCount} pendientes · {reviewCount} relevantes
              {isScrapingActive && countdown && (
                <span className="ml-2 text-[var(--text-muted)]">· Próximo en {countdown}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pendingInView > 0 && (
              <button
                onClick={handleApproveAll}
                disabled={isApprovingAll || isScrapingLoading}
                className="btn btn-ghost text-[var(--green)]"
              >
                {isApprovingAll ? (
                  <Loader2 className="w-4 h-4 spinner" />
                ) : null}
                Aprobar todos ({pendingInView})
              </button>
            )}
            {isScrapingLoading ? (
              <>
                <button disabled className="btn btn-secondary">
                  <Loader2 className="w-4 h-4 spinner" />
                  Scrapeando...
                </button>
                <button onClick={handleCancelScrape} className="btn btn-ghost">
                  <Square className="w-3 h-3" />
                  Detener
                </button>
              </>
            ) : (
              <button onClick={handleScrape} className="btn btn-primary">
                <RefreshCw className="w-4 h-4" />
                Scrapear
              </button>
            )}
          </div>
        </div>

        {/* Progress */}
        <AnimatePresence>
          {scrapeProgress && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-[var(--text-secondary)]">{scrapeProgress.message}</span>
                <span className="text-[var(--text-muted)] font-mono text-xs">
                  {scrapeProgress.current}/{scrapeProgress.total}
                </span>
              </div>
              <div className="progress-bar">
                <motion.div
                  className="progress-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${scrapeProgress.percent}%` }}
                />
              </div>
              {scrapeProgress.results && (
                <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                  <span className="text-[var(--green)]">{scrapeProgress.results.approved} aprobados</span>
                  <span className="text-[var(--red)]">{scrapeProgress.results.rejected} rechazados</span>
                  <span>{scrapeProgress.results.duplicates} duplicados</span>
                  {scrapeProgress.results.errors > 0 && (
                    <span className="text-[var(--red)]">{scrapeProgress.results.errors} errores</span>
                  )}
                </div>
              )}
              <button
                onClick={() => setShowLog(!showLog)}
                className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] mt-2"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${showLog ? 'rotate-180' : ''}`} />
                {showLog ? 'Ocultar' : 'Mostrar'} log
              </button>
              {showLog && scrapeLog.length > 0 && (
                <div className="mt-2 max-h-64 overflow-y-auto bg-[var(--bg-secondary)] rounded border border-[var(--border)] p-3 font-mono text-xs space-y-2">
                  {scrapeLog.map((entry, idx) => (
                    <div key={idx} className="border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          entry.status === 'approved' || entry.status === 'auto-queued' ? 'bg-[var(--green-dim)] text-[var(--green)]' :
                          entry.status === 'rejected' ? 'bg-[var(--red-dim)] text-[var(--red)]' :
                          entry.status === 'error' ? 'bg-[var(--red-dim)] text-[var(--red)]' :
                          entry.status === 'breaking-news' ? 'bg-[var(--yellow-dim)] text-[var(--yellow)]' :
                          entry.status === 'complete' ? 'bg-[var(--accent-dim)] text-[var(--accent)]' :
                          entry.status === 'duplicate' ? 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]' :
                          entry.status === 'similar' ? 'bg-[var(--yellow-dim)] text-[var(--yellow)]' :
                          'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                        }`}>
                          {entry.status}
                        </span>
                        <span className="text-[var(--text-primary)] font-medium">{entry.author}</span>
                        {entry.relevance !== undefined && (
                          <span className={`text-[10px] ${
                            entry.relevance >= 8 ? 'text-[var(--green)]' :
                            entry.relevance >= 5 ? 'text-[var(--yellow)]' :
                            'text-[var(--text-muted)]'
                          }`}>
                            Score: {entry.relevance}
                          </span>
                        )}
                      </div>
                      {/* Error message */}
                      {entry.errorMessage && (
                        <div className="mt-1 text-[var(--red)] text-[11px]">
                          ❌ Error: {entry.errorMessage}
                        </div>
                      )}
                      {/* Rejection reason */}
                      {entry.rejectionReason && (
                        <div className="mt-1 text-[var(--text-muted)] text-[11px]">
                          Razón: {entry.rejectionReason}
                        </div>
                      )}
                      {/* Original content preview */}
                      {entry.originalContent && (
                        <div className="mt-1 text-[var(--text-secondary)] text-[11px] line-clamp-2">
                          {entry.originalContent}
                        </div>
                      )}
                      {/* Processed content for approved */}
                      {entry.processedContent && (entry.status === 'approved' || entry.status === 'auto-queued') && (
                        <div className="mt-1 text-[var(--green)] text-[11px] opacity-80 line-clamp-2">
                          → {entry.processedContent}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Show log from last scrape if available */}
        {!scrapeProgress && scrapeLog.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowLog(!showLog)}
              className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${showLog ? 'rotate-180' : ''}`} />
              {showLog ? 'Ocultar' : 'Ver'} log del último scrape ({scrapeLog.length} entradas)
            </button>
            {showLog && (
              <div className="mt-2 max-h-64 overflow-y-auto bg-[var(--bg-secondary)] rounded border border-[var(--border)] p-3 font-mono text-xs space-y-2">
                {scrapeLog.map((entry, idx) => (
                  <div key={idx} className="border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        entry.status === 'approved' || entry.status === 'auto-queued' ? 'bg-[var(--green-dim)] text-[var(--green)]' :
                        entry.status === 'rejected' ? 'bg-[var(--red-dim)] text-[var(--red)]' :
                        entry.status === 'error' ? 'bg-[var(--red-dim)] text-[var(--red)]' :
                        entry.status === 'breaking-news' ? 'bg-[var(--yellow-dim)] text-[var(--yellow)]' :
                        entry.status === 'complete' ? 'bg-[var(--accent-dim)] text-[var(--accent)]' :
                        entry.status === 'duplicate' ? 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]' :
                        entry.status === 'similar' ? 'bg-[var(--yellow-dim)] text-[var(--yellow)]' :
                        'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
                      }`}>
                        {entry.status}
                      </span>
                      <span className="text-[var(--text-primary)] font-medium">{entry.author}</span>
                      {entry.relevance !== undefined && (
                        <span className={`text-[10px] ${
                          entry.relevance >= 8 ? 'text-[var(--green)]' :
                          entry.relevance >= 5 ? 'text-[var(--yellow)]' :
                          'text-[var(--text-muted)]'
                        }`}>
                          Score: {entry.relevance}
                        </span>
                      )}
                    </div>
                    {entry.errorMessage && (
                      <div className="mt-1 text-[var(--red)] text-[11px]">
                        ❌ Error: {entry.errorMessage}
                      </div>
                    )}
                    {entry.rejectionReason && (
                      <div className="mt-1 text-[var(--text-muted)] text-[11px]">
                        Razón: {entry.rejectionReason}
                      </div>
                    )}
                    {entry.originalContent && (
                      <div className="mt-1 text-[var(--text-secondary)] text-[11px] line-clamp-2">
                        {entry.originalContent}
                      </div>
                    )}
                    {entry.processedContent && (entry.status === 'approved' || entry.status === 'auto-queued') && (
                      <div className="mt-1 text-[var(--green)] text-[11px] opacity-80 line-clamp-2">
                        → {entry.processedContent}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filter - Tabs */}
        {!scrapeProgress && (
          <div className="tabs">
            <button
              onClick={() => setActiveFilter('review')}
              className={`tab ${activeFilter === 'review' ? 'active' : ''}`}
              title="Tweets pendientes con score 7 o más"
            >
              Relevantes ({reviewCount})
            </button>
            <button
              onClick={() => setActiveFilter('pending')}
              className={`tab ${activeFilter === 'pending' ? 'active' : ''}`}
              title="Todos los tweets pendientes"
            >
              Pendientes ({pendingCount})
            </button>
            <button
              onClick={() => setActiveFilter('approved')}
              className={`tab ${activeFilter === 'approved' ? 'active' : ''}`}
            >
              Aprobados ({approvedCount})
            </button>
            <button
              onClick={() => setActiveFilter('rejected')}
              className={`tab ${activeFilter === 'rejected' ? 'active' : ''}`}
            >
              Rechazados ({rejectedCount})
            </button>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="popLayout">
          {filteredTweets.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="empty-state"
            >
              <p className="text-[var(--text-muted)] mb-4">No hay tweets que coincidan con este filtro</p>
              <button onClick={handleScrape} disabled={isScrapingLoading} className="btn btn-secondary">
                {isScrapingLoading ? <Loader2 className="w-4 h-4 spinner" /> : <RefreshCw className="w-4 h-4" />}
                Scrapear ahora
              </button>
            </motion.div>
          ) : (
            <div className="space-y-3 max-w-3xl mx-auto">
              {filteredTweets.map((tweet, index) => (
                <TweetCard key={tweet.id} tweet={tweet} index={index} />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
