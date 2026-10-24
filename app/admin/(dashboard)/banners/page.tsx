'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  GripVertical,
  Save,
  RotateCcw,
} from 'lucide-react';
import { ImageUpload } from '@/components/image-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  useBanners,
  useCreateBanner,
  useUpdateBanner,
  useDeleteBanner,
  bannerKeys,
} from '@/hooks/admin/use-banners';
import { useQueryClient } from '@tanstack/react-query';
import type { Banner } from '@/types/api.types';
import { DragDropProvider } from '@dnd-kit/react';
import { useSortable, isSortable } from '@dnd-kit/react/sortable';
import { toast } from 'sonner';

// ---------- Sortable Banner Card ----------
function SortableBannerCard({
  banner,
  index,
  onEdit,
  onDelete,
  onToggleActive,
  updatePending,
}: {
  banner: Banner;
  index: number;
  onEdit: (b: Banner) => void;
  onDelete: (id: string) => void;
  onToggleActive: (b: Banner) => void;
  updatePending: boolean;
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: banner.id,
    index,
  });

  return (
    <div
      ref={ref}
      className={`bg-card rounded-xl border border-border shadow-sm overflow-hidden transition-all duration-150 ${
        isDragging
          ? 'scale-[1.02] shadow-xl ring-2 ring-primary/30 opacity-80'
          : ''
      }`}
    >
      {/* Image preview */}
      <div className='relative h-36 bg-muted'>
        <Image
          src={banner.imageUrl || ''}
          alt={banner.title}
          fill
          className='object-cover'
        />
        <div className='absolute inset-0 bg-black/30' />
        <div className='absolute bottom-2 left-2 right-10'>
          <p className='text-white text-xs font-semibold drop-shadow-sm line-clamp-1'>
            {banner.title}
          </p>
        </div>
        {/* Drag handle */}
        <button
          ref={handleRef}
          className='absolute top-2 right-2 p-1.5 rounded-md bg-black/40 hover:bg-black/60 text-white cursor-grab active:cursor-grabbing touch-none'
          aria-label='Kéo để sắp xếp lại'
        >
          <GripVertical size={14} />
        </button>
      </div>

      {/* Info */}
      <div className='px-4 py-3 space-y-2'>
        <div className='flex items-center justify-between gap-2'>
          <div className='min-w-0 flex-1'>
            <p className='text-xs font-medium text-foreground line-clamp-1'>
              {banner.description || 'No description'}
            </p>
            <p className='text-xs text-muted-foreground truncate'>
              {banner.linkUrl || 'No link'}
            </p>
          </div>
          <span className='text-xs text-muted-foreground shrink-0'>
            #{banner.displayOrder}
          </span>
        </div>

        <div className='flex items-center justify-between pt-1 border-t border-border'>
          <div className='flex items-center gap-2'>
            <Switch
              checked={banner.isActive}
              onCheckedChange={() => onToggleActive(banner)}
              className='scale-75 origin-left'
              disabled={updatePending}
            />
            <span className='text-xs text-muted-foreground'>
              {banner.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className='flex items-center gap-1'>
            <button
              onClick={() => onEdit(banner)}
              className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground'
            >
              <Edit size={13} />
            </button>
            <button
              onClick={() => onDelete(banner.id)}
              className='p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive'
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Main Page ----------
export default function BannersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editBanner, setEditBanner] = useState<Banner | null>(null);

  // Local sorted items for DnD
  const [sortedBanners, setSortedBanners] = useState<Banner[]>([]);
  const [hasReordered, setHasReordered] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLinkUrl, setFormLinkUrl] = useState('');
  const [formDisplayOrder, setFormDisplayOrder] = useState('1');
  const [formActive, setFormActive] = useState(true);
  const [formImage, setFormImage] = useState<string>('');

  const queryClient = useQueryClient();

  // API hooks
  const { data: banners, isLoading, error } = useBanners();
  const createMutation = useCreateBanner();
  const updateMutation = useUpdateBanner();
  const deleteMutation = useDeleteBanner();

  // Sync sorted list when server data changes (and no pending reorder)
  useEffect(() => {
    if (banners && !hasReordered) {
      setSortedBanners([...banners]);
    }
  }, [banners, hasReordered]);

  const move = useCallback((fromIndex: number, toIndex: number) => {
    setSortedBanners((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setHasReordered(true);
  }, []);

  const openCreate = () => {
    setEditBanner(null);
    setFormTitle('');
    setFormDescription('');
    setFormLinkUrl('');
    setFormDisplayOrder(String((sortedBanners.length || 0) + 1));
    setFormActive(true);
    setFormImage('');
    setDialogOpen(true);
  };

  const openEdit = (b: Banner) => {
    setEditBanner(b);
    setFormTitle(b.title);
    setFormDescription(b.description || '');
    setFormLinkUrl(b.linkUrl || '');
    setFormDisplayOrder(String(b.displayOrder));
    setFormActive(b.isActive);
    setFormImage(b.imageUrl || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formImage) return;
    try {
      if (editBanner) {
        await updateMutation.mutateAsync({
          id: editBanner.id,
          data: {
            title: formTitle,
            description: formDescription || undefined,
            imageUrl: formImage,
            linkUrl: formLinkUrl || undefined,
            displayOrder: Number(formDisplayOrder),
            isActive: formActive,
          },
        });
      } else {
        await createMutation.mutateAsync({
          title: formTitle,
          description: formDescription || undefined,
          imageUrl: formImage,
          linkUrl: formLinkUrl || undefined,
          displayOrder: Number(formDisplayOrder),
          isActive: formActive,
        });
      }
      setDialogOpen(false);
      setHasReordered(false);
    } catch {
      // Handled by mutation/toast
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      await updateMutation.mutateAsync({
        id: banner.id,
        data: { isActive: !banner.isActive },
      });
    } catch {
      // Handled by mutation/toast
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
      setHasReordered(false);
    } catch {
      // Handled by mutation/toast
    }
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    try {
      const items = sortedBanners.map((b, i) => ({
        id: b.id,
        displayOrder: i + 1,
      }));

      const res = await fetch('/api/admin/banners/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) throw new Error('Failed to save order');

      // Build the updated list with new displayOrder values
      const updatedBanners = sortedBanners.map((b, i) => ({
        ...b,
        displayOrder: i + 1,
      }));

      // Update React Query cache immediately so the useEffect sync
      // doesn't overwrite the new order when hasReordered is set to false
      queryClient.setQueryData(bannerKeys.list(), updatedBanners);

      setSortedBanners(updatedBanners);
      setHasReordered(false);
      toast.success('Thứ tự banner đã được lưu');
    } catch {
      toast.error('Không thể lưu thứ tự');
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleCancelOrder = () => {
    if (banners) {
      setSortedBanners([...banners]);
    }
    setHasReordered(false);
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-100'>
        <Loader2 className='w-8 h-8 animate-spin text-primary' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex items-center justify-center min-h-100'>
        <p className='text-destructive'>Failed to load banners</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>
            Banners
          </h1>
          <p className='text-xs text-muted-foreground mt-0.5 flex items-center gap-1'>
            {sortedBanners.length} banner{sortedBanners.length !== 1 ? 's' : ''}
            <span className='text-muted-foreground/60'>&mdash;</span>
            <GripVertical
              size={11}
              className='inline text-muted-foreground/60'
            />
            <span>kéo thả để sắp xếp thứ tự</span>
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
            onClick={openCreate}
          >
            <Plus size={13} />
            Add Banner
          </Button>
        </div>
      </div>

      {/* Banner grid with drag and drop */}
      {sortedBanners.length > 0 ? (
        <DragDropProvider
          onDragEnd={({ canceled, operation }) => {
            if (canceled) return;
            const { source } = operation;
            if (!isSortable(source)) return;
            const { initialIndex, index } = source.sortable;
            if (initialIndex === index) return;
            move(initialIndex, index);
          }}
        >
          <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-4'>
            {sortedBanners.map((banner, index) => (
              <SortableBannerCard
                key={banner.id}
                banner={banner}
                index={index}
                onEdit={openEdit}
                onDelete={(id) => setDeleteId(id)}
                onToggleActive={handleToggleActive}
                updatePending={updateMutation.isPending}
              />
            ))}
          </div>
        </DragDropProvider>
      ) : (
        <div className='text-center py-16 bg-card rounded-xl border border-border'>
          <p className='text-sm text-muted-foreground'>No banners found</p>
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='font-serif text-base'>
              {editBanner ? 'Edit Banner' : 'Add Banner'}
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-3 py-2 max-h-[60vh] overflow-y-auto'>
            <div>
              <Label className='text-xs font-medium'>Banner Image</Label>
              <ImageUpload
                onUploadComplete={(url) => {
                  setFormImage(url);
                }}
                onDelete={() => {
                  setFormImage('');
                }}
                folder='banners'
                currentImage={formImage || undefined}
                className='mt-1.5'
              />
            </div>

            <div>
              <Label className='text-xs font-medium'>Title</Label>
              <Input
                className='h-8 text-xs mt-1.5'
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder='Banner title'
              />
            </div>

            <div>
              <Label className='text-xs font-medium'>Description</Label>
              <Input
                className='h-8 text-xs mt-1.5'
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder='Optional description'
              />
            </div>

            <div className='grid grid-cols-2 gap-2'>
              <div>
                <Label className='text-xs font-medium'>Link URL</Label>
                <Input
                  className='h-8 text-xs mt-1.5'
                  value={formLinkUrl}
                  onChange={(e) => setFormLinkUrl(e.target.value)}
                  placeholder='/search hoặc /categories/tiramisu'
                />
              </div>
              <div>
                <Label className='text-xs font-medium'>Display Order</Label>
                <Input
                  type='number'
                  className='h-8 text-xs mt-1.5'
                  value={formDisplayOrder}
                  onChange={(e) => setFormDisplayOrder(e.target.value)}
                />
              </div>
            </div>

            <div className='flex items-center justify-between py-2 border-t border-border'>
              <p className='text-xs font-medium text-foreground'>Active</p>
              <Switch checked={formActive} onCheckedChange={setFormActive} />
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
              {editBanner ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='font-serif text-base'>
              Delete Banner?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>
              This banner will be permanently removed from all pages.
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
    </>
  );
}
