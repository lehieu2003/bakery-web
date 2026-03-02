'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ChevronLeft,
  Upload,
  X,
  Plus,
  Save,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mockCategories, mockProducts, ProductType } from '@/lib/admin-data';
import { cn } from '@/lib/utils';

interface ChipInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

function ChipInput({ label, values, onChange, placeholder }: ChipInputProps) {
  const [input, setInput] = useState('');

  const add = () => {
    const v = input.trim();
    if (v && !values.includes(v)) {
      onChange([...values, v]);
      setInput('');
    }
  };

  return (
    <div>
      <Label className='text-xs font-medium'>{label}</Label>
      <div className='flex flex-wrap gap-1.5 mt-1.5 mb-2'>
        {values.map((v) => (
          <span
            key={v}
            className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20'
          >
            {v}
            <button
              type='button'
              onClick={() => onChange(values.filter((x) => x !== v))}
              className='hover:text-destructive'
            >
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className='flex gap-2'>
        <Input
          className='h-8 text-xs'
          placeholder={placeholder || `Add ${label.toLowerCase()}...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type='button' variant='outline' size='sm' className='h-8 text-xs gap-1' onClick={add}>
          <Plus size={11} />
          Add
        </Button>
      </div>
    </div>
  );
}

export default function ProductForm({ productId }: { productId?: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isEdit = !!productId;

  // Find existing product when editing
  const existingProduct = productId ? mockProducts.find((p) => p.id === productId) : null;

  const initialType =
    existingProduct?.type ??
    ((searchParams.get('type')?.toUpperCase() as ProductType) || 'CAKE');

  const [productType, setProductType] = useState<ProductType>(initialType);
  const [name, setName] = useState(existingProduct?.name ?? '');
  const [slug, setSlug] = useState(existingProduct?.slug ?? '');
  const [category, setCategory] = useState(() => {
    if (!existingProduct) return '';
    const cat = mockCategories.find((c) => c.name === existingProduct.category);
    return cat?.id ?? '';
  });
  const [price, setPrice] = useState(existingProduct ? String(existingProduct.price) : '');
  const [active, setActive] = useState(existingProduct ? existingProduct.status === 'ACTIVE' : true);
  const [shortDesc, setShortDesc] = useState(existingProduct?.description?.slice(0, 80) ?? '');
  const [fullDesc, setFullDesc] = useState(existingProduct?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Cake options
  const [sizes, setSizes] = useState<string[]>(['S', 'M', 'L']);
  const [flavors, setFlavors] = useState<string[]>(['Vanilla', 'Chocolate']);
  const [allowMessage, setAllowMessage] = useState(true);
  const [maxChars, setMaxChars] = useState('30');
  const [requirePickup, setRequirePickup] = useState(true);
  const [minAdvance, setMinAdvance] = useState('4');

  // Ingredient options
  const [brand, setBrand] = useState('');
  const [weights, setWeights] = useState<string[]>(['250g', '500g']);
  const [packagings, setPackagings] = useState<string[]>(['Bag']);
  const [origin, setOrigin] = useState('');

  // Images — pre-fill thumbnail from existing product
  const [thumbnail, setThumbnail] = useState<string | null>(existingProduct?.thumbnail ?? null);

  // Auto-slug only for new products (don't override slug when editing)
  const [slugEdited, setSlugEdited] = useState(isEdit);
  useEffect(() => {
    if (slugEdited) return;
    const s = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    setSlug(s);
  }, [name, slugEdited]);

  const categories = mockCategories.filter((c) => c.type === productType);

  // Not found guard for edit mode
  if (isEdit && !existingProduct) {
    return (
      <div className='flex flex-col items-center justify-center py-24 text-center'>
        <div className='w-14 h-14 bg-muted rounded-xl flex items-center justify-center mb-4'>
          <X size={24} className='text-muted-foreground' />
        </div>
        <h2 className='font-serif text-lg font-semibold text-foreground mb-1'>Product not found</h2>
        <p className='text-xs text-muted-foreground mb-4'>
          The product you are trying to edit does not exist.
        </p>
        <button
          onClick={() => router.back()}
          className='text-xs text-primary underline underline-offset-4'
        >
          Go back
        </button>
      </div>
    );
  }

  const handleSave = async (publish = true) => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 900));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className='max-w-3xl'>
      {/* Header */}
      <div className='flex items-center gap-3 mb-6'>
        <button
          onClick={() => router.back()}
          className='p-1.5 rounded-lg hover:bg-muted text-muted-foreground'
        >
          <ChevronLeft size={16} />
        </button>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>
            {isEdit ? 'Edit Product' : 'Add Product'}
          </h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            {isEdit ? 'Update product details' : 'Create a new product listing'}
          </p>
        </div>
      </div>

      <div className='space-y-4'>
        {/* A) Basic Info */}
        <div className='bg-card rounded-xl border border-border p-5 shadow-sm space-y-4'>
          <h2 className='font-serif text-sm font-semibold text-foreground pb-2 border-b border-border'>
            Basic Information
          </h2>

          {/* Product type */}
          <div>
            <Label className='text-xs font-medium'>Product Type</Label>
            <div className='flex gap-2 mt-1.5'>
              {(['CAKE', 'INGREDIENT'] as ProductType[]).map((t) => (
                <button
                  key={t}
                  type='button'
                  onClick={() => !isEdit && setProductType(t)}
                  disabled={isEdit}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-xs font-medium border transition-all',
                    productType === t
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:border-primary/40',
                    isEdit && 'cursor-not-allowed opacity-60',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <Label htmlFor='name' className='text-xs font-medium'>
              Name
            </Label>
            <Input
              id='name'
              className='h-9 text-sm mt-1.5'
              placeholder='Product name'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Slug */}
          <div>
            <Label htmlFor='slug' className='text-xs font-medium'>
              Slug
            </Label>
            <Input
              id='slug'
              className='h-9 text-sm mt-1.5 font-mono'
              placeholder='product-slug'
              value={slug}
              onChange={(e) => {
                setSlugEdited(true);
                setSlug(e.target.value);
              }}
            />
          </div>

          {/* Category + Price row */}
          <div className='grid grid-cols-2 gap-3'>
            <div>
              <Label className='text-xs font-medium'>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className='h-9 text-xs mt-1.5'>
                  <SelectValue placeholder='Select category' />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id} className='text-xs'>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor='price' className='text-xs font-medium'>
                Price (VND)
              </Label>
              <Input
                id='price'
                type='number'
                className='h-9 text-sm mt-1.5'
                placeholder='850000'
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          {/* Status */}
          <div className='flex items-center justify-between py-2 border-t border-border'>
            <div>
              <p className='text-xs font-medium text-foreground'>Status: Active</p>
              <p className='text-[10px] text-muted-foreground mt-0.5'>
                Active products appear in the store
              </p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>

          {/* Descriptions */}
          <div>
            <Label htmlFor='short-desc' className='text-xs font-medium'>
              Short Description
            </Label>
            <Input
              id='short-desc'
              className='h-9 text-sm mt-1.5'
              placeholder='Brief product description'
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor='full-desc' className='text-xs font-medium'>
              Full Description
            </Label>
            <Textarea
              id='full-desc'
              className='text-sm mt-1.5 resize-none'
              rows={4}
              placeholder='Detailed product description...'
              value={fullDesc}
              onChange={(e) => setFullDesc(e.target.value)}
            />
          </div>
        </div>

        {/* B) Media */}
        <div className='bg-card rounded-xl border border-border p-5 shadow-sm space-y-4'>
          <h2 className='font-serif text-sm font-semibold text-foreground pb-2 border-b border-border'>
            Media
          </h2>

          <div>
            <Label className='text-xs font-medium'>Thumbnail</Label>
            <div
              className='mt-1.5 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 py-8 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors relative overflow-hidden'
              onClick={() => {
                // Simulate picking an image
                setThumbnail('/images/cake-detail.jpg');
              }}
            >
              {thumbnail ? (
                <>
                  <Image
                    src={thumbnail}
                    alt='Thumbnail preview'
                    fill
                    className='object-cover'
                  />
                  <div className='absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity'>
                    <button
                      type='button'
                      onClick={(e) => { e.stopPropagation(); setThumbnail(null); }}
                      className='bg-white rounded-full p-1.5 shadow'
                    >
                      <X size={14} className='text-foreground' />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className='p-3 bg-muted rounded-xl'>
                    <Upload size={20} className='text-muted-foreground' />
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    Click to upload thumbnail
                  </p>
                  <p className='text-[10px] text-muted-foreground/60'>
                    JPG, PNG, WEBP · max 5MB
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* C) Options */}
        <div className='bg-card rounded-xl border border-border p-5 shadow-sm space-y-4'>
          <h2 className='font-serif text-sm font-semibold text-foreground pb-2 border-b border-border'>
            Options {productType === 'CAKE' ? '(Cake)' : '(Ingredient)'}
          </h2>

          {productType === 'CAKE' ? (
            <>
              <ChipInput label='Sizes' values={sizes} onChange={setSizes} placeholder='e.g. S, M, L or 6-inch' />
              <ChipInput label='Flavors' values={flavors} onChange={setFlavors} placeholder='e.g. Vanilla, Chocolate' />

              <div className='flex items-center justify-between py-2 border-t border-border'>
                <div>
                  <p className='text-xs font-medium text-foreground'>Allow Custom Message</p>
                  <p className='text-[10px] text-muted-foreground mt-0.5'>
                    Customer can add a personalized cake message
                  </p>
                </div>
                <Switch checked={allowMessage} onCheckedChange={setAllowMessage} />
              </div>

              {allowMessage && (
                <div>
                  <Label className='text-xs font-medium'>Max Characters</Label>
                  <Input
                    type='number'
                    className='h-8 text-xs mt-1.5 max-w-24'
                    value={maxChars}
                    onChange={(e) => setMaxChars(e.target.value)}
                  />
                </div>
              )}

              <div className='flex items-center justify-between py-2 border-t border-border'>
                <div>
                  <p className='text-xs font-medium text-foreground'>Require Pickup Time</p>
                  <p className='text-[10px] text-muted-foreground mt-0.5'>
                    Customer must select a pickup date/time
                  </p>
                </div>
                <Switch checked={requirePickup} onCheckedChange={setRequirePickup} />
              </div>

              {requirePickup && (
                <div>
                  <Label className='text-xs font-medium'>Min Advance Hours</Label>
                  <Input
                    type='number'
                    className='h-8 text-xs mt-1.5 max-w-24'
                    value={minAdvance}
                    onChange={(e) => setMinAdvance(e.target.value)}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <Label htmlFor='brand' className='text-xs font-medium'>
                  Brand
                </Label>
                <Input
                  id='brand'
                  className='h-8 text-xs mt-1.5'
                  placeholder='e.g. Callebaut'
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>
              <ChipInput label='Weight Options' values={weights} onChange={setWeights} placeholder='e.g. 250g, 500g, 1kg' />
              <ChipInput label='Packaging' values={packagings} onChange={setPackagings} placeholder='e.g. Bag, Box, Bottle' />
              <div>
                <Label htmlFor='origin' className='text-xs font-medium'>
                  Origin
                </Label>
                <Input
                  id='origin'
                  className='h-8 text-xs mt-1.5'
                  placeholder='e.g. Belgium'
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {/* D) SEO */}
        <div className='bg-card rounded-xl border border-border p-5 shadow-sm space-y-4'>
          <h2 className='font-serif text-sm font-semibold text-foreground pb-2 border-b border-border'>
            SEO (Optional)
          </h2>
          <div>
            <Label className='text-xs font-medium'>Meta Title</Label>
            <Input className='h-8 text-xs mt-1.5' placeholder='Page title for search engines' />
          </div>
          <div>
            <Label className='text-xs font-medium'>Meta Description</Label>
            <Textarea className='text-xs mt-1.5 resize-none' rows={2} placeholder='Description shown in search results...' />
          </div>
        </div>
      </div>

      {/* Sticky action bar */}
      <div className='sticky bottom-0 left-0 right-0 bg-card border-t border-border px-0 py-3 flex items-center justify-between mt-6 -mx-4 md:-mx-6 px-4 md:px-6'>
        <Button
          variant='ghost'
          size='sm'
          className='text-xs h-8 text-muted-foreground'
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='text-xs h-8 gap-1.5'
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            <Save size={12} />
            Save Draft
          </Button>
          <Button
            size='sm'
            className='text-xs h-8 gap-1.5'
            onClick={() => handleSave(true)}
            disabled={saving}
          >
            {saving ? (
              <>
                <svg className='animate-spin h-3 w-3' viewBox='0 0 24 24' fill='none'>
                  <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                  <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
                </svg>
                Saving...
              </>
            ) : saved ? (
              'Saved!'
            ) : (
              <>
                <Eye size={12} />
                {isEdit ? 'Update' : 'Publish'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
