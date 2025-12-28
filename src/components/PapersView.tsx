'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@/store';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Newspaper,
  Sun,
  Moon,
  Calendar,
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
                className="paper-hero-card p-0 overflow-hidden cursor-pointer group border-none md:border md:border-[var(--border)] bg-transparent md:bg-[var(--bg-primary)]"
                onClick={() => setSelectedPaper(heroPaper)}
              >
                <div className="grid md:grid-cols-2 gap-0">
                  <div className="relative aspect-video md:aspect-auto overflow-hidden bg-[var(--bg-tertiary)] md:rounded-l-lg">
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
                    <div className="absolute top-3 left-3 md:top-4 md:left-4">
                      <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full bg-[var(--accent)] text-[var(--bg-root)] font-bold font-sans text-base md:text-lg shadow-lg">
                        1
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 md:p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3 paper-meta">
                      <span className="uppercase tracking-widest text-[var(--accent)] font-bold text-xs md:text-sm">
                        {heroPaper.authors[0]?.split(',')[0]}
                      </span>
                      <span className="text-[var(--border)]">•</span>
                      <span className="font-sans font-medium text-[var(--text-muted)]">
                        {format(new Date(heroPaper.publishedAt), "MMMM d", { locale: es })}
                      </span>
                    </div>
                    
                    <h2 className="font-sans font-extrabold text-2xl md:text-4xl leading-[1.1] mb-4 text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      {heroPaper.hook || heroPaper.titleEs || heroPaper.title}
                    </h2>
                    
                    <p className="text-[var(--text-secondary)] leading-relaxed mb-6 line-clamp-3 font-sans text-sm md:text-base opacity-90">
                      {heroPaper.abstractEs || heroPaper.abstract}
                    </p>
                    
                    <div className="mt-auto flex items-center justify-between">
                      {heroPaper.institution && (
                         <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            <Building2 size={12} />
                            <span className="truncate max-w-[200px]">{heroPaper.institution}</span>
                         </div>
                      )}
                      <div className="flex items-center gap-1.5 text-[var(--text-primary)] bg-[var(--bg-tertiary)] px-3 py-1.5 rounded-full text-xs font-bold ml-auto">
                        <ThumbsUp size={14} className="text-[var(--accent)]" />
                        {heroPaper.upvotes}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* List Section */}
            {listPapers.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-1 bg-[var(--accent)] rounded-full"></div>
                  <h3 className="font-sans font-bold text-xl md:text-2xl tracking-tight uppercase text-[var(--text-primary)]">
                    Top Stories
                  </h3>
                  <div className="h-px bg-[var(--border)] flex-1 ml-4 opacity-50"></div>
                </div>
                
                <div className="flex flex-col gap-0">
                  {listPapers.map((paper, index) => (
                    <motion.div
                      key={paper.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="flex gap-4 md:gap-6 py-6 border-b border-[var(--border)] last:border-0 cursor-pointer group"
                      onClick={() => setSelectedPaper(paper)}
                    >
                      {/* Number Indicator */}
                      <div className="flex-shrink-0 pt-1">
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-[var(--accent)] text-[var(--bg-root)] flex items-center justify-center font-sans font-bold text-xs md:text-sm shadow-sm transform group-hover:scale-110 transition-transform duration-200">
                          {index + 2}
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--accent)] font-bold uppercase text-[10px] md:text-xs tracking-widest leading-none">
                            {paper.authors[0]?.split(',')[0] || 'Unknown Author'}
                          </span>
                        </div>

                        <h3 className="font-sans font-bold text-base md:text-xl leading-tight text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-3">
                          {paper.hook || paper.titleEs || paper.title}
                        </h3>
                        
                        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] font-sans mt-0.5">
                          <span>{format(new Date(paper.publishedAt), "MMM d", { locale: es })}</span>
                          <span className="text-[var(--border)]">•</span>
                          <div className="flex items-center gap-1">
                            <ThumbsUp size={12} className={paper.upvotes > 10 ? "text-[var(--accent)]" : ""} />
                            <span>{paper.upvotes}</span>
                          </div>
                          {paper.arxivId && (
                            <>
                              <span className="text-[var(--border)] hidden sm:inline">•</span>
                              <span className="hidden sm:inline font-mono opacity-70">arXiv:{paper.arxivId}</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Thumbnail (Right Side) */}
                      <div className="flex-shrink-0 w-20 h-20 md:w-24 md:h-24 bg-[var(--bg-tertiary)] rounded-lg overflow-hidden border border-[var(--border)] group-hover:border-[var(--accent-dim)] transition-colors relative">
                        {paper.thumbnail ? (
                          <img 
                            src={paper.thumbnail} 
                            alt="" 
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] opacity-20 bg-[var(--bg-secondary)]">
                            <Newspaper size={24} />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
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
