'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@/store';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Newspaper,
  Sun,
  Moon,
  Calendar,
  ChevronRight,
  ExternalLink,
  ThumbsUp,
  X,
  RefreshCw,
  Building2,
  Sparkles,
  Loader2
} from 'lucide-react';

export function PapersView() {
  const {
    papers,
    selectedPaper,
    papersLoading,
    papersDate,
    fetchPapers,
    setSelectedPaper,
    setPapersDate,
    theme,
    toggleTheme,
    generateArticle
  } = useAppStore();

  // Load papers on mount or date change
  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setPapersDate(newDate);
    fetchPapers(newDate);
  };

  // Split papers into hero and list
  const heroPaper = papers.length > 0 ? papers[0] : null;
  const listPapers = papers.length > 1 ? papers.slice(1) : [];

  return (
    <div className="flex flex-col h-full bg-[var(--bg-root)] text-[var(--text-primary)] overflow-hidden">
      {/* Header - hidden on mobile since MobileHeader exists */}
      <header className="hidden md:flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-primary)] z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <Newspaper size={20} />
            <h1 className="font-serif font-bold text-xl tracking-tight">Papers</h1>
          </div>

          <div className="flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-full border border-[var(--border)]">
            <Calendar size={14} className="text-[var(--text-muted)]" />
            <input
              type="date"
              value={papersDate}
              onChange={handleDateChange}
              className="bg-transparent border-none text-xs font-medium focus:outline-none w-[110px] text-[var(--text-primary)]"
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => fetchPapers(papersDate)}
            disabled={papersLoading}
            className="p-2 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
            aria-label="Actualizar papers"
          >
            <RefreshCw size={18} className={papersLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile Controls Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-primary)]">
        <div className="flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-full border border-[var(--border)]">
          <Calendar size={14} className="text-[var(--text-muted)]" />
          <input
            type="date"
            value={papersDate}
            onChange={handleDateChange}
            className="bg-transparent border-none text-xs font-medium focus:outline-none w-[110px] text-[var(--text-primary)]"
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => fetchPapers(papersDate)}
            disabled={papersLoading}
            className="p-2 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
            aria-label="Actualizar papers"
          >
            <RefreshCw size={18} className={papersLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-6 lg:p-8 max-w-5xl mx-auto w-full">
        {papersLoading ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[var(--text-muted)] text-sm animate-pulse">Buscando papers...</p>
          </div>
        ) : papers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
            <div className="w-16 h-16 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center text-[var(--text-muted)]">
              <Newspaper size={32} />
            </div>
            <div className="max-w-xs">
              <h3 className="font-medium text-lg mb-1">Sin papers para esta fecha</h3>
              <p className="text-[var(--text-muted)] text-sm">Intenta seleccionar otro día o vuelve más tarde.</p>
            </div>
            <button
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setPapersDate(today);
                fetchPapers(); // No date param = fetch featured papers
              }}
              className="btn btn-secondary mt-2"
            >
              Ir a hoy
            </button>
          </div>
        ) : (
          <div className="space-y-8 pb-20">
            {/* Hero Section */}
            {heroPaper && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="paper-hero-card p-0 overflow-hidden cursor-pointer group"
                onClick={() => setSelectedPaper(heroPaper)}
              >
                <div className="grid md:grid-cols-2 gap-0">
                  <div className="relative aspect-video md:aspect-auto overflow-hidden bg-[var(--bg-tertiary)]">
                    {heroPaper.thumbnail ? (
                      <img 
                        src={heroPaper.thumbnail} 
                        alt={heroPaper.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-tertiary)] flex items-center justify-center">
                        <Newspaper size={48} className="text-[var(--text-muted)] opacity-20" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="badge bg-[var(--accent)] text-[var(--bg-root)] font-bold shadow-lg">#1 Trending</span>
                    </div>
                  </div>
                  <div className="p-6 md:p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3 paper-meta">
                      <span className="uppercase tracking-wider text-[var(--accent)] font-bold text-xs">AI Research</span>
                      <span>•</span>
                      <span>{format(new Date(heroPaper.publishedAt), "d 'de' MMMM", { locale: es })}</span>
                    </div>
                    
                    <h2 className="paper-title paper-title-hero mb-4 group-hover:text-[var(--accent)] transition-colors">
                      {heroPaper.titleEs || heroPaper.title}
                    </h2>
                    
                    <p className="text-[var(--text-secondary)] leading-relaxed mb-6 line-clamp-3 md:line-clamp-4 text-sm md:text-base">
                      {heroPaper.abstractEs || heroPaper.abstract}
                    </p>
                    
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="paper-author text-sm">{heroPaper.authors[0]}</span>
                        {heroPaper.institution && (
                          <span className="text-xs text-[var(--text-muted)]">{heroPaper.institution}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-1 rounded-md text-xs font-medium">
                        <ThumbsUp size={12} />
                        {heroPaper.upvotes}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* List Section */}
            {listPapers.length > 0 && (
              <div className="grid gap-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px bg-[var(--border)] flex-1"></div>
                  <span className="font-serif italic text-[var(--text-muted)] text-sm px-2">Más destacados</span>
                  <div className="h-px bg-[var(--border)] flex-1"></div>
                </div>
                
                {listPapers.map((paper, index) => (
                  <motion.div
                    key={paper.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="paper-card p-4 flex gap-4 cursor-pointer group"
                    onClick={() => setSelectedPaper(paper)}
                  >
                    <div className="flex-shrink-0 flex items-center justify-center w-8 text-center">
                      <span className="paper-rank">#{index + 2}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="paper-title paper-title-list mb-2 group-hover:text-[var(--accent)] transition-colors truncate">
                        {paper.titleEs || paper.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                        <span className="paper-author">{paper.authors[0]}{paper.authors.length > 1 ? ' et al.' : ''}</span>
                        <span>•</span>
                        <span>{format(new Date(paper.publishedAt), "d MMM", { locale: es })}</span>
                        {paper.arxivId && (
                          <>
                            <span>•</span>
                            <span className="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-[10px]">arXiv:{paper.arxivId}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end justify-between gap-2">
                      <div className="flex items-center gap-1 text-[var(--text-muted)] text-xs">
                        <ThumbsUp size={12} />
                        {paper.upvotes}
                      </div>
                      <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedPaper && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedPaper(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[var(--bg-primary)] w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden flex flex-col border border-[var(--border)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--bg-secondary)] sticky top-0">
                <div className="flex items-center gap-2">
                  <span className="badge badge-accent">Paper</span>
                  {selectedPaper.arxivId && (
                    <span className="text-xs text-[var(--text-muted)] font-mono">arXiv:{selectedPaper.arxivId}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href={selectedPaper.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    title="Ver original"
                  >
                    <ExternalLink size={18} />
                  </a>
                  <button 
                    onClick={() => setSelectedPaper(null)}
                    className="p-2 hover:bg-[var(--bg-tertiary)] rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto p-6 md:p-8">
                <h2 className="font-serif text-2xl md:text-3xl font-bold leading-tight mb-4 text-[var(--text-primary)]">
                  {selectedPaper.titleEs || selectedPaper.title}
                </h2>
                
                {selectedPaper.titleEs && selectedPaper.title !== selectedPaper.titleEs && (
                  <h3 className="text-[var(--text-muted)] text-sm mb-6 italic font-serif">
                    Original: {selectedPaper.title}
                  </h3>
                )}

                <div className="flex flex-wrap items-center gap-4 mb-8 text-sm border-y border-[var(--border)] py-4">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Calendar size={14} />
                    <span>{format(new Date(selectedPaper.publishedAt), "d 'de' MMMM, yyyy", { locale: es })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <ThumbsUp size={14} />
                    <span>{selectedPaper.upvotes} upvotes</span>
                  </div>
                  {selectedPaper.institution && (
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Building2 size={14} />
                      <span>{selectedPaper.institution}</span>
                    </div>
                  )}
                </div>

                {/* Article Section - Show generated article or abstract */}
                {selectedPaper.article ? (
                  <div className="prose prose-invert max-w-none">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={14} className="text-[var(--accent)]" />
                      <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--accent)]">Artículo de Divulgación</h4>
                    </div>
                    <div className="text-[var(--text-secondary)] leading-7 text-base md:text-lg space-y-4">
                      {selectedPaper.article.split('\n\n').map((paragraph, i) => (
                        <p key={i}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                ) : selectedPaper.articleLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 size={32} className="text-[var(--accent)] animate-spin" />
                    <p className="text-[var(--text-muted)] text-sm">Generando artículo de divulgación...</p>
                  </div>
                ) : (
                  <div className="prose prose-invert max-w-none">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Abstract</h4>
                    <p className="text-[var(--text-secondary)] leading-7 text-base md:text-lg">
                      {selectedPaper.abstractEs || selectedPaper.abstract}
                    </p>
                    <button
                      onClick={() => generateArticle(selectedPaper.id)}
                      className="mt-4 btn bg-[var(--accent-dim)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg-root)] transition-colors"
                    >
                      <Sparkles size={14} />
                      Generar artículo fácil de entender
                    </button>
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-[var(--border)]">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">Autores</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPaper.authors.map((author, i) => (
                      <span key={i} className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)] px-3 py-1 rounded-full text-sm">
                        {author}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-secondary)] flex justify-end gap-3">
                <button
                  className="btn btn-ghost"
                  onClick={() => setSelectedPaper(null)}
                >
                  Cerrar
                </button>
                <a
                  href={selectedPaper.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  Ver paper original
                  <ExternalLink size={14} />
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
