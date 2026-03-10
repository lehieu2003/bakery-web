'use client';

import { useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { Plus, Edit, Trash2, Loader2, ListTree } from 'lucide-react';
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
  useBlogCategories,
  useCreateBlogCategory,
  useUpdateBlogCategory,
  useDeleteBlogCategory,
} from '@/hooks/admin/use-blog-categories';
import type { BlogCategory } from '@/types/api.types';

export default function BlogCategoriesAdminPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState<BlogCategory | null>(null);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formOrder, setFormOrder] = useState(0);
  const [formActive, setFormActive] = useState(true);

  const { data, isLoading, error } = useBlogCategories();
  const createMutation = useCreateBlogCategory();
  const updateMutation = useUpdateBlogCategory();
  const deleteMutation = useDeleteBlogCategory();
  const categories: BlogCategory[] = data?.categories || [];

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/\[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const openCreate = () => {
    setEditCategory(null);
    setFormName('');
    setFormSlug('');
    setFormDesc('');
    setFormImageUrl('');
    setFormOrder(0);
    setFormActive(true);
    setDialogOpen(true);
  };

  const openEdit = (cat: BlogCategory) => {
    setEditCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormDesc(cat.description || '');
    setFormImageUrl(cat.imageUrl || '');
    setFormOrder(cat.displayOrder || 0);
    setFormActive(cat.isActive);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formSlug.trim()) return;
    const payload = {
      name: formName,
      slug: formSlug,
      description: formDesc || undefined,
      imageUrl: formImageUrl || undefined,
      displayOrder: formOrder,
      isActive: formActive,
    };
    try {
      if (editCategory) {
        await updateMutation.mutateAsync({ id: editCategory.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setDialogOpen(false);
    } catch {}
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {}
  };

  if (isLoading) {
    return (
      <AdminShell title='Blog Categories'>
        <div className='flex items-center justify-center min-h-[400px]'>
          <Loader2 className='w-8 h-8 animate-spin text-primary' />
        </div>
      </AdminShell>
    );
  }

  if (error) {
    return (
      <AdminShell title='Blog Categories'>
        <div className='flex items-center justify-center min-h-[400px]'>
          <p className='text-destructive'>Không thể tải danh mục</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title='Blog Categories'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>Danh mục Blog</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>{categories.length} danh mục</p>
        </div>
        <Button size='sm' className='h-8 text-xs gap-1.5' onClick={openCreate}>
          <Plus size={13} /> Thêm danh mục
        </Button>
      </div>
      <div className='bg-card rounded-xl border border-border shadow-sm overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-border bg-muted/30'>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground'>Tên</th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground'>Slug</th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground'>Mô tả</th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground'>Thứ tự</th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground'>Kích hoạt</th>
              <th className='px-5 py-3 w-24' />
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {categories.map((cat) => (
              <tr key={cat.id} className='hover:bg-muted/20 transition-colors'>
                <td className='px-5 py-3.5'>{cat.name}</td>
                <td className='px-5 py-3.5 font-mono text-xs'>{cat.slug}</td>
                <td className='px-5 py-3.5 text-xs text-muted-foreground'>{cat.description || '—'}</td>
                <td className='px-5 py-3.5 text-xs'>{cat.displayOrder}</td>
                <td className='px-5 py-3.5 text-xs'>{cat.isActive ? 'Có' : 'Không'}</td>
                <td className='px-5 py-3.5'>
                  <div className='flex items-center gap-1 justify-end'>
                    <button onClick={() => openEdit(cat)} className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground'>
                      <Edit size={13} />
                    </button>
                    <button onClick={() => setDeleteId(cat.id)} className='p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive'>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {categories.length === 0 && (
        <div className='text-center py-16 bg-card rounded-xl border border-border mt-4'>
          <p className='text-sm text-muted-foreground'>Chưa có danh mục nào</p>
        </div>
      )}
      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle className='font-serif text-base'>
              {editCategory ? 'Sửa danh mục' : 'Thêm danh mục'}
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            <div>
              <Label className='text-xs font-medium'>Tên *</Label>
              <Input
                className='h-8 text-xs mt-1.5'
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (!editCategory) setFormSlug(generateSlug(e.target.value));
                }}
                placeholder='Tên danh mục'
              />
            </div>
            <div>
              <Label className='text-xs font-medium'>Slug *</Label>
              <Input
                className='h-8 text-xs mt-1.5 font-mono'
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder='danh-muc-blog'
              />
            </div>
            <div>
              <Label className='text-xs font-medium'>Mô tả</Label>
              <Input
                className='h-8 text-xs mt-1.5'
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder='Mô tả ngắn...'
              />
            </div>
            <div>
              <Label className='text-xs font-medium'>Ảnh (URL)</Label>
              <Input
                className='h-8 text-xs mt-1.5'
                value={formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
                placeholder='https://...'
              />
            </div>
            <div>
              <Label className='text-xs font-medium'>Thứ tự hiển thị</Label>
              <Input
                className='h-8 text-xs mt-1.5'
                type='number'
                value={formOrder}
                onChange={(e) => setFormOrder(Number(e.target.value))}
                placeholder='0'
              />
            </div>
            <div>
              <Label className='text-xs font-medium'>Kích hoạt</Label>
              <input
                type='checkbox'
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className='ml-2 scale-110 align-middle'
              />
            </div>
          </div>
          <DialogFooter className='gap-2'>
            <Button variant='outline' size='sm' className='text-xs h-8' onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button size='sm' className='text-xs h-8' onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className='w-3 h-3 animate-spin mr-1' />}
              {editCategory ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='font-serif text-base'>Xóa danh mục?</AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>Danh mục sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='text-xs h-8'>Hủy</AlertDialogCancel>
            <AlertDialogAction className='text-xs h-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground' onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className='w-3 h-3 animate-spin mr-1' />}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
