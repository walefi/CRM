'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search,
  ArrowRight,
  Star,
  X,
  User,
  Building2,
  Target,
  Phone,
  FileText,
  Package,
  Workflow,
  Zap,
  Clock,
  History,
  SlidersHorizontal,
  Bookmark,
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/stores/auth.store';

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
  notification: BellIcon,
  document: FileText,
  comment: FileText,
  tag: FileText,
};

import { BellIcon } from 'lucide-react';

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
};

const entityTypes = [
  { value: 'lead', label: 'Leads' },
  { value: 'contact', label: 'Contatos' },
  { value: 'company', label: 'Empresas' },
  { value: 'deal', label: 'Negócios' },
  { value: 'product', label: 'Produtos' },
  { value: 'quote', label: 'Propostas' },
  { value: 'contract', label: 'Contratos' },
  { value: 'workflow', label: 'Workflows' },
  { value: 'automation', label: 'Automações' },
  { value: 'user', label: 'Usuários' },
];

function SearchContent() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [filters, setFilters] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const param = searchParams.get('q');
    if (param) setQ(param);
  }, [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ['search', q, filters, page],
    queryFn: () =>
      api
        .get('/search', {
          params: {
            q: q || undefined,
            entityTypes: filters.length > 0 ? filters : undefined,
            page,
            limit: 20,
          },
        })
        .then((r) => r.data),
    enabled: q.length >= 2,
  });

  const { data: statsData } = useQuery({
    queryKey: ['search', 'stats'],
    queryFn: () => api.get('/search/stats').then((r) => r.data),
  });

  const results = data?.data || [];
  const meta = data?.meta;
  const stats = statsData || {};

  const toggleFilter = (f: string) => {
    setFilters((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
    setPage(1);
  };

  const { data: historyData } = useQuery({
    queryKey: ['search', 'history'],
    queryFn: () => api.get('/search/history', { params: { limit: 10 } }).then((r) => r.data),
  });

  const { data: favoritesData } = useQuery({
    queryKey: ['search', 'favorites'],
    queryFn: () => api.get('/search/favorites', { params: { limit: 10 } }).then((r) => r.data),
  });

  const history = historyData?.data || [];
  const favorites = favoritesData?.data || [];

  if (!user) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pesquisa Global</h1>
          <p className="text-muted-foreground mt-1">
            Busque em todos os módulos do CRM instantaneamente.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Search className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.searchesToday || 0}</p>
                <p className="text-xs text-muted-foreground">Pesquisas Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <FileText className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalIndexed || 0}</p>
                <p className="text-xs text-muted-foreground">Documentos Indexados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Clock className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.avgDurationMs ? `${stats.avgDurationMs}ms` : '0ms'}
                </p>
                <p className="text-xs text-muted-foreground">Tempo Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar leads, contatos, negócios, produtos..."
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="pl-10 text-lg h-12"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(showFilters && 'border-primary text-primary')}
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filtros
          {filters.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {filters.length}
            </Badge>
          )}
        </Button>
      </div>

      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3"
        >
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-3">Filtrar por Módulo</p>
              <div className="flex flex-wrap gap-2">
                {entityTypes.map((et) => (
                  <Badge
                    key={et.value}
                    variant={filters.includes(et.value) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleFilter(et.value)}
                  >
                    {et.label}
                  </Badge>
                ))}
              </div>
              {filters.length > 0 && (
                <Button variant="ghost" size="sm" className="mt-3" onClick={() => setFilters([])}>
                  Limpar Filtros
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))
          ) : q.length < 2 ? (
            <div className="text-center py-16">
              <Search className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h2 className="text-lg font-semibold mb-2">Digite para buscar</h2>
              <p className="text-muted-foreground text-sm">
                Pressione Ctrl+K para abrir a busca rápida em qualquer lugar.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16">
              <Search className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h2 className="text-lg font-semibold mb-2">Nenhum resultado</h2>
              <p className="text-muted-foreground text-sm">
                Tente buscar por outro termo ou ajustar os filtros.
              </p>
            </div>
          ) : (
            <>
              {meta && (
                <p className="text-sm text-muted-foreground">
                  {meta.total} resultado(s) em {meta.durationMs}ms
                </p>
              )}
              {results.map((item: any, i: number) => {
                const Icon = entityIcons[item.entityType] || FileText;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Link href={item.url || `/${item.entityType}s`}>
                      <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-muted shrink-0">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium truncate">{item.title}</h3>
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {entityLabels[item.entityType] || item.entityType}
                                </Badge>
                              </div>
                              {item.subtitle && (
                                <p className="text-sm text-muted-foreground truncate">
                                  {item.subtitle}
                                </p>
                              )}
                              {item.contentPreview && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {item.contentPreview}
                                </p>
                              )}
                              {item.tags?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {item.tags.map((tag: string) => (
                                    <Badge key={tag} variant="secondary" className="text-[10px]">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}

              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!meta.hasPreviousPage}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground px-3">
                    Página {meta.page} de {meta.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!meta.hasNextPage}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próximo
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-4">
          {history.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Recentes</h3>
                </div>
                <div className="space-y-1">
                  {history.slice(0, 8).map((h: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => setQ(h.query)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-accent text-left"
                    >
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{h.query}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {favorites.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Favoritos</h3>
                </div>
                <div className="space-y-1">
                  {favorites.map((f: any, i: number) => (
                    <Link
                      key={i}
                      href={f.url || `/${f.entityType}s`}
                      className="flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent"
                    >
                      <Bookmark className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate">{f.title}</span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {stats.mostFrequentQueries?.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Mais Buscados</h3>
                </div>
                <div className="space-y-1">
                  {stats.mostFrequentQueries.map((q: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => setQ(q.query)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-accent text-left"
                    >
                      <span className="text-xs text-muted-foreground w-5">{q.count}</span>
                      <span className="truncate">{q.query}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {stats.entityDistribution?.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3">Distribuição</h3>
                <div className="space-y-2">
                  {stats.entityDistribution.map((e: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-xs">
                        {entityLabels[e.entityType] || e.entityType}
                      </Badge>
                      <span className="text-muted-foreground">{e.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando...</div>}>
      <SearchContent />
    </Suspense>
  );
}
