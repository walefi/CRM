'use client';

import { ModulePage } from '@/components/layout/module-page';
import { Wrench } from 'lucide-react';

export default function CustomFieldsPage() {
  return (
    <ModulePage
      title="Campos Personalizados"
      description="Gerencie campos personalizados para todas as entidades do CRM. Crie campos de texto, número, select, data e muito mais."
      icon={<Wrench className="h-10 w-10" />}
    />
  );
}
