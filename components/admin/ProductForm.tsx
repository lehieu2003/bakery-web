'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ChevronLeft, X, Plus, Save, Eye, Upload, Loader2, Star } from 'lucide-react';
import { useImageUpload } from '@/hooks/use-image-upload';
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
import { slugify } from '@/lib/slug';
import {
  useCreateProduct,
  useProductAudit,
  useUpdateProduct,
  useProduct,
} from '@/hooks/admin/use-products';
import { useCategories } from '@/hooks/admin/use-categories';
import { useProductAttributes } from '@/hooks/admin/use-product-attributes';
import { useToast } from '@/hooks/use-toast';
import AuditLogList from '@/components/admin/AuditLogList';
import type { Category, ProductAttribute, ProductAttributeValue } from '@/types/api.types';

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
  categoryIds: z
    .array(z.string())
    .min(1, 'Please select at least one category'),
  price: z.coerce.number().positive('Price must be greater than 0'),
  shortDesc: z.string().max(150, 'Short description is too long').optional(),
  fullDesc: z.string().optional(),
  isActive: z.boolean().default(true),
});

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
  const { data: attributesData, isLoading: attributesLoading } =
    useProductAttributes();
  const { upload: uploadImage } = useImageUpload();

  // Load existing product when editing
  const {
    data: productData,
    isLoading: productLoading,
    error: productError,
  } = useProduct(productId || '');
  const existingProduct = productData;
  const {
    data: productAudit,
    isLoading: productAuditLoading,
    error: productAuditError,
  } = useProductAudit(productId || '', 1, 10);

  const initialType = existingProduct?.categories?.length
    ? 'CAKE' // Default, since we don't have type in Product model
    : (searchParams.get('type')?.toUpperCase() as ProductType) || 'CAKE';

  // React Hook Form
  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      slug: '',
      categoryIds: [],
      price: 0,
      shortDesc: '',
      fullDesc: '',
      isActive: true,
    },
  });

  const [productType, setProductType] = useState<ProductType>(initialType);
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<
    Record<string, string[]>
  >({});

  // Images — array of { url, file? } where file means pending upload
  interface ImageItem {
    url: string; // preview URL (blob or remote)
    file?: File; // if pending upload
    isPrimary: boolean;
  }
  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Variants
  interface VariantRow {
    id?: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
  }
  const [variants, setVariants] = useState<VariantRow[]>([]);

  // Populate form when editing existing product
  useEffect(() => {
    if (existingProduct) {
      form.reset({
        name: existingProduct.name,
        slug: existingProduct.slug,
        categoryIds:
          existingProduct.categories?.map((pc: { categoryId: string }) => pc.categoryId) || [],
        price: existingProduct.price,
        shortDesc: existingProduct.description?.slice(0, 80) || '',
        fullDesc: existingProduct.description || '',
        isActive: existingProduct.isActive,
      });
      
      // Populate images from product
      if (existingProduct.images && existingProduct.images.length > 0) {
        setImages(
          existingProduct.images.map((img: { url: string; isPrimary?: boolean }, idx: number) => ({
            url: img.url,
            isPrimary: img.isPrimary || idx === 0,
          })),
        );
      }

      // Populate variants
      if (existingProduct.variants && existingProduct.variants.length > 0) {
        setVariants(
          existingProduct.variants.map((v: { id?: string; name: string; sku?: string | null; price: number; stock: number }) => ({
            id: v.id,
            name: v.name,
            sku: v.sku || '',
            price: v.price,
            stock: v.stock,
          })),
        );
      }

      const nextAssignments: Record<string, string[]> = {};
      for (const assignment of existingProduct.attributeAssignments || []) {
        if (!assignment.attributeId || !assignment.valueId) continue;
        nextAssignments[assignment.attributeId] = [
          ...(nextAssignments[assignment.attributeId] || []),
          assignment.valueId,
        ];
      }
      setSelectedAttributeValues(nextAssignments);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingProduct]);

  // Auto-slug only for new products (don't override slug when editing)
  const [slugEdited, setSlugEdited] = useState(isEdit);
  const nameValue = form.watch('name');

  useEffect(() => {
    if (slugEdited || !nameValue) return;
    const s = slugify(nameValue);
    form.setValue('slug', s);
  }, [nameValue, slugEdited, form]);

  // Get categories from API (filter active ones)
  const categories = (categoriesData || []).filter((c: Category) => c.isActive);
  const assignableAttributes = (attributesData || []).filter(
    (attribute: ProductAttribute) =>
      attribute.isActive &&
      ['SELECT', 'MULTI_SELECT'].includes(attribute.type),
  );

  // Loading state
  if (isEdit && productLoading) {
    return (
      <div className='flex flex-col items-center justify-center py-24 text-center'>
        <Loader2 className='w-8 h-8 animate-spin text-primary mb-4' />
        <p className='text-sm text-muted-foreground'>Loading product...</p>
      </div>
    );
  }

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
      setUploadingImages(true);

      // Upload all pending images
      const finalImages: { url: string; isPrimary: boolean }[] = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img.file) {
          const result = await uploadImage(img.file, 'products');
          if (result) {
            finalImages.push({ url: result.url, isPrimary: img.isPrimary });
          }
        } else {
          finalImages.push({ url: img.url, isPrimary: img.isPrimary });
        }
      }
      setUploadingImages(false);

      const productData = {
        name: values.name.trim(),
        slug: slugify(values.slug.trim()),
        description: values.fullDesc?.trim() || undefined,
        price: values.price,
        stock: 100, // Default stock
        categoryIds: values.categoryIds,
        images: finalImages,
        isActive: publish ? values.isActive : false,
        isFeatured: false,
        variants: variants
          .filter((v) => v.name.trim())
          .map((v) => ({
            ...(v.id ? { id: v.id } : {}),
            name: v.name.trim(),
            sku: v.sku.trim() || undefined,
            price: v.price,
            stock: v.stock,
          })),
        attributeAssignments: assignableAttributes
          .map((attribute: ProductAttribute) => ({
            attributeId: attribute.id,
            valueIds: selectedAttributeValues[attribute.id] || [],
          }))
          .filter(
            (assignment: { attributeId: string; valueIds: string[] }) =>
              assignment.valueIds.length > 0,
          ),
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
      setUploadingImages(false);
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
                        field.onChange(slugify(e.target.value));
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
                name='categoryIds'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-medium'>
                      Category
                    </FormLabel>
                    <Select
                      value={field.value?.[0] || ''}
                      onValueChange={(v) => field.onChange([v])}
                    >
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
                          categories.map((c: Category) => (
                            <React.Fragment key={c.id}>
                              <SelectItem
                                value={c.id}
                                className='text-xs font-medium'
                              >
                                {c.name}
                              </SelectItem>
                              {c.children?.map((child: Category) => (
                                <SelectItem
                                  key={child.id}
                                  value={child.id}
                                  className='text-xs pl-6'
                                >
                                  └ {child.name}
                                </SelectItem>
                              ))}
                            </React.Fragment>
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
                    <p className='text-xs text-muted-foreground mt-0.5'>
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

            {/* Full Description */}
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
            <div className='flex items-center justify-between pb-2 border-b border-border'>
              <h2 className='font-serif text-sm font-semibold text-foreground'>
                Media
              </h2>
              <span className='text-xs text-muted-foreground'>
                {images.length} / 10 ảnh
              </span>
            </div>

            {/* Image grid */}
            <div className='grid grid-cols-3 sm:grid-cols-4 gap-2'>
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                    img.isPrimary ? 'border-primary' : 'border-border'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={`Product image ${idx + 1}`}
                    className='w-full h-full object-cover'
                  />
                  {/* Primary badge */}
                  {img.isPrimary && (
                    <div className='absolute top-1 left-1 bg-primary text-primary-foreground rounded px-1 py-0.5 flex items-center gap-0.5'>
                      <Star size={8} className='fill-primary-foreground' />
                      <span className='text-[9px] font-medium leading-none'>Chính</span>
                    </div>
                  )}
                  {/* Actions overlay */}
                  <div className='absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 hover:opacity-100'>
                    {!img.isPrimary && (
                      <button
                        type='button'
                        title='Đặt làm ảnh chính'
                        onClick={() =>
                          setImages(
                            images.map((im, i) => ({
                              ...im,
                              isPrimary: i === idx,
                            })),
                          )
                        }
                        className='p-1 bg-white rounded text-foreground hover:bg-primary hover:text-primary-foreground transition-colors'
                      >
                        <Star size={12} />
                      </button>
                    )}
                    <button
                      type='button'
                      title='Xóa ảnh'
                      onClick={() =>
                        setImages((prev) => {
                          const next = prev.filter((_, i) => i !== idx);
                          // If removed was primary, make first primary
                          if (img.isPrimary && next.length > 0) {
                            next[0] = { ...next[0], isPrimary: true };
                          }
                          return next;
                        })
                      }
                      className='p-1 bg-white rounded text-destructive hover:bg-destructive hover:text-white transition-colors'
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add image button */}
              {images.length < 10 && (
                <label className='aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-muted/30 hover:bg-muted/60'>
                  <input
                    type='file'
                    accept='image/*'
                    multiple
                    className='hidden'
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      const newItems = files
                        .slice(0, 10 - images.length)
                        .map((file, i) => ({
                          url: URL.createObjectURL(file),
                          file,
                          isPrimary: images.length === 0 && i === 0,
                        }));
                      setImages((prev) => [...prev, ...newItems]);
                      e.target.value = '';
                    }}
                  />
                  <Upload size={16} className='text-muted-foreground' />
                  <span className='text-xs text-muted-foreground text-center leading-tight'>
                    Thêm ảnh
                  </span>
                </label>
              )}
            </div>

            <p className='text-xs text-muted-foreground'>
              Ảnh đầu tiên hoặc ảnh được đánh dấu sẽ là ảnh chính. Tối đa 10 ảnh, mỗi ảnh tối đa 10MB.
            </p>
          </div>

          {/* C) Variants */}
          <div className='bg-card rounded-xl border border-border p-5 shadow-sm space-y-4'>
            <div className='flex items-center justify-between pb-2 border-b border-border'>
              <h2 className='font-serif text-sm font-semibold text-foreground'>
                Variants
              </h2>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='text-xs h-7 gap-1'
                onClick={() =>
                  setVariants([
                    ...variants,
                    {
                      name: '',
                      sku: '',
                      price: form.getValues('price') || 0,
                      stock: 0,
                    },
                  ])
                }
              >
                <Plus size={11} />
                Add Variant
              </Button>
            </div>

            {variants.length === 0 ? (
              <p className='text-xs text-muted-foreground py-2'>
                No variants yet. Add variants for different sizes, flavors, etc.
              </p>
            ) : (
              <div className='space-y-3'>
                {variants.map((v, idx) => (
                  <div
                    key={v.id || idx}
                    className='grid grid-cols-[1fr_0.7fr_0.7fr_0.5fr_auto] gap-2 items-end'
                  >
                    <div>
                      {idx === 0 && (
                        <Label className='text-xs font-medium text-muted-foreground'>
                          Name
                        </Label>
                      )}
                      <Input
                        className='h-8 text-xs'
                        placeholder='e.g. 15cm Vanilla'
                        value={v.name}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[idx] = { ...v, name: e.target.value };
                          setVariants(updated);
                        }}
                      />
                    </div>
                    <div>
                      {idx === 0 && (
                        <Label className='text-xs font-medium text-muted-foreground'>
                          SKU
                        </Label>
                      )}
                      <Input
                        className='h-8 text-xs font-mono'
                        placeholder='SKU'
                        value={v.sku}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[idx] = { ...v, sku: e.target.value };
                          setVariants(updated);
                        }}
                      />
                    </div>
                    <div>
                      {idx === 0 && (
                        <Label className='text-xs font-medium text-muted-foreground'>
                          Price
                        </Label>
                      )}
                      <Input
                        type='number'
                        className='h-8 text-xs'
                        placeholder='0'
                        value={v.price}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[idx] = {
                            ...v,
                            price: Number(e.target.value),
                          };
                          setVariants(updated);
                        }}
                      />
                    </div>
                    <div>
                      {idx === 0 && (
                        <Label className='text-xs font-medium text-muted-foreground'>
                          Stock
                        </Label>
                      )}
                      <Input
                        type='number'
                        className='h-8 text-xs'
                        placeholder='0'
                        value={v.stock}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[idx] = {
                            ...v,
                            stock: Number(e.target.value),
                          };
                          setVariants(updated);
                        }}
                      />
                    </div>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='h-8 w-8 p-0 text-muted-foreground hover:text-destructive'
                      onClick={() =>
                        setVariants(variants.filter((_, i) => i !== idx))
                      }
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* D) Options */}
          <div className='bg-card rounded-xl border border-border p-5 shadow-sm space-y-4'>
            <h2 className='font-serif text-sm font-semibold text-foreground pb-2 border-b border-border'>
              Catalog Filters
            </h2>
            {attributesLoading ? (
              <p className='text-xs text-muted-foreground'>Loading product filters...</p>
            ) : assignableAttributes.length === 0 ? (
              <p className='text-xs text-muted-foreground'>
                No filter attributes available yet. Create them in Product Filters
                before assigning them to products.
              </p>
            ) : (
              <div className='space-y-4'>
                {assignableAttributes.map((attribute: ProductAttribute) => {
                  const selectedValues = selectedAttributeValues[attribute.id] || [];

                  return (
                    <div key={attribute.id}>
                      <div className='mb-2'>
                        <p className='text-xs font-medium text-foreground'>
                          {attribute.name}
                        </p>
                        {attribute.description && (
                          <p className='mt-0.5 text-xs text-muted-foreground'>
                            {attribute.description}
                          </p>
                        )}
                      </div>
                      <div className='flex flex-wrap gap-2'>
                        {(attribute.values || []).map((value: ProductAttributeValue) => {
                          const isSelected = selectedValues.includes(value.id);
                          return (
                            <button
                              key={value.id}
                              type='button'
                              onClick={() => {
                                setSelectedAttributeValues((prev) => {
                                  const current = prev[attribute.id] || [];
                                  const nextValues =
                                    attribute.type === 'SELECT'
                                      ? isSelected
                                        ? []
                                        : [value.id]
                                      : isSelected
                                        ? current.filter((item) => item !== value.id)
                                        : [...current, value.id];

                                  return {
                                    ...prev,
                                    [attribute.id]: nextValues,
                                  };
                                });
                              }}
                              className={cn(
                                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                                isSelected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground',
                              )}
                            >
                              {value.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* E) SEO */}
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

          {isEdit && productId ? (
            <AuditLogList
              title='Product Audit History'
              logs={productAudit?.logs}
              isLoading={productAuditLoading}
              error={!!productAuditError}
              emptyText='No product audit entries yet.'
            />
          ) : null}
        </div>

        {/* Sticky action bar */}
        <div className='sticky bottom-0 left-0 right-0 bg-card border-t border-border py-3 flex items-center justify-between mt-6 -mx-4 md:-mx-6 px-4 md:px-6'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='text-xs h-8 text-muted-foreground'
            onClick={() => router.back()}
            disabled={createMutation.isPending || updateMutation.isPending || uploadingImages}
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
              disabled={createMutation.isPending || updateMutation.isPending || uploadingImages}
            >
              <Save size={12} />
              Save Draft
            </Button>
            <Button
              type='button'
              size='sm'
              className='text-xs h-8 gap-1.5'
              onClick={form.handleSubmit((values) => handleSave(values, true))}
              disabled={createMutation.isPending || updateMutation.isPending || uploadingImages}
            >
              {createMutation.isPending || updateMutation.isPending || uploadingImages ? (
                <>
                  <Loader2 className='h-3 w-3 animate-spin' />
                  {uploadingImages ? 'Uploading...' : 'Saving...'}
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
