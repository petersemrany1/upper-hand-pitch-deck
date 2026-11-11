import { createFileRoute, notFound } from '@tanstack/react-router';
import { useMemo } from 'react';
import { MetaAdsWizard } from '@/components/meta-ads/MetaAdsWizard';
import { createPreviewApi } from '@/lib/meta-ads/preview';
export const Route=createFileRoute('/meta-ads-preview')({beforeLoad:()=>{if(!import.meta.env.DEV)throw notFound();},component:Preview});
function Preview(){const api=useMemo(()=>createPreviewApi(),[]);return <MetaAdsWizard ownerKey="preview" api={api} demo/>;}
