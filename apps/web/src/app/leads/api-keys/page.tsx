'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Key, Plus, Trash2, Copy, CheckCircle, AlertTriangle, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface ApiKeyRecord {
  id: string;
  name: string;
  key: string;
  scopes: string[];
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

interface NewApiKeyResult {
  id: string;
  key: string;
  name: string;
}

export default function LeadApiKeysPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const keysQuery = useQuery<ApiKeyRecord[]>({
    queryKey: ['lead-inbound-api-keys'],
    queryFn: () => api.get('/leads/inbound/api-keys').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      api.post('/leads/inbound/api-keys', { name }).then((r) => r.data),
    onSuccess: (data: NewApiKeyResult) => {
      setNewApiKey(data.key);
      setNewKeyName('');
      queryClient.invalidateQueries({ queryKey: ['lead-inbound-api-keys'] });
      toast.success('API Key criada com sucesso');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao criar API key');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/leads/inbound/api-keys/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-inbound-api-keys'] });
      toast.success('API Key revogada');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Erro ao revogar API key');
    },
  });

  function handleCopyKey() {
    if (newApiKey) {
      navigator.clipboard.writeText(newApiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleCreate() {
    if (!newKeyName.trim()) return;
    createMutation.mutate(newKeyName.trim());
  }

  function handleCloseDialog() {
    setCreateOpen(false);
    setNewApiKey(null);
    setNewKeyName('');
  }

  if (!user) return null;

  const keys = keysQuery.data || [];

  return (
    <AdminLayout
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      }}
    >
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Key className="h-6 w-6" />
              API Keys - Formulário de Leads
            </h1>
            <p className="text-muted-foreground">
              Gerencie as chaves de API para o formulário público de captação de leads
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova API Key
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Como funciona
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. Crie uma API Key para autenticar o formulário público</p>
            <p>2. Configure a chave no formulário (variável de ambiente <code className="bg-muted px-1 rounded">NEXT_PUBLIC_LEAD_INBOUND_API_KEY</code>)</p>
            <p>3. O formulário envia os dados para <code className="bg-muted px-1 rounded">POST /api/v1/leads/inbound</code> com o header <code className="bg-muted px-1 rounded">X-Api-Key</code></p>
            <p>4. O tenant é identificado automaticamente pela chave, sem expor dados internos</p>
          </CardContent>
        </Card>

        {keysQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-[80px] w-full" />
            <Skeleton className="h-[80px] w-full" />
          </div>
        ) : keys.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Key className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Nenhuma API Key criada</p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira API Key
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {keys.map((k) => (
              <Card key={k.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <Key className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{k.name}</p>
                        <Badge variant={k.isActive ? 'success' : 'destructive'}>
                          {k.isActive ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground font-mono">
                        {k.key.substring(0, 12)}...{k.key.substring(k.key.length - 4)}
                      </p>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                        <span>Criada: {new Date(k.createdAt).toLocaleDateString('pt-BR')}</span>
                        {k.lastUsedAt && (
                          <span>Último uso: {new Date(k.lastUsedAt).toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {k.isActive && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => revokeMutation.mutate(k.id)}
                      disabled={revokeMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={createOpen} onOpenChange={handleCloseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {newApiKey ? 'API Key Criada' : 'Nova API Key'}
              </DialogTitle>
            </DialogHeader>

            {newApiKey ? (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">
                      Copie esta chave agora!
                    </p>
                    <p className="text-yellow-700">
                      Ela não será exibida novamente por segurança.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input value={newApiKey} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={handleCopyKey}>
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button onClick={handleCloseDialog} className="w-full">
                  Fechar
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da API Key</Label>
                  <Input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Ex: Formulário de Contato"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!newKeyName.trim() || createMutation.isPending}
                  >
                    {createMutation.isPending ? 'Criando...' : 'Criar'}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
