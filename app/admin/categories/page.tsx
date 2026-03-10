'use client';

import { useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  ChevronRight,
  FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/hooks/admin/use-categories';
import type { Category } from '@/types/api.types';

/** Flatten tree into a list with depth info for search */
function flattenTree(
  categories: Category[],
  depth = 0,
): (Category & { depth: number })[] {
  const result: (Category & { depth: number })[] = [];
  for (const cat of categories) {
    result.push({ ...cat, depth });
    if (cat.children && cat.children.length > 0) {
      result.push(...flattenTree(cat.children, depth + 1));
    }
  }
  return result;
}

export default function CategoriesPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editCat, setEditCat] = useState<Category | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDisplayOrder, setFormDisplayOrder] = useState(0);
  const [formParentId, setFormParentId] = useState<string>('');

  // API hooks
  const { data: categories, isLoading, error } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  // Flatten for search + display
  const allFlat = flattenTree(categories || []);
  const filtered = allFlat.filter((c) => {
    if (!search) return true;
    return c.name.toLowerCase().includes(search.toLowerCase());
  });

  // For parent selector: all categories flattened (exclude current edit target and its children)
  const getDescendantIds = (catId: string): string[] => {
    const cat = allFlat.find((c) => c.id === catId);
    if (!cat?.children) return [];
    const ids: string[] = [];
    for (const child of cat.children) {
      ids.push(child.id);
      ids.push(...getDescendantIds(child.id));
    }
    return ids;
  };
  const excludeIds = editCat
    ? [editCat.id, ...getDescendantIds(editCat.id)]
    : [];
  const parentOptions = allFlat.filter((c) => !excludeIds.includes(c.id));

  const openCreate = (parentId?: string) => {
    setEditCat(null);
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormDisplayOrder(0);
    setFormParentId(parentId || '');
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditCat(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormDescription(cat.description || '');
    setFormDisplayOrder(cat.displayOrder);
    setFormParentId(cat.parentId || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    const slug = formSlug || formName.toLowerCase().replace(/\s+/g, '-');

    try {
      if (editCat) {
        await updateMutation.mutateAsync({
          id: editCat.id,
          data: {
            name: formName,
            slug,
            description: formDescription || undefined,
            parentId: formParentId || undefined,
            displayOrder: formDisplayOrder,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: formName,
          slug,
          description: formDescription || undefined,
          parentId: formParentId || undefined,
          displayOrder: formDisplayOrder,
        });
      }
      setDialogOpen(false);
    } catch {
      // Error handled by mutation/toast
    }
  };

  const handleDelete = async (id: string) => {
    const cat = allFlat.find((c) => c.id === id);
    if (cat && cat._count && cat._count.products > 0) {
      alert(
        `Cannot delete "${cat.name}" — it still has ${cat._count.products} products.`,
      );
      setDeleteId(null);
      return;
    }
    if (cat && cat.children && cat.children.length > 0) {
      alert(
        `Cannot delete "${cat.name}" — it still has ${cat.children.length} sub-categories. Delete or move them first.`,
      );
      setDeleteId(null);
      return;
    }
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteId(null);
    } catch {
      // Error handled by mutation/toast
    }
  };

  if (isLoading) {
    return (
      <AdminShell title='Categories'>
        <div className='flex items-center justify-center min-h-[400px]'>
          <Loader2 className='w-8 h-8 animate-spin text-primary' />
        </div>
      </AdminShell>
    );
  }

  if (error) {
    return (
      <AdminShell title='Categories'>
        <div className='flex items-center justify-center min-h-[400px]'>
          <p className='text-destructive'>Failed to load categories</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title='Categories'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>
            Categories
          </h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            {allFlat.length} categor{allFlat.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>
        <Button
          size='sm'
          className='h-8 text-xs gap-1.5'
          onClick={() => openCreate()}
        >
          <Plus size={13} />
          Add Category
        </Button>
      </div>

      {/* Filters */}
      <div className='flex flex-wrap gap-2 mb-4'>
        <div className='relative flex-1 min-w-48 max-w-xs'>
          <Search
            size={13}
            className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none'
          />
          <Input
            placeholder='Search categories...'
            className='pl-8 h-8 text-xs'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className='bg-card rounded-xl border border-border shadow-sm overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-border bg-muted/30'>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground'>
                Name
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell'>
                Slug
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell'>
                Description
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground'>
                Products
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground'>
                Order
              </th>
              <th className='px-5 py-3 w-24' />
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {filtered.map((cat) => (
              <tr key={cat.id} className='hover:bg-muted/20 transition-colors'>
                <td className='px-5 py-3.5'>
                  <div
                    className='flex items-center gap-2'
                    style={{ paddingLeft: `${cat.depth * 24}px` }}
                  >
                    {cat.depth > 0 && (
                      <ChevronRight
                        size={12}
                        className='text-muted-foreground/50'
                      />
                    )}
                    {cat.depth === 0 && (
                      <FolderOpen
                        size={14}
                        className='text-primary/60 shrink-0'
                      />
                    )}
                    <p className='text-xs font-medium text-foreground'>
                      {cat.name}
                    </p>
                    {!cat.isActive && (
                      <span className='px-1.5 py-0.5 rounded text-[9px] bg-muted text-muted-foreground'>
                        Inactive
                      </span>
                    )}
                  </div>
                </td>
                <td className='px-5 py-3.5 hidden sm:table-cell'>
                  <p className='text-xs text-muted-foreground font-mono'>
                    {cat.slug}
                  </p>
                </td>
                <td className='px-5 py-3.5 hidden md:table-cell'>
                  <p className='text-xs text-muted-foreground truncate max-w-[200px]'>
                    {cat.description || '—'}
                  </p>
                </td>
                <td className='px-5 py-3.5'>
                  <span className='text-xs text-muted-foreground'>
                    {cat._count?.products || 0}
                  </span>
                </td>
                <td className='px-5 py-3.5'>
                  <span className='text-xs text-muted-foreground'>
                    {cat.displayOrder}
                  </span>
                </td>
                <td className='px-5 py-3.5'>
                  <div className='flex items-center gap-1 justify-end'>
                    {cat.depth < 2 && (
                      <button
                        onClick={() => openCreate(cat.id)}
                        className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground'
                        title='Add sub-category'
                      >
                        <Plus size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(cat)}
                      className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground'
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteId(cat.id)}
                      className='p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive'
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className='text-center py-12'>
            <p className='text-sm text-muted-foreground'>No categories found</p>
          </div>
        )}
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle className='font-serif text-base'>
              {editCat ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-3 py-2'>
            <div>
              <Label className='text-xs font-medium'>Parent Category</Label>
              <Select
                value={formParentId || '_none'}
                onValueChange={(v) => setFormParentId(v === '_none' ? '' : v)}
              >
                <SelectTrigger className='h-9 text-xs mt-1.5'>
                  <SelectValue placeholder='None (root category)' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='_none' className='text-xs'>
                    None (root category)
                  </SelectItem>
                  {parentOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id} className='text-xs'>
                      {'—'.repeat(c.depth)} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className='text-xs font-medium'>Name</Label>
              <Input
                className='h-9 text-sm mt-1.5'
                placeholder='Category name'
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (!editCat) {
                    setFormSlug(
                      e.target.value.toLowerCase().replace(/\s+/g, '-'),
                    );
                  }
                }}
              />
            </div>
            <div>
              <Label className='text-xs font-medium'>Slug</Label>
              <Input
                className='h-9 text-xs mt-1.5 font-mono'
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
              />
            </div>
            <div>
              <Label className='text-xs font-medium'>Description</Label>
              <Input
                className='h-9 text-sm mt-1.5'
                placeholder='Optional description'
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div>
              <Label className='text-xs font-medium'>Display Order</Label>
              <Input
                type='number'
                className='h-9 text-sm mt-1.5 w-24'
                value={formDisplayOrder}
                onChange={(e) =>
                  setFormDisplayOrder(parseInt(e.target.value) || 0)
                }
              />
            </div>
          </div>
          <DialogFooter className='gap-2'>
            <Button
              variant='outline'
              size='sm'
              className='text-xs h-8'
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size='sm'
              className='text-xs h-8'
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className='w-3 h-3 animate-spin mr-1' />
              ) : null}
              {editCat ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='font-serif text-base'>
              Delete Category?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>
              This will permanently remove the category. Make sure no products
              or sub-categories are assigned to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='text-xs h-8'>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className='text-xs h-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground'
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className='w-3 h-3 animate-spin mr-1' />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
