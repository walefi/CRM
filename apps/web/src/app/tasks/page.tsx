'use client';

import { ModulePage } from '@/components/layout/module-page';
import { CheckSquare } from 'lucide-react';

export default function Page() {
  return <ModulePage title="Tarefas" icon={<CheckSquare className="h-10 w-10" />} />;
}
