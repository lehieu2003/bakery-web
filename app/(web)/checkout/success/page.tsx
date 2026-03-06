import SuccessScreen from '@/components/screens/SuccessScreen';

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const params = await searchParams;
  const orderNumber = params.order || 'N/A';
  return <SuccessScreen orderNumber={orderNumber} />;
}
