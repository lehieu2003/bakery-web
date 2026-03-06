'use client';

import Image from 'next/image';
import { ChevronLeft, ShoppingBag, Star } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/lib/cart-store';
import { getProductById } from '@/lib/products';
import Link from 'next/link';

const SIZES = ['15cm', '18cm', '20cm', '25cm'];
const FLAVORS = ['Vanilla', 'Chocolate', 'Strawberry', 'Matcha', 'Taro'];

const RELATED = [
  {
    id: 'c2',
    name: 'Dark Chocolate Mousse',
    price: 380000,
    image: '/images/cake-2.jpg',
  },
  {
    id: 'c3',
    name: 'Strawberry Chiffon',
    price: 320000,
    image: '/images/cake-3.jpg',
  },
  {
    id: 'i1',
    name: 'Premium Almond Flour',
    price: 85000,
    image: '/images/ing-1.jpg',
  },
];

interface ProductDetailScreenProps {
  productId: string;
}

export default function ProductDetailScreen({
  productId,
}: ProductDetailScreenProps) {
  const { user, addToCart } = useCart();
  const selectedProduct = getProductById(productId);
  const [size, setSize] = useState(SIZES[1]);
  const [flavor, setFlavor] = useState(FLAVORS[0]);
  const [message, setMessage] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [added, setAdded] = useState(false);

  if (!selectedProduct) return <div>Product not found</div>;
  const isCake = selectedProduct.type === 'cake';

  const discountLabel =
    user?.level === 'platinum' ? '15%' : user?.level === 'gold' ? '10%' : '5%';
  const levelLabel = user?.level
    ? user.level.charAt(0).toUpperCase() + user.level.slice(1)
    : '';

  function handleAddToCart() {
    addToCart({
      id: selectedProduct!.id + '-' + Date.now(),
      name: selectedProduct!.name,
      price: selectedProduct!.price,
      image: selectedProduct!.image,
      type: selectedProduct!.type,
      size: isCake ? size : undefined,
      flavor: isCake ? flavor : undefined,
      message: isCake ? message : undefined,
      pickupDate: isCake ? pickupDate : undefined,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <div className='bg-background'>
      {/* Breadcrumb */}
      <div className='border-b border-border/60 bg-card'>
        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-4'>
          <Link
            href={isCake ? '/cakes' : '/ingredients'}
            className='flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors'
          >
            <ChevronLeft size={16} />
            {isCake ? 'Signature Cakes' : 'Baking Ingredients'}
          </Link>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16'>
          {/* Left: Image */}
          <div className='space-y-4'>
            <div className='relative w-full rounded-2xl overflow-hidden bg-secondary aspect-square'>
              <Image
                src={selectedProduct.image}
                alt={selectedProduct.name}
                fill
                className='object-cover'
                priority
              />
            </div>
            {/* Thumbnail strip (visual) */}
            <div className='flex gap-3'>
              {[selectedProduct.image, '/images/cake-detail.jpg'].map(
                (src, i) => (
                  <div
                    key={i}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden bg-secondary border-2 transition-colors ${
                      i === 0 ? 'border-primary' : 'border-border'
                    }`}
                  >
                    <Image
                      src={src}
                      alt={`View ${i + 1}`}
                      fill
                      className='object-cover'
                    />
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Right: Details + Options */}
          <div className='flex flex-col'>
            <h1 className='font-serif text-3xl lg:text-4xl font-semibold text-foreground text-balance mb-3'>
              {selectedProduct.name}
            </h1>

            <div className='flex items-center gap-4 mb-4'>
              <span className='font-sans text-2xl font-bold text-accent'>
                {selectedProduct.price.toLocaleString('vi-VN')}đ
              </span>
              <div className='flex items-center gap-1'>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    size={14}
                    className={
                      i <= 4 ? 'fill-amber-400 text-amber-400' : 'text-border'
                    }
                  />
                ))}
                <span className='text-xs text-muted-foreground ml-1'>
                  (128 reviews)
                </span>
              </div>
            </div>

            {user && (
              <div className='mb-5 px-4 py-3 rounded-xl bg-primary/8 border border-primary/20'>
                <p className='text-xs text-primary font-medium'>
                  As a {levelLabel} Member, you save {discountLabel} at
                  checkout.
                </p>
              </div>
            )}

            <p className='text-sm text-muted-foreground leading-relaxed mb-6'>
              {selectedProduct.description ||
                'Artisan quality, made fresh to order with premium ingredients and care.'}
            </p>

            <div className='h-px bg-border mb-6' />

            {/* Cake customisation */}
            {isCake && (
              <div className='space-y-5 mb-6'>
                <div>
                  <p className='text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3'>
                    Size
                  </p>
                  <div className='flex gap-2 flex-wrap'>
                    {SIZES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSize(s)}
                        className={`px-5 py-2 rounded-full text-sm font-medium border transition-colors ${
                          size === s
                            ? 'bg-primary text-white border-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className='text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3'>
                    Flavor
                  </p>
                  <div className='flex gap-2 flex-wrap'>
                    {FLAVORS.map((f) => (
                      <button
                        key={f}
                        onClick={() => setFlavor(f)}
                        className={`px-5 py-2 rounded-full text-sm font-medium border transition-colors ${
                          flavor === f
                            ? 'bg-primary text-white border-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className='text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 block'>
                    Message on Cake
                  </label>
                  <input
                    type='text'
                    placeholder='e.g. Happy Birthday, Linh!'
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={40}
                    className='w-full text-sm bg-card rounded-xl px-4 py-3 border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground transition-colors'
                  />
                  <p className='text-xs text-muted-foreground mt-1.5 text-right'>
                    {message.length}/40
                  </p>
                </div>

                <div>
                  <label className='text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 block'>
                    Pick-up Date
                  </label>
                  <input
                    type='date'
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className='w-full text-sm bg-card rounded-xl px-4 py-3 border border-border focus:outline-none focus:border-primary text-foreground transition-colors'
                  />
                </div>
              </div>
            )}

            {/* Ingredient specs */}
            {!isCake && (
              <div className='bg-card rounded-2xl border border-border/50 p-5 mb-6 space-y-3'>
                {[
                  { label: 'Weight', value: selectedProduct.weight || '500g' },
                  {
                    label: 'Origin',
                    value: selectedProduct.origin || 'Imported',
                  },
                  { label: 'Best Before', value: '12 months from production' },
                  {
                    label: 'Storage',
                    value: 'Cool, dry place away from sunlight',
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className='flex items-center justify-between py-1.5 border-b border-border/50 last:border-0'
                  >
                    <span className='text-sm text-muted-foreground'>
                      {label}
                    </span>
                    <span className='text-sm font-medium text-foreground'>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Add to cart */}
            <button
              onClick={handleAddToCart}
              className={`w-full py-4 rounded-full font-medium text-sm shadow-md flex items-center justify-center gap-2.5 transition-all ${
                added
                  ? 'bg-accent text-white'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              <ShoppingBag size={17} />
              {added ? 'Added to Cart!' : 'Add to Cart'}
            </button>

            {!user && (
              <p className='text-xs text-muted-foreground text-center mt-3'>
                <Link
                  href='/profile'
                  className='text-primary underline underline-offset-2'
                >
                  Sign in
                </Link>{' '}
                to enjoy membership discounts.
              </p>
            )}
          </div>
        </div>

        {/* Frequently Bought Together */}
        <div className='mt-16 pt-10 border-t border-border'>
          <h2 className='font-serif text-2xl font-semibold text-foreground mb-7'>
            Frequently Bought Together
          </h2>
          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5'>
            {RELATED.map((r) => (
              <div
                key={r.id}
                className='bg-card rounded-2xl overflow-hidden border border-border/50 hover:shadow-md transition-shadow'
              >
                <div
                  className='relative w-full overflow-hidden bg-secondary'
                  style={{ paddingBottom: '80%' }}
                >
                  <Image
                    src={r.image}
                    alt={r.name}
                    fill
                    className='object-cover'
                  />
                </div>
                <div className='p-4'>
                  <p className='text-sm font-semibold text-foreground text-balance'>
                    {r.name}
                  </p>
                  <p className='text-sm font-bold text-accent mt-1.5'>
                    {r.price.toLocaleString('vi-VN')}đ
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
