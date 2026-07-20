'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/stores/auth.store';
import { AdminLayout } from '@/components/layout/admin-layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Building2,
  Palette,
  Globe,
  Mail,
  Bell,
  Shield,
  Paperclip,
  Save,
  Loader2,
  Upload,
  MessageCircle,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const generalSchema = z.object({
  companyName: z.string().min(2).optional(),
  legalName: z.string().optional(),
  document: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().optional(),
  street: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
});

const brandingSchema = z.object({
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
});

const regionalSchema = z.object({
  language: z.string().optional(),
  timezone: z.string().optional(),
  dateFormat: z.string().optional(),
  timeFormat: z.string().optional(),
  currency: z.string().optional(),
  firstDayOfWeek: z.coerce.number().optional(),
});

const smtpSchema = z.object({
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpUseTls: z.boolean().optional(),
  senderName: z.string().optional(),
  senderEmail: z.string().email().optional().or(z.literal('')),
});

const notificationsSchema = z.object({
  emailNotifications: z.boolean().optional(),
  browserNotifications: z.boolean().optional(),
  notificationFrequency: z.string().optional(),
});

const securitySchema = z.object({
  twoFactorAuth: z.boolean().optional(),
  sessionTimeout: z.coerce.number().optional(),
  minPasswordLength: z.coerce.number().optional(),
  ipWhitelist: z.string().optional(),
});

const filesSchema = z.object({
  maxFileSize: z.coerce.number().optional(),
  allowedFileTypes: z.string().optional(),
  storageProvider: z.string().optional(),
  storagePath: z.string().optional(),
});

