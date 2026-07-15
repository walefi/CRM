'use client';

import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalLayout } from '../portal-layout';
import { useAuthStore } from '@/stores/auth.store';

export default function PortalKnowledgePage() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['portal', 'knowledge'],
    queryFn: () => api.get('/knowledge').then((r) => r.data),
  });

  if (!user) return null;

  return (
    <PortalLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Base de Conhecimento</h1>
          <p className="text-muted-foreground">Artigos e documentação</p>
        </div>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : data?.data?.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">Nenhum artigo</p>
        ) : (
          data?.data?.map((a: any) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <BookOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">{a.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {a.content?.substring(0, 200)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {a.category && (
                        <Badge variant="secondary" className="text-xs">
                          {a.category}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{a.viewCount} views</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PortalLayout>
  );
}
