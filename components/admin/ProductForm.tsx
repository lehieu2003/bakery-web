'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ChevronLeft, X, Plus, Save, Eye } from 'lucide-react';
import { ImageUpload } from '@/components/image-upload';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ProductType } from '@/lib/admin-data';
import { cn } from '@/lib/utils';
import {
  useCreateProduct,
  useUpdateProduct,
  useProduct,
} from '@/hooks/admin/use-products';
import { useCategories } from '@/hooks/admin/use-categories';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useImageUpload } from '@/hooks/use-image-upload';

// Validation schema
const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(200, 'Name is too long'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(
      /^[a-z0-9-]+$/,
      'Slug must contain only lowercase letters, numbers, and hyphens',
    ),
  categoryId: z.string().min(1, 'Please select a category'),
  price: z.coerce.number().positive('Price must be greater than 0'),
  shortDesc: z.string().max(150, 'Short description is too long').optional(),
  fullDesc: z.string().optional(),
  isActive: z.boolean().default(true),
});

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
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-8 text-xs gap-1'
          onClick={add}
        >
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
  const { toast } = useToast();

  // API hooks
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const { data: categoriesData, isLoading: categoriesLoading } =
    useCategories();
  const { upload: uploadImage } = useImageUpload();

  // Load existing product when editing
  const {
    data: productData,
    isLoading: productLoading,
    error: productError,
  } = useProduct(productId || '');
  const existingProduct = productData;

  const initialType = existingProduct?.categoryId
    ? 'CAKE' // Default, since we don't have type in Product model
    : (searchParams.get('type')?.toUpperCase() as ProductType) || 'CAKE';

  // React Hook Form
  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      slug: '',
      categoryId: '',
      price: 0,
      shortDesc: '',
      fullDesc: '',
      isActive: true,
    },
  });

  const [productType, setProductType] = useState<ProductType>(initialType);

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

  // Images
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [thumbnailPublicId, setThumbnailPublicId] = useState<string | null>(
    null,
  );
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  // Populate form when editing existing product
  useEffect(() => {
    if (existingProduct) {
      form.reset({
        name: existingProduct.name,
        slug: existingProduct.slug,
        categoryId: existingProduct.categoryId || '',
        price: existingProduct.price,
        shortDesc: existingProduct.description?.slice(0, 80) || '',
        fullDesc: existingProduct.description || '',
        isActive: existingProduct.isActive,
      });
      setThumbnail(existingProduct.imageUrl || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingProduct]);

  // Auto-slug only for new products (don't override slug when editing)
  const [slugEdited, setSlugEdited] = useState(isEdit);
  const nameValue = form.watch('name');

  useEffect(() => {
    if (slugEdited || !nameValue) return;
    const s = nameValue
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    form.setValue('slug', s);
  }, [nameValue, slugEdited, form]);

  // Get categories from API (filter active ones)
  const categories = (categoriesData || []).filter((c) => c.isActive);

  // Loading state
  if (isEdit && productLoading) {
    return (
      <div className='flex flex-col items-center justify-center py-24 text-center'>
        <Loader2 className='w-8 h-8 animate-spin text-primary mb-4' />
        <p className='text-sm text-muted-foreground'>Loading product...</p>
      </div>
    );
  }

  // Error state
  if (isEdit && productError) {
    return (
      <div className='flex flex-col items-center justify-center py-24 text-center'>
        <div className='w-14 h-14 bg-muted rounded-xl flex items-center justify-center mb-4'>
          <X size={24} className='text-muted-foreground' />
        </div>
        <h2 className='font-serif text-lg font-semibold text-foreground mb-1'>
          Failed to load product
        </h2>
        <p className='text-xs text-muted-foreground mb-4'>
          An error occurred while loading the product.
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

  // Not found guard for edit mode
  if (isEdit && !existingProduct && !productLoading) {
    return (
      <div className='flex flex-col items-center justify-center py-24 text-center'>
        <div className='w-14 h-14 bg-muted rounded-xl flex items-center justify-center mb-4'>
          <X size={24} className='text-muted-foreground' />
        </div>
        <h2 className='font-serif text-lg font-semibold text-foreground mb-1'>
          Product not found
        </h2>
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

  const handleSave = async (
    values: z.infer<typeof productSchema>,
    publish = true,
  ) => {
    try {
      let finalImageUrl = thumbnail;

      // Upload image if user selected a new file
      if (thumbnailFile) {
        const uploadResult = await uploadImage(thumbnailFile, 'products');
        if (uploadResult) {
          finalImageUrl = uploadResult.url;
          setThumbnail(uploadResult.url);
          setThumbnailPublicId(uploadResult.publicId);
        }
      }

      const productData = {
        name: values.name.trim(),
        slug: values.slug.trim(),
        description: values.fullDesc?.trim() || undefined,
        price: values.price,
        stock: 100, // Default stock
        categoryId: values.categoryId,
        imageUrl: finalImageUrl || undefined,
        images: finalImageUrl ? [finalImageUrl] : undefined,
        isActive: publish ? values.isActive : false,
        isFeatured: false,
      };

      if (isEdit && productId) {
        // Update existing product
        await updateMutation.mutateAsync({
          id: productId,
          data: productData,
        });

        toast({
          title: 'Success',
          description: 'Product updated successfully',
        });
      } else {
        // Create new product
        await createMutation.mutateAsync(productData);

        toast({
          title: 'Success',
          description: `Product ${publish ? 'published' : 'saved as draft'} successfully`,
        });

        // Redirect to products list
        router.push('/admin/products');
      }
    } catch (error) {
      console.error('Save product error:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to save product',
        variant: 'destructive',
      });
    }
  };

  return (
    <Form {...form}>
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
              {isEdit
                ? 'Update product details'
                : 'Create a new product listing'}
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
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-medium'>Name</FormLabel>
                  <FormControl>
                    <Input
                      className='h-9 text-sm'
                      placeholder='Product name'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Slug */}
            <FormField
              control={form.control}
              name='slug'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-medium'>Slug</FormLabel>
                  <FormControl>
                    <Input
                      className='h-9 text-sm font-mono'
                      placeholder='product-slug'
                      {...field}
                      onChange={(e) => {
                        setSlugEdited(true);
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category + Price row */}
            <div className='grid grid-cols-2 gap-3'>
              <FormField
                control={form.control}
                name='categoryId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-medium'>
                      Category
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className='h-9 text-xs'>
                          <SelectValue placeholder='Select category' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoriesLoading ? (
                          <div className='text-xs text-muted-foreground p-2'>
                            Loading categories...
                          </div>
                        ) : categories.length === 0 ? (
                          <div className='text-xs text-muted-foreground p-2'>
                            No categories available
                          </div>
                        ) : (
                          categories.map((c) => (
                            <SelectItem
                              key={c.id}
                              value={c.id}
                              className='text-xs'
                            >
                              {c.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='price'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-medium'>
                      Price (VND)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        className='h-9 text-sm'
                        placeholder='850000'
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status */}
            <FormField
              control={form.control}
              name='isActive'
              render={({ field }) => (
                <div className='flex items-center justify-between py-2 border-t border-border'>
                  <div>
                    <p className='text-xs font-medium text-foreground'>
                      Status: Active
                    </p>
                    <p className='text-[10px] text-muted-foreground mt-0.5'>
                      Active products appear in the store
                    </p>
                  </div>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />

            {/* Descriptions */}
            <FormField
              control={form.control}
              name='shortDesc'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-medium'>
                    Short Description
                  </FormLabel>
                  <FormControl>
                    <Input
                      className='h-9 text-sm'
                      placeholder='Brief product description'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='fullDesc'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-medium'>
                    Full Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      className='text-sm resize-none'
                      rows={4}
                      placeholder='Detailed product description...'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* B) Media */}
          <div className='bg-card rounded-xl border border-border p-5 shadow-sm space-y-4'>
            <h2 className='font-serif text-sm font-semibold text-foreground pb-2 border-b border-border'>
              Media
            </h2>

            <div>
              <Label className='text-xs font-medium'>Thumbnail</Label>
              <ImageUpload
                deferUpload={true}
                onFileSelect={(file) => {
                  setThumbnailFile(file);
                }}
                onUploadComplete={(url, publicId) => {
                  // This won't be called in deferred mode
                  setThumbnail(url);
                  setThumbnailPublicId(publicId);
                }}
                onDelete={() => {
                  setThumbnail(null);
                  setThumbnailPublicId(null);
                  setThumbnailFile(null);
                }}
                folder='products'
                currentImage={thumbnail || undefined}
                className='mt-1.5'
              />
            </div>
          </div>

          {/* C) Options */}
          <div className='bg-card rounded-xl border border-border p-5 shadow-sm space-y-4'>
            <h2 className='font-serif text-sm font-semibold text-foreground pb-2 border-b border-border'>
              Options {productType === 'CAKE' ? '(Cake)' : '(Ingredient)'}
            </h2>

            {productType === 'CAKE' ? (
              <>
                <ChipInput
                  label='Sizes'
                  values={sizes}
                  onChange={setSizes}
                  placeholder='e.g. S, M, L or 6-inch'
                />
                <ChipInput
                  label='Flavors'
                  values={flavors}
                  onChange={setFlavors}
                  placeholder='e.g. Vanilla, Chocolate'
                />

                <div className='flex items-center justify-between py-2 border-t border-border'>
                  <div>
                    <p className='text-xs font-medium text-foreground'>
                      Allow Custom Message
                    </p>
                    <p className='text-[10px] text-muted-foreground mt-0.5'>
                      Customer can add a personalized cake message
                    </p>
                  </div>
                  <Switch
                    checked={allowMessage}
                    onCheckedChange={setAllowMessage}
                  />
                </div>

                {allowMessage && (
                  <div>
                    <Label className='text-xs font-medium'>
                      Max Characters
                    </Label>
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
                    <p className='text-xs font-medium text-foreground'>
                      Require Pickup Time
                    </p>
                    <p className='text-[10px] text-muted-foreground mt-0.5'>
                      Customer must select a pickup date/time
                    </p>
                  </div>
                  <Switch
                    checked={requirePickup}
                    onCheckedChange={setRequirePickup}
                  />
                </div>

                {requirePickup && (
                  <div>
                    <Label className='text-xs font-medium'>
                      Min Advance Hours
                    </Label>
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
                <ChipInput
                  label='Weight Options'
                  values={weights}
                  onChange={setWeights}
                  placeholder='e.g. 250g, 500g, 1kg'
                />
                <ChipInput
                  label='Packaging'
                  values={packagings}
                  onChange={setPackagings}
                  placeholder='e.g. Bag, Box, Bottle'
                />
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
              <Input
                className='h-8 text-xs mt-1.5'
                placeholder='Page title for search engines'
              />
            </div>
            <div>
              <Label className='text-xs font-medium'>Meta Description</Label>
              <Textarea
                className='text-xs mt-1.5 resize-none'
                rows={2}
                placeholder='Description shown in search results...'
              />
            </div>
          </div>
        </div>

        {/* Sticky action bar */}
        <div className='sticky bottom-0 left-0 right-0 bg-card border-t border-border py-3 flex items-center justify-between mt-6 -mx-4 md:-mx-6 px-4 md:px-6'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='text-xs h-8 text-muted-foreground'
            onClick={() => router.back()}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            Cancel
          </Button>
          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='text-xs h-8 gap-1.5'
              onClick={form.handleSubmit((values) => handleSave(values, false))}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              <Save size={12} />
              Save Draft
            </Button>
            <Button
              type='button'
              size='sm'
              className='text-xs h-8 gap-1.5'
              onClick={form.handleSubmit((values) => handleSave(values, true))}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <svg
                    className='animate-spin h-3 w-3'
                    viewBox='0 0 24 24'
                    fill='none'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    />
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z'
                    />
                  </svg>
                  Saving...
                </>
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
    </Form>
  );
}