const whatsappSchema = z.object({
  appId: z.string().optional(),
  appSecret: z.string().optional(),
  phoneNumberId: z.string().optional(),
  wabaId: z.string().optional(),
  verifyToken: z.string().optional(),
  accessToken: z.string().optional(),
});

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const generalForm = useForm({ resolver: zodResolver(generalSchema) });
  const brandingForm = useForm({ resolver: zodResolver(brandingSchema) });
  const regionalForm = useForm({ resolver: zodResolver(regionalSchema) });
  const smtpForm = useForm({ resolver: zodResolver(smtpSchema) });
  const notificationsForm = useForm({ resolver: zodResolver(notificationsSchema) });
  const securityForm = useForm({ resolver: zodResolver(securitySchema) });
  const filesForm = useForm({ resolver: zodResolver(filesSchema) });
  const whatsappForm = useForm({ resolver: zodResolver(whatsappSchema) });

  async function saveSection(section: string, data: unknown) {
    setLoading(true);
    try {
      await api.patch(`/company/settings/${section}`, data);
      toast.success('Configurações salvas');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.post('/company/logo', fd);
      toast.success('Logo atualizado');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro no upload');
    }
  }

  async function handleTestEmail() {
    if (!testEmail) {
      toast.error('Informe um email');
      return;
    }
    try {
      await api.post('/company/test-email', { recipient: testEmail });
      toast.success('Email de teste enviado');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Falha no teste');
    }
  }

  if (!user) return null;

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
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Gerencie as configurações da sua empresa</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="general">
              <Building2 className="h-4 w-4 mr-2" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="branding">
              <Palette className="h-4 w-4 mr-2" />
              Identidade Visual
            </TabsTrigger>
            <TabsTrigger value="regional">
              <Globe className="h-4 w-4 mr-2" />
              Regionalização
            </TabsTrigger>
            <TabsTrigger value="smtp">
              <Mail className="h-4 w-4 mr-2" />
              E-mail
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Segurança
            </TabsTrigger>
            <TabsTrigger value="files">
              <Paperclip className="h-4 w-4 mr-2" />
              Arquivos
            </TabsTrigger>
            <TabsTrigger value="whatsapp">
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </TabsTrigger>
          </TabsList>

          {/* General */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Informações Gerais</CardTitle>
                <CardDescription>
                  Dados da empresa exibidos em propostas e documentos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={generalForm.handleSubmit((d) => saveSection('general', d))}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome da empresa</Label>
                      <Input placeholder="Acme Inc" {...generalForm.register('companyName')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Nome fantasia</Label>
                      <Input placeholder="Acme Tecnologia" {...generalForm.register('legalName')} />
                    </div>
                    <div className="space-y-2">
                      <Label>CNPJ/CPF</Label>
                      <Input
                        placeholder="12.345.678/0001-90"
                        {...generalForm.register('document')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input placeholder="+5511999999999" {...generalForm.register('phone')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Celular</Label>
                      <Input placeholder="+5511999999998" {...generalForm.register('mobile')} />
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp</Label>
                      <Input placeholder="+5511999999997" {...generalForm.register('whatsapp')} />
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input placeholder="contato@acme.com" {...generalForm.register('email')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Website</Label>
                      <Input placeholder="https://acme.com" {...generalForm.register('website')} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Endereço</Label>
                      <Input
                        placeholder="Avenida Paulista, 1000"
                        {...generalForm.register('street')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bairro</Label>
                      <Input placeholder="Bela Vista" {...generalForm.register('neighborhood')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input placeholder="São Paulo" {...generalForm.register('city')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Input placeholder="SP" {...generalForm.register('state')} />
                    </div>
                    <div className="space-y-2">
                      <Label>País</Label>
                      <Input placeholder="Brasil" {...generalForm.register('country')} />
                    </div>
                    <div className="space-y-2">
                      <Label>CEP</Label>
                      <Input placeholder="01310-100" {...generalForm.register('zipCode')} />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branding */}
          <TabsContent value="branding">
            <Card>
              <CardHeader>
                <CardTitle>Identidade Visual</CardTitle>
                <CardDescription>Personalize a aparência do sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={brandingForm.handleSubmit((d) => saveSection('branding', d))}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div>
                      <Label>Logo</Label>
                      <div className="mt-2 flex items-center gap-4">
                        <div className="h-20 w-40 rounded-lg border bg-muted flex items-center justify-center text-muted-foreground text-sm">
                          Preview
                        </div>
                        <div>
                          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-md border hover:bg-accent">
                            <Upload className="h-4 w-4" />
                            Upload Logo
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleLogoUpload}
                            />
                          </label>
                          <p className="text-xs text-muted-foreground mt-1">
                            PNG ou SVG, máximo 2MB
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cor primária</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            className="w-16 h-10 p-1"
                            {...brandingForm.register('primaryColor')}
                          />
                          <Input placeholder="#3B82F6" {...brandingForm.register('primaryColor')} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Cor secundária</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            className="w-16 h-10 p-1"
                            {...brandingForm.register('secondaryColor')}
                          />
                          <Input
                            placeholder="#1D4ED8"
                            {...brandingForm.register('secondaryColor')}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Regional */}
          <TabsContent value="regional">
            <Card>
              <CardHeader>
                <CardTitle>Regionalização</CardTitle>
                <CardDescription>Configurações de idioma, moeda e formato</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={regionalForm.handleSubmit((d) => saveSection('regional', d))}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Idioma</Label>
                      <Input placeholder="pt-BR" {...regionalForm.register('language')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Fuso horário</Label>
                      <Input
                        placeholder="America/Sao_Paulo"
                        {...regionalForm.register('timezone')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Formato de data</Label>
                      <Input placeholder="DD/MM/YYYY" {...regionalForm.register('dateFormat')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Formato de hora</Label>
                      <Input placeholder="HH:mm" {...regionalForm.register('timeFormat')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Moeda</Label>
                      <Input placeholder="BRL" {...regionalForm.register('currency')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Primeiro dia da semana</Label>
                      <Input
                        type="number"
                        min="0"
                        max="6"
                        {...regionalForm.register('firstDayOfWeek')}
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SMTP */}
          <TabsContent value="smtp">
            <Card>
              <CardHeader>
                <CardTitle>Configuração de E-mail</CardTitle>
                <CardDescription>Servidor SMTP para envio de emails transacionais</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={smtpForm.handleSubmit((d) => saveSection('smtp', d))}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Host SMTP</Label>
                      <Input placeholder="smtp.gmail.com" {...smtpForm.register('smtpHost')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Porta</Label>
                      <Input type="number" placeholder="587" {...smtpForm.register('smtpPort')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Usuário</Label>
                      <Input
                        placeholder="notifications@acme.com"
                        {...smtpForm.register('smtpUser')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Senha</Label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...smtpForm.register('smtpPassword')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nome do remetente</Label>
                      <Input placeholder="Acme CRM" {...smtpForm.register('senderName')} />
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail remetente</Label>
                      <Input
                        placeholder="no-reply@acme.com"
                        {...smtpForm.register('senderEmail')}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="space-y-2 flex-1">
                      <Label>Email para teste</Label>
                      <Input
                        placeholder="test@example.com"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                      />
                    </div>
                    <Button type="button" variant="outline" onClick={handleTestEmail}>
                      Testar conexão
                    </Button>
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notificações</CardTitle>
                <CardDescription>Configure como deseja receber notificações</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={notificationsForm.handleSubmit((d) => saveSection('notifications', d))}
                  className="space-y-4"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Notificações por e-mail</Label>
                        <p className="text-sm text-muted-foreground">
                          Receber notificações importantes por e-mail
                        </p>
                      </div>
                      <Switch
                        checked={notificationsForm.watch('emailNotifications')}
                        onCheckedChange={(v) => notificationsForm.setValue('emailNotifications', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Notificações no navegador</Label>
                        <p className="text-sm text-muted-foreground">
                          Receber notificações push no navegador
                        </p>
                      </div>
                      <Switch
                        checked={notificationsForm.watch('browserNotifications')}
                        onCheckedChange={(v) =>
                          notificationsForm.setValue('browserNotifications', v)
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Frequência de notificações</Label>
                    <Select
                      value={notificationsForm.watch('notificationFrequency')}
                      onValueChange={(v) => notificationsForm.setValue('notificationFrequency', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a frequência" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Tempo real</SelectItem>
                        <SelectItem value="hourly">A cada hora</SelectItem>
                        <SelectItem value="daily">Resumo diário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Segurança</CardTitle>
                <CardDescription>Configurações de segurança da conta</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={securityForm.handleSubmit((d) => saveSection('security', d))}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Autenticação em duas etapas</Label>
                      <p className="text-sm text-muted-foreground">
                        Adicione uma camada extra de segurança à sua conta
                      </p>
                    </div>
                    <Switch
                      checked={securityForm.watch('twoFactorAuth')}
                      onCheckedChange={(v) => securityForm.setValue('twoFactorAuth', v)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Timeout da sessão</Label>
                    <Select
                      value={String(securityForm.watch('sessionTimeout') ?? '')}
                      onValueChange={(v) => securityForm.setValue('sessionTimeout', Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o timeout" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="60">1 hora</SelectItem>
                        <SelectItem value="240">4 horas</SelectItem>
                        <SelectItem value="480">8 horas</SelectItem>
                        <SelectItem value="1440">24 horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Comprimento mínimo da senha</Label>
                    <Input
                      type="number"
                      min={6}
                      max={32}
                      placeholder="8"
                      {...securityForm.register('minPasswordLength')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Lista de IPs permitidos</Label>
                    <Textarea
                      placeholder={'192.168.1.0/24\n10.0.0.0/8\n203.0.113.50'}
                      className="h-32 font-mono text-sm"
                      {...securityForm.register('ipWhitelist')}
                    />
                    <p className="text-xs text-muted-foreground">
                      Um IP ou CIDR por linha. Deixe vazio para permitir todos.
                    </p>
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Files */}
          <TabsContent value="files">
            <Card>
              <CardHeader>
                <CardTitle>Arquivos</CardTitle>
                <CardDescription>Configurações de upload e armazenamento</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={filesForm.handleSubmit((d) => saveSection('files', d))}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tamanho máximo do arquivo (MB)</Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="10"
                        {...filesForm.register('maxFileSize')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipos de arquivo permitidos</Label>
                      <Input
                        placeholder="pdf,docx,xlsx,jpg,png"
                        {...filesForm.register('allowedFileTypes')}
                      />
                      <p className="text-xs text-muted-foreground">
                        Separados por vírgula, ex: pdf,docx,xlsx,jpg,png
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Provedor de armazenamento</Label>
                    <Select
                      value={filesForm.watch('storageProvider')}
                      onValueChange={(v) => filesForm.setValue('storageProvider', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o provedor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local</SelectItem>
                        <SelectItem value="s3">Amazon S3</SelectItem>
                        <SelectItem value="azure">Azure Blob Storage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Caminho de armazenamento</Label>
                    <Input placeholder="./uploads" {...filesForm.register('storagePath')} />
                    <p className="text-xs text-muted-foreground">
                      Diretório local ou prefixo do bucket para armazenar arquivos
                    </p>
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WhatsApp */}
          <TabsContent value="whatsapp">
            <Card>
              <CardHeader>
                <CardTitle>WhatsApp Business</CardTitle>
                <CardDescription>
                  Configure a integração com a Meta Cloud API para envio e recebimento de mensagens
                  via WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={whatsappForm.handleSubmit((d) => saveSection('whatsapp', d))}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Meta App ID</Label>
                      <Input placeholder="123456789" {...whatsappForm.register('appId')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Meta App Secret</Label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...whatsappForm.register('appSecret')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number ID</Label>
                      <Input placeholder="1234567890" {...whatsappForm.register('phoneNumberId')} />
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp Business Account ID</Label>
                      <Input placeholder="1234567890" {...whatsappForm.register('wabaId')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Webhook Verify Token</Label>
                      <Input
                        placeholder="meu-token-secreto"
                        {...whatsappForm.register('verifyToken')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Access Token</Label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...whatsappForm.register('accessToken')}
                      />
                    </div>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
                    <p className="font-medium">Instruções de configuração:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>
                        Crie um app em{' '}
                        <a
                          href="https://developers.facebook.com"
                          target="_blank"
                          className="underline"
                        >
                          developers.facebook.com
                        </a>
                      </li>
                      <li>Habilite o produto WhatsApp Business no seu app</li>
                      <li>
                        Configure o webhook URL:{' '}
                        <code className="bg-muted px-1 rounded">
                          https://seu-dominio/api/whatsapp/webhook/{'{tenantId}'}
                        </code>
                      </li>
                      <li>Insira o Verify Token definido acima</li>
                      <li>Insira o App Secret e Access Token gerados</li>
                    </ol>
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
