import WebNavbar from '@/components/web/navbar';
import WebFooter from '@/components/web/footer';
import ChatbotBubble from '@/components/ui-custom/ChatbotBubble';
import ZaloPhoneBubble from '@/components/ui-custom/ZaloPhoneBubble';

export default function WebLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WebNavbar />
      <main className='min-h-screen bg-background max-w-7xl mx-auto w-full px-4 lg:px-8'>
        {children}
      </main>
      <WebFooter />
      <ZaloPhoneBubble />
      <ChatbotBubble />
    </>
  );
}
