'use client';

import { useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  FileText,
  Globe,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  usePages,
  useCreatePage,
  useUpdatePage,
  useDeletePage,
} from '@/hooks/admin/use-pages';
import type { Page } from '@/types/api.types';

export default function PagesAdminPage() {
  const [search, setSearch] = useState('');
  const [filterPublished, setFilterPublished] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editPage, setEditPage] = useState<Page | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPublished, setFormPublished] = useState(false);

  // API hooks
  const { data: pages, isLoading, error } = usePages();
  const createMutation = useCreatePage();
  const updateMutation = useUpdatePage();
  const deleteMutation = useDeletePage();

  const filtered = (pages || []).filter((p: Page) => {
    if (
      search &&
      !p.title.toLowerCase().includes(search.toLowerCase()) &&
      !p.slug.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    if (filterPublished === 'published' && !p.isPublished) return false;
    if (filterPublished === 'draft' && p.isPublished) return false;
    return true;
  });

  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  const openCreate = () => {
    setEditPage(null);
    setFormTitle('');
    setFormSlug('');
    setFormContent('');
    setFormPublished(false);
    setDialogOpen(true);
  };

  const openEdit = (page: Page) => {
    setEditPage(page);
    setFormTitle(page.title);
    setFormSlug(page.slug);
    setFormContent(page.content);
    setFormPublished(page.isPublished);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;
    const slug = formSlug || generateSlug(formTitle);

    try {
      if (editPage) {
        await updateMutation.mutateAsync({
          id: editPage.id,
          data: {
            title: formTitle,
            slug,
            content: formContent,
            isPublished: formPublished,
          },
        });
      } else {
        await createMutation.mutateAsync({
          title: formTitle,
          slug,
          content: formContent,
          isPublished: formPublished,
        });
      }
      setDialogOpen(false);
    } catch {
      // Error handled by mutation/toast
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      // Error handled by mutation/toast
    }
  };

  if (isLoading) {
    return (
      <AdminShell title='Pages'>
        <div className='flex items-center justify-center min-h-[400px]'>
          <Loader2 className='w-8 h-8 animate-spin text-primary' />
        </div>
      </AdminShell>
    );
  }

  if (error) {
    return (
      <AdminShell title='Pages'>
        <div className='flex items-center justify-center min-h-[400px]'>
          <p className='text-destructive'>Failed to load pages</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title='Pages'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>
            Pages
          </h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            {filtered.length} page{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size='sm' className='h-8 text-xs gap-1.5' onClick={openCreate}>
          <Plus size={13} />
          Add Page
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
            placeholder='Search pages...'
            className='pl-8 h-8 text-xs'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className='flex gap-1'>
          {['all', 'published', 'draft'].map((val) => (
            <button
              key={val}
              onClick={() => setFilterPublished(val)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterPublished === val
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {val === 'all'
                ? 'All'
                : val === 'published'
                  ? 'Published'
                  : 'Draft'}
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
                Title
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell'>
                Slug
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell'>
                Status
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell'>
                Updated
              </th>
              <th className='px-5 py-3 w-24' />
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {filtered.map((page: Page) => (
              <tr key={page.id} className='hover:bg-muted/20 transition-colors'>
                <td className='px-5 py-3.5'>
                  <div className='flex items-center gap-2'>
                    <FileText size={14} className='text-primary/60 shrink-0' />
                    <p className='text-xs font-medium text-foreground'>
                      {page.title}
                    </p>
                  </div>
                </td>
                <td className='px-5 py-3.5 hidden sm:table-cell'>
                  <p className='text-xs text-muted-foreground font-mono'>
                    {page.slug}
                  </p>
                </td>
                <td className='px-5 py-3.5 hidden md:table-cell'>
                  {page.isPublished ? (
                    <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600'>
                      <Globe size={10} />
                      Published
                    </span>
                  ) : (
                    <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground'>
                      <EyeOff size={10} />
                      Draft
                    </span>
                  )}
                </td>
                <td className='px-5 py-3.5 hidden lg:table-cell'>
                  <p className='text-xs text-muted-foreground'>
                    {new Date(page.updatedAt).toLocaleDateString('vi-VN')}
                  </p>
                </td>
                <td className='px-5 py-3.5'>
                  <div className='flex items-center gap-1 justify-end'>
                    <button
                      onClick={() => openEdit(page)}
                      className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground'
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteId(page.id)}
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
      </div>

      {filtered.length === 0 && (
        <div className='text-center py-16 bg-card rounded-xl border border-border mt-4'>
          <p className='text-sm text-muted-foreground'>No pages found</p>
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle className='font-serif text-base'>
              {editPage ? 'Edit Page' : 'Add Page'}
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-3 py-2 max-h-[60vh] overflow-y-auto'>
            <div>
              <Label className='text-xs font-medium'>Title</Label>
              <Input
                className='h-8 text-xs mt-1.5'
                value={formTitle}
                onChange={(e) => {
                  setFormTitle(e.target.value);
                  if (!editPage) setFormSlug(generateSlug(e.target.value));
                }}
                placeholder='Page title'
              />
            </div>

            <div>
              <Label className='text-xs font-medium'>Slug</Label>
              <Input
                className='h-8 text-xs mt-1.5 font-mono'
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder='page-slug'
              />
            </div>

            <div>
              <Label className='text-xs font-medium'>Content</Label>
              <Textarea
                className='text-xs mt-1.5 min-h-[200px]'
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder='Page content (HTML supported)...'
              />
            </div>

            <div className='flex items-center justify-between py-2 border-t border-border'>
              <p className='text-xs font-medium text-foreground'>Published</p>
              <Switch
                checked={formPublished}
                onCheckedChange={setFormPublished}
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
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className='w-3 h-3 animate-spin mr-1' />
              )}
              {editPage ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='font-serif text-base'>
              Delete Page?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>
              This page will be permanently deleted. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='text-xs h-8'>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className='text-xs h-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground'
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className='w-3 h-3 animate-spin mr-1' />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
