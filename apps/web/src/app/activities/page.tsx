'use client';

import { ModulePage } from '@/components/layout/module-page';
import { Activity } from 'lucide-react';

export default function Page() {
  return <ModulePage title="Atividades" icon={<Activity className="h-10 w-10" />} />;
}
