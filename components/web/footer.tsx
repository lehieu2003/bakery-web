export default function WebFooter() {
  return (
    <footer className='border-t border-border/60 bg-card mt-16'>
      <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10 flex flex-col md:flex-row items-center justify-between gap-4'>
        <div>
          <p className='font-serif text-base font-semibold tracking-wider uppercase text-foreground'>
            La Douceur
          </p>
          <p className='text-xs text-muted-foreground mt-0.5'>
            Handcrafted Cakes for Every Celebration
          </p>
        </div>
        <p className='text-xs text-muted-foreground'>
          &copy; {new Date().getFullYear()} La Douceur Artisan Bakery. All
          rights reserved.
        </p>
      </div>
    </footer>
  );
}
