'use client';

import { ModulePage } from '@/components/layout/module-page';
import { MessageCircle } from 'lucide-react';

export default function Page() {
  return <ModulePage title="Conversas" icon={<MessageCircle className="h-10 w-10" />} />;
}
