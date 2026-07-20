'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingScreen } from '@/components/ui/loading-screen';

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/conversations?channel=WHATSAPP');
  }, [router]);

  return <LoadingScreen />;
}
