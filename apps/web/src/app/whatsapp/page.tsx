'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Settings,
  Send,
  BarChart3,
  RefreshCw,
  Trash2,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Loader2,
} from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface WhatsAppConfig {
  id: string;
  phoneNumberId: string;
  wabaId: string;
  appId: string;
  isConnected: boolean;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: any;
  variables: string[] | null;
}

interface SyncStatus {
  totalMessages: number;
  lastMessageAt: string | null;
  totalTemplates: number;
  lastTemplateSyncAt: string | null;
}

interface TemplateStats {
  totalTemplates: number;
  byStatus: { status: string; count: number }[];
  byCategory: { category: string; count: number }[];
}

export default function WhatsAppPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('dashboard');
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [configForm, setConfigForm] = useState({
    accessToken: '',
    phoneNumberId: '',
    wabaId: '',
    appId: '',
    appSecret: '',
    verifyToken: '',
  });
  const [templateForm, setTemplateForm] = useState({
    name: '',
    language: 'pt_BR',
    category: 'UTILITY',
  });

  // Config query
  const { data: config, isLoading: configLoading } = useQuery<WhatsAppConfig | null>({
    queryKey: ['whatsapp-config'],
    queryFn: async () => {
      const { data } = await api.get('/whatsapp/config');
      return data;
    },
  });

  // Sync status query
  const { data: syncStatus, isLoading: syncLoading } = useQuery<SyncStatus>({
    queryKey: ['whatsapp-sync-status'],
    queryFn: async () => {
      const { data } = await api.get('/whatsapp/sync/status');
      return data;
    },
  });

  // Template stats query
  const { data: templateStats, isLoading: statsLoading } = useQuery<TemplateStats>({
    queryKey: ['whatsapp-template-stats'],
    queryFn: async () => {
      const { data } = await api.get('/whatsapp/templates/stats');
      return data;
    },
  });

  // Templates query
  const { data: templates = [], isLoading: templatesLoading } = useQuery<WhatsAppTemplate[]>({
    queryKey: ['whatsapp-templates'],
    queryFn: async () => {
      const { data } = await api.get('/whatsapp/templates');
      return data;
    },
    enabled: tab === 'templates',
  });

  // Save config mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (dto: typeof configForm) => {
      await api.post('/whatsapp/config', dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-config'] });
      setShowConfigDialog(false);
      toast.success('Configuracao salva com sucesso');
    },
    onError: () => toast.error('Erro ao salvar configuracao'),
  });

  // Sync templates mutation
  const syncTemplatesMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/whatsapp/templates/sync');
      return data;
    },
    onSuccess: (result: { synced: number; created: number; updated: number; errors: string[] }) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-template-stats'] });
      toast.success(`${result.synced} templates sincronizados`);
    },
    onError: () => toast.error('Erro ao sincronizar templates'),
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (dto: typeof templateForm) => {
      await api.post('/whatsapp/templates', dto);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-template-stats'] });
      setShowTemplateDialog(false);
      setTemplateForm({ name: '', language: 'pt_BR', category: 'UTILITY' });
      toast.success('Template criado com sucesso');
    },
    onError: () => toast.error('Erro ao criar template'),
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/whatsapp/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-template-stats'] });
      toast.success('Template excluido com sucesso');
    },
    onError: () => toast.error('Erro ao excluir template'),
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp Business</h1>
          <p className="text-muted-foreground">Gerencie integracao, templates e mensagens</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowConfigDialog(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configuracoes
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="dashboard">
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          {configLoading || syncLoading || statsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p className="text-2xl font-bold">
                          {config?.isConnected ? (
                            <Badge className="bg-green-500">
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Conectado
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-4 w-4 mr-1" />
                              Desconectado
                            </Badge>
                          )}
                        </p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Mensagens</p>
                        <p className="text-2xl font-bold">{syncStatus?.totalMessages || 0}</p>
                      </div>
                      <Send className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Templates</p>
                        <p className="text-2xl font-bold">{templateStats?.totalTemplates || 0}</p>
                      </div>
                      <FileText className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Ultimo Sync</p>
                        <p className="text-sm font-medium">
                          {syncStatus?.lastMessageAt
                            ? new Date(syncStatus.lastMessageAt).toLocaleString('pt-BR')
                            : 'Nunca'}
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Templates por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {templateStats?.byStatus?.map((item) => (
                      <div key={item.status} className="flex items-center justify-between">
                        <Badge variant={item.status === 'APPROVED' ? 'default' : 'secondary'}>
                          {item.status}
                        </Badge>
                        <span className="font-medium">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Templates WhatsApp</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => syncTemplatesMutation.mutate()}
                disabled={syncTemplatesMutation.isPending}
              >
                {syncTemplatesMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sincronizar Meta
              </Button>
              <Button onClick={() => setShowTemplateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Template
              </Button>
            </div>
          </div>

          {templatesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhum template encontrado. Crie um novo ou sincronize com a Meta.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{template.name}</span>
                            <Badge variant="outline">{template.language}</Badge>
                            <Badge variant="secondary">{template.category}</Badge>
                            <Badge
                              variant={
                                template.status === 'APPROVED'
                                  ? 'default'
                                  : template.status === 'REJECTED'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                            >
                              {template.status}
                            </Badge>
                          </div>
                          {template.variables && template.variables.length > 0 && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Variaveis: {template.variables.join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                            disabled={deleteTemplateMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Config Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configuracao WhatsApp Business</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Access Token</Label>
              <Input
                type="password"
                value={configForm.accessToken}
                onChange={(e) => setConfigForm({ ...configForm, accessToken: e.target.value })}
                placeholder="Token de acesso da Meta"
              />
            </div>
            <div>
              <Label>Phone Number ID</Label>
              <Input
                value={configForm.phoneNumberId}
                onChange={(e) => setConfigForm({ ...configForm, phoneNumberId: e.target.value })}
                placeholder="ID do numero de telefone"
              />
            </div>
            <div>
              <Label>WABA ID</Label>
              <Input
                value={configForm.wabaId}
                onChange={(e) => setConfigForm({ ...configForm, wabaId: e.target.value })}
                placeholder="ID do WhatsApp Business Account"
              />
            </div>
            <div>
              <Label>App ID</Label>
              <Input
                value={configForm.appId}
                onChange={(e) => setConfigForm({ ...configForm, appId: e.target.value })}
                placeholder="ID do aplicativo"
              />
            </div>
            <div>
              <Label>App Secret</Label>
              <Input
                type="password"
                value={configForm.appSecret}
                onChange={(e) => setConfigForm({ ...configForm, appSecret: e.target.value })}
                placeholder="Segredo do aplicativo"
              />
            </div>
            <div>
              <Label>Verify Token</Label>
              <Input
                value={configForm.verifyToken}
                onChange={(e) => setConfigForm({ ...configForm, verifyToken: e.target.value })}
                placeholder="Token de verificacao do webhook"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveConfigMutation.mutate(configForm)}
              disabled={saveConfigMutation.isPending}
            >
              {saveConfigMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="nome_do_template"
              />
            </div>
            <div>
              <Label>Idioma</Label>
              <Select
                value={templateForm.language}
                onValueChange={(v) => setTemplateForm({ ...templateForm, language: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt_BR">Portugues (Brasil)</SelectItem>
                  <SelectItem value="en_US">English (US)</SelectItem>
                  <SelectItem value="es_ES">Espanol</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select
                value={templateForm.category}
                onValueChange={(v) => setTemplateForm({ ...templateForm, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTILITY">Utilitario</SelectItem>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="AUTHENTICATION">Autenticacao</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createTemplateMutation.mutate(templateForm)}
              disabled={createTemplateMutation.isPending || !templateForm.name}
            >
              {createTemplateMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
