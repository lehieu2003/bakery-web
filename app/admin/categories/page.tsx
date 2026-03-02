'use client';

import { useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { Plus, Search, Edit, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mockCategories, Category, ProductType } from '@/lib/admin-data';
import { cn } from '@/lib/utils';

type TypeFilter = 'ALL' | ProductType;

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editCat, setEditCat] = useState<Category | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formType, setFormType] = useState<ProductType>('CAKE');

  const filtered = categories.filter((c) => {
    const matchSearch =
      !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'ALL' || c.type === typeFilter;
    return matchSearch && matchType;
  });

  const openCreate = () => {
    setEditCat(null);
    setFormName('');
    setFormSlug('');
    setFormType('CAKE');
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditCat(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormType(cat.type);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) return;
    const slug = formSlug || formName.toLowerCase().replace(/\s+/g, '-');
    if (editCat) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editCat.id ? { ...c, name: formName, slug, type: formType } : c,
        ),
      );
    } else {
      setCategories((prev) => [
        ...prev,
        {
          id: `c${Date.now()}`,
          name: formName,
          slug,
          type: formType,
          productCount: 0,
        },
      ]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (cat && cat.productCount > 0) {
      alert(`Cannot delete "${cat.name}" — it still has ${cat.productCount} products.`);
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setDeleteId(null);
  };

  return (
    <AdminShell title='Categories'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>Categories</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            {filtered.length} categor{filtered.length !== 1 ? 'ies' : 'y'}
          </p>
        </div>
        <Button size='sm' className='h-8 text-xs gap-1.5' onClick={openCreate}>
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
        <div className='flex rounded-lg border border-border overflow-hidden bg-card'>
          {(['ALL', 'CAKE', 'INGREDIENT'] as TypeFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                typeFilter === t
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {t === 'ALL' ? 'All' : t}
            </button>
          ))}
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
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground'>
                Type
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground'>
                Products
              </th>
              <th className='px-5 py-3 w-20' />
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {filtered.map((cat) => (
              <tr key={cat.id} className='hover:bg-muted/20 transition-colors'>
                <td className='px-5 py-3.5'>
                  <p className='text-xs font-medium text-foreground'>{cat.name}</p>
                </td>
                <td className='px-5 py-3.5 hidden sm:table-cell'>
                  <p className='text-xs text-muted-foreground font-mono'>{cat.slug}</p>
                </td>
                <td className='px-5 py-3.5'>
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border',
                      cat.type === 'CAKE'
                        ? 'bg-pink-50 text-pink-700 border-pink-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200',
                    )}
                  >
                    {cat.type}
                  </span>
                </td>
                <td className='px-5 py-3.5'>
                  <span className='text-xs text-muted-foreground'>{cat.productCount}</span>
                </td>
                <td className='px-5 py-3.5'>
                  <div className='flex items-center gap-1 justify-end'>
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
              <Label className='text-xs font-medium'>Name</Label>
              <Input
                className='h-9 text-sm mt-1.5'
                placeholder='Category name'
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  setFormSlug(
                    e.target.value.toLowerCase().replace(/\s+/g, '-'),
                  );
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
              <Label className='text-xs font-medium mb-1.5 block'>Type</Label>
              <div className='flex gap-2'>
                {(['CAKE', 'INGREDIENT'] as ProductType[]).map((t) => (
                  <button
                    key={t}
                    type='button'
                    onClick={() => setFormType(t)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      formType === t
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border hover:border-primary/40',
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
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
            <Button size='sm' className='text-xs h-8' onClick={handleSave}>
              {editCat ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='font-serif text-base'>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>
              This will permanently remove the category. Make sure no products are assigned to it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='text-xs h-8'>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='text-xs h-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground'
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
