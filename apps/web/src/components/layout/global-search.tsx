'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Clock,
  ArrowRight,
  User,
  Building2,
  Target,
  Phone,
  FileText,
  Package,
  Workflow,
  Zap,
  Loader2,
  History,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const entityIcons: Record<string, any> = {
  lead: User,
  contact: Phone,
  company: Building2,
  deal: Target,
  product: Package,
  quote: FileText,
  contract: FileText,
  activity: Clock,
  task: Clock,
  workflow: Workflow,
  automation: Zap,
  user: User,
};

const entityLabels: Record<string, string> = {
  lead: 'Lead',
  contact: 'Contato',
  company: 'Empresa',
  deal: 'Negócio',
  product: 'Produto',
  quote: 'Proposta',
  contract: 'Contrato',
  activity: 'Atividade',
  task: 'Tarefa',
  workflow: 'Workflow',
  automation: 'Automação',
  user: 'Usuário',
  notification: 'Notificação',
  document: 'Documento',
  comment: 'Comentário',
  tag: 'Tag',
};

interface SearchResult {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  subtitle?: string;
  contentPreview?: string;
  tags: string[];
  url?: string;
  score: number;
}

export function GlobalSearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) setQuery('');
    setResults([]);
    setSuggestions([]);
    setSelectedIndex(0);
  }, [open]);

  useEffect(() => {
    if (history.length === 0) {
      api
        .get('/search/history', { params: { limit: 5 } })
        .then((r) => {
          const queries: string[] = (r.data?.data || []).map((h: any) => h.query).filter(Boolean);
          setHistory([...new Set(queries)].slice(0, 5));
        })
        .catch(() => {});
    }
  }, [open, history.length]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [searchRes, suggestRes] = await Promise.all([
          api.get('/search', { params: { q: query, limit: 8 } }),
          api.get('/search/suggestions', { params: { q: query, limit: 5 } }),
        ]);
        setResults(searchRes.data?.data || []);
        setSuggestions(suggestRes.data || []);
      } catch {
        setResults([]);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback(
    (item: SearchResult) => {
      setOpen(false);
      router.push(item.url || `/${item.entityType}s`);
    },
    [router],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const totalItems = results.length + suggestions.length + (query ? 1 : 0);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, totalItems - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (query && results.length > 0) {
          handleSelect(results[Math.min(selectedIndex, results.length - 1)]);
        } else if (query) {
          setOpen(false);
          router.push(`/search?q=${encodeURIComponent(query)}`);
        }
      }
    },
    [results, suggestions, query, selectedIndex, handleSelect, router],
  );

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-xl max-h-[70vh] overflow-hidden rounded-xl border bg-card shadow-2xl"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Buscar leads, contatos, negócios, produtos..."
                className="border-0 p-0 h-auto text-lg focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                autoFocus
              />
              {loading && (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" />
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md hover:bg-accent shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[55vh]">
              {!query && history.length > 0 && (
                <div className="p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase px-2 mb-2">
                    Pesquisas Recentes
                  </p>
                  {history.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(h)}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-accent text-sm"
                    >
                      <History className="h-4 w-4 text-muted-foreground" />
                      <span>{h}</span>
                    </button>
                  ))}
                </div>
              )}

              {query && suggestions.length > 0 && (
                <div className="p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase px-2 mb-2">
                    Sugestões
                  </p>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(s)}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-accent text-sm"
                    >
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <span>{s}</span>
                    </button>
                  ))}
                </div>
              )}

              {query && results.length > 0 && (
                <div className="p-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase px-2 mb-2">
                    Resultados ({results.length})
                  </p>
                  {results.map((item, i) => {
                    const Icon = entityIcons[item.entityType] || FileText;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className={cn(
                          'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left text-sm transition-colors',
                          selectedIndex === i ? 'bg-accent' : 'hover:bg-accent',
                        )}
                      >
                        <div
                          className={cn(
                            'p-1.5 rounded-lg shrink-0',
                            selectedIndex === i ? 'bg-primary/10' : 'bg-muted',
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          {item.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {entityLabels[item.entityType] || item.entityType}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })}
                  <button
                    onClick={() => {
                      setOpen(false);
                      router.push(`/search?q=${encodeURIComponent(query)}`);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 mt-1 rounded-lg hover:bg-accent text-sm text-primary"
                  >
                    <Search className="h-4 w-4" />
                    <span>Ver todos os resultados para &quot;{query}&quot;</span>
                  </button>
                </div>
              )}

              {query && !loading && results.length === 0 && suggestions.length === 0 && (
                <div className="p-8 text-center">
                  <Search className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium mb-1">Nenhum resultado encontrado</p>
                  <p className="text-xs text-muted-foreground">
                    Tente buscar por outro termo ou verifique a ortografia.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 px-4 py-2 border-t text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">ESC</kbd>
              <span>Fechar</span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">↑↓</kbd>
              <span>Navegar</span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">↵</kbd>
              <span>Selecionar</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function OpenSearchButton() {
  return (
    <button
      onClick={() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { metaKey: true, key: 'k' }));
      }}
      className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors"
    >
      <Search className="h-4 w-4" />
      <span>Buscar...</span>
      <kbd className="ml-8 px-1.5 py-0.5 text-xs rounded bg-muted">Ctrl+K</kbd>
    </button>
  );
}
