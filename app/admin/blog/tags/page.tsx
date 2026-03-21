'use client';

import { useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
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
  useBlogTags,
  useCreateBlogTag,
  useUpdateBlogTag,
  useDeleteBlogTag,
} from '@/hooks/admin/use-blog-tags';
import type { BlogTag } from '@/types/api.types';
import { slugify } from '@/lib/slug';

export default function BlogTagsAdminPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editTag, setEditTag] = useState<BlogTag | null>(null);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');

  const { data, isLoading, error } = useBlogTags();
  const createMutation = useCreateBlogTag();
  const updateMutation = useUpdateBlogTag();
  const deleteMutation = useDeleteBlogTag();
  const tags: BlogTag[] = data?.tags || [];

  const openCreate = () => {
    setEditTag(null);
    setFormName('');
    setFormSlug('');
    setDialogOpen(true);
  };

  const openEdit = (tag: BlogTag) => {
    setEditTag(tag);
    setFormName(tag.name);
    setFormSlug(tag.slug);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    const payload = {
      name: formName,
      slug: slugify(formSlug || formName),
    };
    try {
      if (editTag) {
        await updateMutation.mutateAsync({ id: editTag.id, data: payload });
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
      <AdminShell title='Blog Tags'>
        <div className='flex items-center justify-center min-h-[400px]'>
          <Loader2 className='w-8 h-8 animate-spin text-primary' />
        </div>
      </AdminShell>
    );
  }

  if (error) {
    return (
      <AdminShell title='Blog Tags'>
        <div className='flex items-center justify-center min-h-[400px]'>
          <p className='text-destructive'>Không thể tải tags</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title='Blog Tags'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>Tags Blog</h1>
          <p className='text-xs text-muted-foreground mt-0.5'>{tags.length} tag</p>
        </div>
        <Button size='sm' className='h-8 text-xs gap-1.5' onClick={openCreate}>
          <Plus size={13} /> Thêm tag
        </Button>
      </div>
      <div className='bg-card rounded-xl border border-border shadow-sm overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-border bg-muted/30'>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground'>Tên</th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground'>Slug</th>
              <th className='px-5 py-3 w-24' />
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {tags.map((tag) => (
              <tr key={tag.id} className='hover:bg-muted/20 transition-colors'>
                <td className='px-5 py-3.5'>{tag.name}</td>
                <td className='px-5 py-3.5 font-mono text-xs'>{tag.slug}</td>
                <td className='px-5 py-3.5'>
                  <div className='flex items-center gap-1 justify-end'>
                    <button onClick={() => openEdit(tag)} className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground'>
                      <Edit size={13} />
                    </button>
                    <button onClick={() => setDeleteId(tag.id)} className='p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive'>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tags.length === 0 && (
        <div className='text-center py-16 bg-card rounded-xl border border-border mt-4'>
          <p className='text-sm text-muted-foreground'>Chưa có tag nào</p>
        </div>
      )}
      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle className='font-serif text-base'>
              {editTag ? 'Sửa tag' : 'Thêm tag'}
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
                  if (!editTag) setFormSlug(slugify(e.target.value));
                }}
                placeholder='Tên tag'
              />
            </div>
            <div>
              <Label className='text-xs font-medium'>Slug *</Label>
              <Input
                className='h-8 text-xs mt-1.5 font-mono'
                value={formSlug}
                onChange={(e) => setFormSlug(slugify(e.target.value))}
                placeholder='tag-blog'
              />
            </div>
          </div>
          <DialogFooter className='gap-2'>
            <Button variant='outline' size='sm' className='text-xs h-8' onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button size='sm' className='text-xs h-8' onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className='w-3 h-3 animate-spin mr-1' />}
              {editTag ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='font-serif text-base'>Xóa tag?</AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>Tag sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.</AlertDialogDescription>
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
