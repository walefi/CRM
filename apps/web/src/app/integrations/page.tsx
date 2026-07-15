'use client';

import { ModulePage } from '@/components/layout/module-page';
import { Puzzle } from 'lucide-react';

export default function Page() {
  return <ModulePage title="Integrações" icon={<Puzzle className="h-10 w-10" />} />;
}
