'use client';

import { useMemo, useState } from 'react';
import { Edit, Loader2, Plus, Tags, Trash2 } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useCreateProductAttribute,
  useDeleteProductAttribute,
  useProductAttributes,
  useUpdateProductAttribute,
} from '@/hooks/admin/use-product-attributes';
import type { ProductAttribute, ProductAttributeType } from '@/types/api.types';
import { slugify as normalizeSlug } from '@/lib/slug';

const OPTION_TYPES: ProductAttributeType[] = ['SELECT', 'MULTI_SELECT'];
const ALL_TYPES: ProductAttributeType[] = [
  'SELECT',
  'MULTI_SELECT',
  'TEXT',
  'NUMBER',
  'BOOLEAN',
];

export default function ProductAttributesPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProductAttribute | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<ProductAttributeType>('MULTI_SELECT');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');
  const [isRequired, setIsRequired] = useState(false);
  const [isFilterable, setIsFilterable] = useState(true);
  const [isVariantAxis, setIsVariantAxis] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [valuesText, setValuesText] = useState('');

  const { data, isLoading, error } = useProductAttributes();
  const createMutation = useCreateProductAttribute();
  const updateMutation = useUpdateProductAttribute();
  const deleteMutation = useDeleteProductAttribute();

  const attributes = useMemo(() => {
    const source = data ?? [];
    if (!search.trim()) return source;

    const q = search.toLowerCase();
    return source.filter(
      (attribute) =>
        attribute.name.toLowerCase().includes(q) ||
        attribute.code.toLowerCase().includes(q) ||
        attribute.slug.toLowerCase().includes(q),
    );
  }, [data, search]);

  function resetForm() {
    setEditing(null);
    setName('');
    setSlug('');
    setCode('');
    setType('MULTI_SELECT');
    setDescription('');
    setDisplayOrder('0');
    setIsRequired(false);
    setIsFilterable(true);
    setIsVariantAxis(false);
    setIsActive(true);
    setValuesText('');
  }

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(attribute: ProductAttribute) {
    setEditing(attribute);
    setName(attribute.name);
    setSlug(attribute.slug);
    setCode(attribute.code);
    setType(attribute.type);
    setDescription(attribute.description || '');
    setDisplayOrder(String(attribute.displayOrder));
    setIsRequired(attribute.isRequired);
    setIsFilterable(attribute.isFilterable);
    setIsVariantAxis(attribute.isVariantAxis);
    setIsActive(attribute.isActive);
    setValuesText(
      (attribute.values ?? []).map((value) => value.label).join('\n'),
    );
    setDialogOpen(true);
  }

  async function handleSave() {
    const payload = {
      name: name.trim(),
      slug: normalizeSlug(slug.trim()),
      code: code.trim(),
      type,
      description: description.trim() || undefined,
      displayOrder: Number(displayOrder) || 0,
      isRequired,
      isFilterable,
      isVariantAxis,
      isActive,
      values: OPTION_TYPES.includes(type)
        ? valuesText
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((label, index) => ({
              label,
              value: label,
              slug: normalizeSlug(label),
              displayOrder: index,
              isActive: true,
            }))
        : [],
    };

    if (editing) {
      await updateMutation.mutateAsync({
        id: editing.id,
        data: payload,
      });
    } else {
      await createMutation.mutateAsync(payload);
    }

    setDialogOpen(false);
    resetForm();
  }

  async function handleDelete() {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  }

  if (isLoading) {
    return (
      <div className='flex min-h-[320px] items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex min-h-[320px] items-center justify-center text-sm text-destructive'>
        Failed to load product filters
      </div>
    );
  }

  return (
    <>
      <div className='mb-6 flex items-center justify-between gap-4'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>
            Product Filters
          </h1>
          <p className='mt-0.5 text-xs text-muted-foreground'>
            Manage dynamic product attributes and values for storefront
            filtering.
          </p>
        </div>
        <Button
          size='sm'
          className='h-8 gap-1.5 text-xs'
          onClick={openCreateDialog}
        >
          <Plus size={13} />
          Add Filter
        </Button>
      </div>

      <div className='mb-4 max-w-sm'>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder='Search filters by name, code, or slug'
          className='h-9 text-sm'
        />
      </div>

      {attributes.length === 0 ? (
        <div className='rounded-xl border border-border bg-card p-12 text-center'>
          <div className='mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted'>
            <Tags size={20} className='text-muted-foreground' />
          </div>
          <p className='text-sm font-medium text-foreground'>
            No filters found
          </p>
          <p className='mt-1 text-xs text-muted-foreground'>
            Create your first dynamic filter group for products.
          </p>
        </div>
      ) : (
        <div className='overflow-hidden rounded-xl border border-border bg-card shadow-sm'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-border bg-muted/30'>
                <th className='px-4 py-3 text-left text-xs font-medium text-muted-foreground'>
                  Attribute
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-muted-foreground'>
                  Type
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-muted-foreground'>
                  Values
                </th>
                <th className='px-4 py-3 text-left text-xs font-medium text-muted-foreground'>
                  Status
                </th>
                <th className='px-4 py-3 text-right text-xs font-medium text-muted-foreground'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border'>
              {attributes.map((attribute) => (
                <tr key={attribute.id} className='hover:bg-muted/20'>
                  <td className='px-4 py-4 align-top'>
                    <div>
                      <p className='text-sm font-medium text-foreground'>
                        {attribute.name}
                      </p>
                      <p className='mt-1 text-[11px] font-mono text-muted-foreground'>
                        {attribute.code} · {attribute.slug}
                      </p>
                    </div>
                  </td>
                  <td className='px-4 py-4 align-top'>
                    <span className='rounded-full border border-border px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground'>
                      {attribute.type}
                    </span>
                  </td>
                  <td className='px-4 py-4 align-top'>
                    <div className='flex flex-wrap gap-1.5'>
                      {(attribute.values ?? []).length > 0 ? (
                        attribute.values!.map((value) => (
                          <span
                            key={value.id}
                            className='rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary'
                          >
                            {value.label}
                          </span>
                        ))
                      ) : (
                        <span className='text-xs text-muted-foreground'>
                          Typed value
                        </span>
                      )}
                    </div>
                  </td>
                  <td className='px-4 py-4 align-top'>
                    <div className='space-y-1 text-[11px] text-muted-foreground'>
                      <p>{attribute.isActive ? 'Active' : 'Inactive'}</p>
                      <p>{attribute.isFilterable ? 'Filterable' : 'Hidden'}</p>
                    </div>
                  </td>
                  <td className='px-4 py-4 align-top'>
                    <div className='flex justify-end gap-1'>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='h-8 w-8 p-0'
                        onClick={() => openEditDialog(attribute)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='h-8 w-8 p-0 text-destructive hover:text-destructive'
                        onClick={() => setDeleteId(attribute.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle className='font-serif text-base'>
              {editing ? 'Edit Product Filter' : 'Add Product Filter'}
            </DialogTitle>
          </DialogHeader>

          <div className='grid gap-4 py-2 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label className='text-xs font-medium'>Name</Label>
              <Input
                value={name}
                onChange={(event) => {
                  const next = event.target.value;
                  setName(next);
                  if (!editing) {
                    setSlug(normalizeSlug(next));
                    setCode(normalizeSlug(next).replace(/-/g, '_'));
                  }
                }}
                placeholder='Decoration'
                className='h-9 text-sm'
              />
            </div>
            <div className='space-y-2'>
              <Label className='text-xs font-medium'>Type</Label>
              <Select
                value={type}
                onValueChange={(value) =>
                  setType(value as ProductAttributeType)
                }
              >
                <SelectTrigger className='h-9 text-sm'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_TYPES.map((option) => (
                    <SelectItem key={option} value={option} className='text-sm'>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label className='text-xs font-medium'>Slug</Label>
              <Input
                value={slug}
                onChange={(event) => setSlug(normalizeSlug(event.target.value))}
                placeholder='decoration'
                className='h-9 font-mono text-sm'
              />
            </div>
            <div className='space-y-2'>
              <Label className='text-xs font-medium'>Code</Label>
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder='decoration'
                className='h-9 font-mono text-sm'
              />
            </div>
            <div className='space-y-2 md:col-span-2'>
              <Label className='text-xs font-medium'>Description</Label>
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder='Optional description for admin reference'
                className='h-9 text-sm'
              />
            </div>
            <div className='space-y-2'>
              <Label className='text-xs font-medium'>Display order</Label>
              <Input
                type='number'
                value={displayOrder}
                onChange={(event) => setDisplayOrder(event.target.value)}
                className='h-9 text-sm'
              />
            </div>
            <div className='grid grid-cols-2 gap-3 md:grid-cols-4 md:col-span-2'>
              <div className='flex items-center justify-between rounded-lg border border-border px-3 py-2'>
                <Label className='text-xs'>Active</Label>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
              <div className='flex items-center justify-between rounded-lg border border-border px-3 py-2'>
                <Label className='text-xs'>Filterable</Label>
                <Switch
                  checked={isFilterable}
                  onCheckedChange={setIsFilterable}
                />
              </div>
              <div className='flex items-center justify-between rounded-lg border border-border px-3 py-2'>
                <Label className='text-xs'>Required</Label>
                <Switch checked={isRequired} onCheckedChange={setIsRequired} />
              </div>
              <div className='flex items-center justify-between rounded-lg border border-border px-3 py-2'>
                <Label className='text-xs'>Variant axis</Label>
                <Switch
                  checked={isVariantAxis}
                  onCheckedChange={setIsVariantAxis}
                />
              </div>
            </div>
            <div className='space-y-2 md:col-span-2'>
              <Label className='text-xs font-medium'>Values</Label>
              <Textarea
                value={valuesText}
                onChange={(event) => setValuesText(event.target.value)}
                rows={7}
                disabled={!OPTION_TYPES.includes(type)}
                placeholder={
                  OPTION_TYPES.includes(type)
                    ? 'One value per line, e.g.\nHoa kem\nTrai cay\nNhan vat noi'
                    : 'Typed attributes do not use predefined values'
                }
                className='text-sm'
              />
            </div>
          </div>

          <DialogFooter className='gap-2'>
            <Button
              variant='outline'
              size='sm'
              className='h-8 text-xs'
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size='sm'
              className='h-8 text-xs'
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className='mr-1 h-3 w-3 animate-spin' />
              )}
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='font-serif text-base'>
              Delete product filter?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>
              This will remove the attribute, its values, and any product
              assignments tied to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='h-8 text-xs'>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className='h-8 bg-destructive text-xs text-destructive-foreground hover:bg-destructive/90'
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className='mr-1 h-3 w-3 animate-spin' />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
