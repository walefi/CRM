'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Search, FolderPlus, Star,
  Share2, History, Trash2, MoreHorizontal, Upload,
  FileSpreadsheet, FileImage, File,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth.store';

const mimeIcons: Record<string, any> = {
  'image/': FileImage, 'application/pdf': FileText, 'application/vnd': FileSpreadsheet,
  'text/': FileText, 'application/json': File,
};
const getIcon = (mime: string) => Object.entries(mimeIcons).find(([k]) => mime.startsWith(k.replace('/', ''))) ? Object.entries(mimeIcons).find(([k]) => mime.startsWith(k.replace('/', '')))?.[1] as any || File : FileText;

export default function DocumentsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['documents', search],
    queryFn: () => api.get('/documents', { params: { search: search || undefined, limit: 30 } }).then(r => r.data),
  });
  const { data: stats } = useQuery({ queryKey: ['documents', 'stats'], queryFn: () => api.get('/documents/stats').then(r => r.data) });
  const { data: folders } = useQuery({ queryKey: ['documents', 'folders'], queryFn: () => api.get('/documents/folders').then(r => r.data) });

  const uploadMutation = useMutation({
    mutationFn: (d: any) => api.post('/documents/upload', d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['documents'] }); setShowUpload(false); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });
  const favMutation = useMutation({
    mutationFn: (id: string) => api.post('/documents/favorite', { documentId: id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  const docs = data?.data || [];

  if (!user) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documentos</h1>
          <p className="text-muted-foreground">Enterprise Document Management System</p>
        </div>
        <Button onClick={() => setShowUpload(true)}><Upload className="h-4 w-4 mr-2" /> Upload</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats?.total || 0}</p><p className="text-xs text-muted-foreground">Documentos</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{Math.round((stats?.totalSize || 0) / 1024 / 1024)}MB</p><p className="text-xs text-muted-foreground">Armazenado</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats?.folders || 0}</p><p className="text-xs text-muted-foreground">Pastas</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats?.versions || 0}</p><p className="text-xs text-muted-foreground">Versões</p></CardContent></Card>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar documentos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {folders?.map((f: any) => (
          <Card key={f.id} className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-yellow-400" />
              <div className="min-w-0"><p className="text-sm font-medium truncate">{f.name}</p><p className="text-xs text-muted-foreground">{f.files?.length || 0} arquivos</p></div>
            </CardContent>
          </Card>
        ))}
        {isLoading ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) :
          docs.map((d: any) => {
            const Icon = getIcon(d.mimeType);
            return (
              <Card key={d.id} className="group hover:border-primary/50 transition-colors relative">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className="h-8 w-8 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.mimeType} • {(d.size / 1024).toFixed(0)}KB</p>
                      <p className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {d.tags?.slice(0, 3).map((t: string) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => favMutation.mutate(d.id)}><Star className="h-3.5 w-3.5 mr-1" /> Favoritar</DropdownMenuItem>
                        <DropdownMenuItem><History className="h-3.5 w-3.5 mr-1" /> Versões</DropdownMenuItem>
                        <DropdownMenuItem><Share2 className="h-3.5 w-3.5 mr-1" /> Compartilhar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-400" onClick={() => deleteMutation.mutate(d.id)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload de Documento</DialogTitle><DialogDescription>Adicione um novo documento ao sistema.</DialogDescription></DialogHeader>
          <div className="space-y-3 py-4">
            <div className="space-y-1"><Label>Nome</Label><Input value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder="Nome do arquivo" /></div>
            <div className="space-y-1"><Label>URL</Label><Input value={uploadUrl} onChange={e => setUploadUrl(e.target.value)} placeholder="https://..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancelar</Button>
            <Button disabled={!uploadName.trim()} onClick={() => uploadMutation.mutate({ name: uploadName, originalName: uploadName, url: uploadUrl, mimeType: 'application/octet-stream', size: 0 })}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
