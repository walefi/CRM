'use client';

import { ModulePage } from '@/components/layout/module-page';
import { FileText } from 'lucide-react';

export default function Page() {
  return <ModulePage title="Propostas" icon={<FileText className="h-10 w-10" />} />;
}
