import WebNavbar from '@/components/web/navbar';
import WebFooter from '@/components/web/footer';

export default function WebLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='min-h-screen bg-background flex flex-col'>
      <WebNavbar />
      <main className='flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 py-6'>{children}</main>
      <WebFooter />
    </div>
  );
}
