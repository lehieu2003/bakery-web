'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  ChevronRight,
  FolderOpen,
  GripVertical,
  Save,
  RotateCcw,
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
  categoryKeys,
} from '@/hooks/admin/use-categories';
import { useQueryClient } from '@tanstack/react-query';
import { ImageUpload } from '@/components/image-upload';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable, isSortable } from '@dnd-kit/react/sortable';
import { toast } from 'sonner';
import type { Category } from '@/types/api.types';

/** Flatten tree into a list with depth info */
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

// ---------- Sortable Row ----------
function SortableCategoryRow({
  cat,
  index,
  isDraggable,
  onEdit,
  onDelete,
  onAddChild,
}: {
  cat: Category & { depth: number };
  index: number;
  isDraggable: boolean;
  onEdit: (c: Category) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: cat.id,
    index,
    disabled: !isDraggable,
  });

  return (
    <tr
      ref={ref}
      className={`border-b border-border transition-colors ${
        isDragging
          ? 'bg-primary/5 shadow-lg ring-1 ring-primary/20 opacity-80'
          : 'hover:bg-muted/20'
      }`}
    >
      {/* Drag handle */}
      <td className='px-3 py-3.5 w-8'>
        {isDraggable ? (
          <button
            ref={handleRef}
            className='p-1 rounded text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none'
            aria-label='Kéo để sắp xếp'
          >
            <GripVertical size={14} />
          </button>
        ) : (
          <span className='block w-6' />
        )}
      </td>

      {/* Image */}
      <td className='px-3 py-3.5 w-12'>
        {cat.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cat.imageUrl}
            alt={cat.name}
            className='w-9 h-9 rounded-md object-cover border border-border'
          />
        ) : (
          <div className='w-9 h-9 rounded-md bg-muted flex items-center justify-center'>
            <FolderOpen size={14} className='text-muted-foreground/40' />
          </div>
        )}
      </td>

      {/* Name */}
      <td className='px-4 py-3.5'>
        <div
          className='flex items-center gap-2'
          style={{ paddingLeft: `${cat.depth * 20}px` }}
        >
          {cat.depth > 0 && (
            <ChevronRight size={12} className='text-muted-foreground/50 shrink-0' />
          )}
          {cat.depth === 0 && (
            <FolderOpen size={14} className='text-primary/60 shrink-0' />
          )}
          <p className='text-xs font-medium text-foreground'>{cat.name}</p>
          {!cat.isActive && (
            <span className='px-1.5 py-0.5 rounded text-[9px] bg-muted text-muted-foreground'>
              Inactive
            </span>
          )}
        </div>
      </td>

      {/* Slug */}
      <td className='px-4 py-3.5 hidden sm:table-cell'>
        <p className='text-xs text-muted-foreground font-mono'>{cat.slug}</p>
      </td>

      {/* Description */}
      <td className='px-4 py-3.5 hidden md:table-cell'>
        <p className='text-xs text-muted-foreground truncate max-w-[180px]'>
          {cat.description || '—'}
        </p>
      </td>

      {/* Products */}
      <td className='px-4 py-3.5'>
        <span className='text-xs text-muted-foreground'>
          {cat._count?.products || 0}
        </span>
      </td>

      {/* Order */}
      <td className='px-4 py-3.5'>
        <span className='text-xs text-muted-foreground tabular-nums'>
          {cat.displayOrder}
        </span>
      </td>

      {/* Actions */}
      <td className='px-4 py-3.5'>
        <div className='flex items-center gap-1 justify-end'>
          {cat.depth < 2 && (
            <button
              onClick={() => onAddChild(cat.id)}
              className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground'
              title='Thêm danh mục con'
            >
              <Plus size={13} />
            </button>
          )}
          <button
            onClick={() => onEdit(cat)}
            className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground'
          >
            <Edit size={13} />
          </button>
          <button
            onClick={() => onDelete(cat.id)}
            className='p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive'
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ---------- Main Page ----------
export default function CategoriesPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editCat, setEditCat] = useState<Category | null>(null);

  // DnD reorder state — only root categories are draggable
  const [sortedRoots, setSortedRoots] = useState<Category[]>([]);
  const [hasReordered, setHasReordered] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDisplayOrder, setFormDisplayOrder] = useState(0);
  const [formParentId, setFormParentId] = useState<string>('');
  const [formImageUrl, setFormImageUrl] = useState<string>('');

  const queryClient = useQueryClient();

  // API hooks
  const { data: categories, isLoading, error } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  // Sync sorted roots when server data arrives (and no pending reorder)
  useEffect(() => {
    if (categories && !hasReordered) {
      setSortedRoots([...categories]);
    }
  }, [categories, hasReordered]);

  // Build flat list from sortedRoots (preserving DnD order for roots)
  const allFlat = flattenTree(sortedRoots);

  const filtered = search
    ? allFlat.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : allFlat;

  // Move root categories in local state
  const moveRoot = useCallback((fromIndex: number, toIndex: number) => {
    setSortedRoots((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setHasReordered(true);
  }, []);

  // Parent options for form (exclude current + descendants)
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
  const excludeIds = editCat ? [editCat.id, ...getDescendantIds(editCat.id)] : [];
  const parentOptions = allFlat.filter((c) => !excludeIds.includes(c.id));

  const openCreate = (parentId?: string) => {
    setEditCat(null);
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormDisplayOrder(0);
    setFormParentId(parentId || '');
    setFormImageUrl('');
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditCat(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormDescription(cat.description || '');
    setFormDisplayOrder(cat.displayOrder);
    setFormParentId(cat.parentId || '');
    setFormImageUrl(cat.imageUrl || '');
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
            imageUrl: formImageUrl || undefined,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: formName,
          slug,
          description: formDescription || undefined,
          parentId: formParentId || undefined,
          displayOrder: formDisplayOrder,
          imageUrl: formImageUrl || undefined,
        });
      }
      setDialogOpen(false);
      setHasReordered(false);
    } catch {
      // Error handled by mutation/toast
    }
  };

  const handleDelete = async (id: string) => {
    const cat = allFlat.find((c) => c.id === id);
    if (cat && cat._count && cat._count.products > 0) {
      toast.error(`Không thể xóa "${cat.name}" — còn ${cat._count.products} sản phẩm.`);
      setDeleteId(null);
      return;
    }
    if (cat && cat.children && cat.children.length > 0) {
      toast.error(`Không thể xóa "${cat.name}" — còn ${cat.children.length} danh mục con.`);
      setDeleteId(null);
      return;
    }
    try {
      await deleteMutation.mutateAsync(id);
      setDeleteId(null);
      setHasReordered(false);
    } catch {
      // Error handled by mutation/toast
    }
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    try {
      const items = sortedRoots.map((c, i) => ({ id: c.id, displayOrder: i + 1 }));
      const res = await fetch('/api/admin/categories/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error('Failed');

      const updatedRoots = sortedRoots.map((c, i) => ({
        ...c,
        displayOrder: i + 1,
      }));
      queryClient.setQueryData(categoryKeys.list(), updatedRoots);
      setSortedRoots(updatedRoots);
      setHasReordered(false);
      toast.success('Thứ tự danh mục đã được lưu');
    } catch {
      toast.error('Không thể lưu thứ tự');
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleCancelOrder = () => {
    if (categories) setSortedRoots([...categories]);
    setHasReordered(false);
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

  // When searching, disable DnD (order is mixed up by filter)
  const isDndDisabled = !!search;

  return (
    <AdminShell title='Categories'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>
            Categories
          </h1>
          <p className='text-xs text-muted-foreground mt-0.5 flex items-center gap-1'>
            {allFlat.length} danh mục
            {!isDndDisabled && (
              <>
                <span className='text-muted-foreground/60'>&mdash;</span>
                <GripVertical size={11} className='inline text-muted-foreground/60' />
                <span>kéo thả để sắp xếp danh mục gốc</span>
              </>
            )}
          </p>
        </div>

        <div className='flex items-center gap-2'>
          {hasReordered && (
            <>
              <Button
                variant='outline'
                size='sm'
                className='h-8 text-xs gap-1.5'
                onClick={handleCancelOrder}
                disabled={isSavingOrder}
              >
                <RotateCcw size={12} />
                Huỷ
              </Button>
              <Button
                size='sm'
                className='h-8 text-xs gap-1.5'
                onClick={handleSaveOrder}
                disabled={isSavingOrder}
              >
                {isSavingOrder ? (
                  <Loader2 size={12} className='animate-spin' />
                ) : (
                  <Save size={12} />
                )}
                Lưu thứ tự
              </Button>
            </>
          )}
          <Button
            size='sm'
            className='h-8 text-xs gap-1.5'
            onClick={() => openCreate()}
          >
            <Plus size={13} />
            Add Category
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className='flex flex-wrap gap-2 mb-4'>
        <div className='relative flex-1 min-w-48 max-w-xs'>
          <Search
            size={13}
            className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none'
          />
          <Input
            placeholder='Tìm danh mục...'
            className='pl-8 h-8 text-xs'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {search && (
          <p className='text-xs text-muted-foreground self-center'>
            Tắt tìm kiếm để bật kéo thả
          </p>
        )}
      </div>

      {/* Table — DragDropProvider is always mounted to avoid useInsertionEffect issues */}
      <DragDropProvider
        onDragEnd={({ canceled, operation }) => {
          if (canceled) return;
          const { source } = operation;
          if (!isSortable(source)) return;
          const { initialIndex, index } = source.sortable;
          if (initialIndex === index) return;
          moveRoot(initialIndex, index);
        }}
      >
        <div className='bg-card rounded-xl border border-border shadow-sm overflow-hidden'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-border bg-muted/30'>
                <th className='px-3 py-3 w-8' />
                <th className='text-left px-3 py-3 text-xs font-medium text-muted-foreground w-12'>
                  Ảnh
                </th>
                <th className='text-left px-4 py-3 text-xs font-medium text-muted-foreground'>
                  Tên
                </th>
                <th className='text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell'>
                  Slug
                </th>
                <th className='text-left px-4 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell'>
                  Mô tả
                </th>
                <th className='text-left px-4 py-3 text-xs font-medium text-muted-foreground'>
                  SP
                </th>
                <th className='text-left px-4 py-3 text-xs font-medium text-muted-foreground'>
                  Thứ tự
                </th>
                <th className='px-4 py-3 w-28' />
              </tr>
            </thead>
            <tbody className='divide-y divide-border'>
              {filtered.map((cat, index) => (
                <SortableCategoryRow
                  key={cat.id}
                  cat={cat}
                  index={index}
                  isDraggable={cat.depth === 0 && !isDndDisabled}
                  onEdit={openEdit}
                  onDelete={(id) => setDeleteId(id)}
                  onAddChild={openCreate}
                />
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className='text-center py-12'>
              <p className='text-sm text-muted-foreground'>Không tìm thấy danh mục</p>
            </div>
          )}
        </div>
      </DragDropProvider>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-w-sm'>
          <DialogHeader>
            <DialogTitle className='font-serif text-base'>
              {editCat ? 'Sửa danh mục' : 'Thêm danh mục'}
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-3 py-2'>
            <div>
              <Label className='text-xs font-medium'>Ảnh danh mục</Label>
              <div className='mt-1.5'>
                <ImageUpload
                  folder='categories'
                  currentImage={formImageUrl || undefined}
                  onUploadComplete={(url) => setFormImageUrl(url)}
                  onDelete={() => setFormImageUrl('')}
                  className='[&>button]:h-32 [&_.relative]:h-32'
                />
              </div>
            </div>
            <div>
              <Label className='text-xs font-medium'>Danh mục cha</Label>
              <Select
                value={formParentId || '_none'}
                onValueChange={(v) => setFormParentId(v === '_none' ? '' : v)}
              >
                <SelectTrigger className='h-9 text-xs mt-1.5'>
                  <SelectValue placeholder='Không có (danh mục gốc)' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='_none' className='text-xs'>
                    Không có (danh mục gốc)
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
              <Label className='text-xs font-medium'>Tên</Label>
              <Input
                className='h-9 text-sm mt-1.5'
                placeholder='Tên danh mục'
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (!editCat) {
                    setFormSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
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
              <Label className='text-xs font-medium'>Mô tả</Label>
              <Input
                className='h-9 text-sm mt-1.5'
                placeholder='Mô tả (tuỳ chọn)'
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div>
              <Label className='text-xs font-medium'>Thứ tự hiển thị</Label>
              <Input
                type='number'
                className='h-9 text-sm mt-1.5 w-24'
                value={formDisplayOrder}
                onChange={(e) => setFormDisplayOrder(parseInt(e.target.value) || 0)}
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
              Huỷ
            </Button>
            <Button
              size='sm'
              className='text-xs h-8'
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className='w-3 h-3 animate-spin mr-1' />
              )}
              {editCat ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='font-serif text-base'>
              Xoá danh mục?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>
              Danh mục sẽ bị xoá vĩnh viễn. Đảm bảo không còn sản phẩm hoặc
              danh mục con bên trong.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='text-xs h-8'>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              className='text-xs h-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground'
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className='w-3 h-3 animate-spin mr-1' />
              )}
              Xoá
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
