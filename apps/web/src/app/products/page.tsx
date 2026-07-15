'use client';

import { ModulePage } from '@/components/layout/module-page';
import { Package } from 'lucide-react';

export default function Page() {
  return <ModulePage title="Produtos" icon={<Package className="h-10 w-10" />} />;
}
