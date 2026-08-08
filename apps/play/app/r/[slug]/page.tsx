import type { Metadata } from 'next';
import { getRegion } from '@/lib/region';
import { brand } from '@/lib/brand';
import { RegionView } from './RegionView';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const region = await getRegion(slug).catch(() => null);
  const title = region ? `${region.name} · ${brand.productName}` : brand.productName;
  return {
    title,
    description: brand.promise,
    openGraph: { title, description: brand.promise },
  };
}

export default async function RegionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const region = await getRegion(slug);
  return <RegionView region={region} />;
}
