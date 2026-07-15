'use client';

import { ModulePage } from '@/components/layout/module-page';
import { KanbanSquare } from 'lucide-react';

export default function Page() {
  return <ModulePage title="Pipeline" icon={<KanbanSquare className="h-10 w-10" />} />;
}
