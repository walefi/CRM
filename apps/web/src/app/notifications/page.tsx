'use client';

import { ModulePage } from '@/components/layout/module-page';
import { Bell } from 'lucide-react';

export default function Page() {
  return <ModulePage title="Notificações" icon={<Bell className="h-10 w-10" />} />;
}
