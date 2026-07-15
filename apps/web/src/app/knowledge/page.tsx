'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth.store';

export default function KnowledgePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('faq');

  const { data, isLoading } = useQuery({
    queryKey: ['knowledge', search],
    queryFn: () =>
      api
        .get('/knowledge', { params: { search: search || undefined, limit: 50 } })
        .then((r) => r.data),
  });
  const { data: article } = useQuery({
    queryKey: ['knowledge', selectedId],
    queryFn: () => api.get(`/knowledge/${selectedId}`).then((r) => r.data),
    enabled: !!selectedId,
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => api.post('/knowledge', d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
      setShowCreate(false);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/knowledge/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
      setSelectedId(null);
    },
  });

  const articles = data?.data || [];

  if (!user) return null;

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      <div className="w-80 lg:w-96 border-r flex flex-col shrink-0 bg-card/50">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">Base de Conhecimento</h1>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" /> Novo
            </Button>
          </div>
          <Input
            placeholder="Buscar artigos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 border-b">
                <Skeleton className="h-12" />
              </div>
            ))
          ) : articles.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Nenhum artigo</div>
          ) : (
            articles.map((a: any) => (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className={cn(
                  'w-full p-4 border-b text-left hover:bg-accent/50',
                  selectedId === a.id && 'bg-accent',
                )}
              >
                <p className="font-medium text-sm truncate">{a.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  {a.category && (
                    <Badge variant="secondary" className="text-[10px]">
                      {a.category}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{a.viewCount} views</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Selecione um artigo</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-semibold text-lg">{article?.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {article?.category && <Badge variant="secondary">{article.category}</Badge>}
                  <span className="text-xs text-muted-foreground">
                    {article?.viewCount || 0} visualizações
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {article?.helpfulCount || 0} úteis
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => selectedId && deleteMutation.mutate(selectedId)}
              >
                <Trash2 className="h-4 w-4 text-red-400" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {article?.content || 'Sem conteúdo'}
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Artigo</DialogTitle>
            <DialogDescription>Crie um artigo para a base de conhecimento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1">
              <Label>Título</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Título do artigo"
              />
            </div>
            <div className="space-y-1">
              <Label>Conteúdo</Label>
              <textarea
                className="w-full min-h-[200px] p-3 rounded-lg border bg-background text-sm"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Conteúdo do artigo..."
              />
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!editTitle.trim()}
              onClick={() =>
                createMutation.mutate({
                  title: editTitle,
                  content: editContent,
                  category: editCategory,
                })
              }
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
