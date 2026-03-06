'use client';

import { useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import Image from 'next/image';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useBanners,
  useCreateBanner,
  useUpdateBanner,
  useDeleteBanner,
} from '@/hooks/admin/use-banners';
import { cn } from '@/lib/utils';
import type { Banner, BannerPlacement } from '@/types/api.types';

const PLACEMENTS: { value: BannerPlacement; label: string }[] = [
  { value: 'HOME_HERO', label: 'Home Hero' },
  { value: 'HOME_PROMO', label: 'Home Promo' },
  { value: 'CATEGORY', label: 'Category' },
];

const PLACEMENT_COLORS: Record<BannerPlacement, string> = {
  HOME_HERO: 'bg-pink-50 text-pink-700 border-pink-200',
  HOME_PROMO: 'bg-blue-50 text-blue-700 border-blue-200',
  CATEGORY: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function BannersPage() {
  const [placementFilter, setPlacementFilter] = useState<string>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editBanner, setEditBanner] = useState<Banner | null>(null);

  // Form
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPlacement, setFormPlacement] =
    useState<BannerPlacement>('HOME_HERO');
  const [formLinkUrl, setFormLinkUrl] = useState('');
  const [formDisplayOrder, setFormDisplayOrder] = useState('1');
  const [formActive, setFormActive] = useState(true);
  const [formImage, setFormImage] = useState<string>('');
  const [formImagePublicId, setFormImagePublicId] = useState<string>('');

  // API hooks
  const { data: banners, isLoading, error } = useBanners();
  const createMutation = useCreateBanner();
  const updateMutation = useUpdateBanner();
  const deleteMutation = useDeleteBanner();

  const filtered =
    placementFilter === 'ALL'
      ? banners || []
      : (banners || []).filter((b) => b.placement === placementFilter);

  const openCreate = () => {
    setEditBanner(null);
    setFormTitle('');
    setFormDescription('');
    setFormPlacement('HOME_HERO');
    setFormLinkUrl('');
    setFormDisplayOrder('1');
    setFormActive(true);
    setFormImage('');
    setFormImagePublicId('');
    setDialogOpen(true);
  };

  const openEdit = (b: Banner) => {
    setEditBanner(b);
    setFormTitle(b.title);
    setFormDescription(b.description || '');
    setFormPlacement(b.placement);
    setFormLinkUrl(b.linkUrl || '');
    setFormDisplayOrder(String(b.displayOrder));
    setFormActive(b.isActive);
    setFormImage(b.imageUrl);
    setFormImagePublicId('');
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
            placement: formPlacement,
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
          placement: formPlacement,
          displayOrder: Number(formDisplayOrder),
          isActive: formActive,
        });
      }
      setDialogOpen(false);
    } catch {
      // Error handled by mutation/toast
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      await updateMutation.mutateAsync({
        id: banner.id,
        data: { isActive: !banner.isActive },
      });
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
      <AdminShell title='Banners'>
        <div className='flex items-center justify-center min-h-100'>
          <Loader2 className='w-8 h-8 animate-spin text-primary' />
        </div>
      </AdminShell>
    );
  }

  if (error) {
    return (
      <AdminShell title='Banners'>
        <div className='flex items-center justify-center min-h-100'>
          <p className='text-destructive'>Failed to load banners</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title='Banners'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>
            Banners
          </h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            {filtered.length} banner{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size='sm' className='h-8 text-xs gap-1.5' onClick={openCreate}>
          <Plus size={13} />
          Add Banner
        </Button>
      </div>

      {/* Placement filter */}
      <div className='flex gap-1.5 flex-wrap mb-4'>
        {['ALL', ...PLACEMENTS.map((p) => p.value)].map((f) => (
          <button
            key={f}
            onClick={() => setPlacementFilter(f)}
            className={cn(
              'px-3 py-1 rounded-full text-[10px] font-medium border transition-all',
              placementFilter === f
                ? 'bg-foreground text-background border-foreground'
                : 'bg-card text-muted-foreground border-border hover:border-foreground/30',
            )}
          >
            {f === 'ALL'
              ? 'All Placements'
              : (PLACEMENTS.find((p) => p.value === f)?.label ?? f)}
          </button>
        ))}
      </div>

      {/* Banner grid */}
      <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-4'>
        {filtered.map((banner) => (
          <div
            key={banner.id}
            className='bg-card rounded-xl border border-border shadow-sm overflow-hidden'
          >
            {/* Image preview */}
            <div className='relative h-36 bg-muted'>
              <Image
                src={banner.imageUrl}
                alt={banner.title}
                fill
                className='object-cover'
              />
              <div className='absolute inset-0 bg-black/30' />
              <div className='absolute top-2 right-2 flex gap-1.5'>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border bg-white/90 ${PLACEMENT_COLORS[banner.placement]}`}
                >
                  {PLACEMENTS.find((p) => p.value === banner.placement)?.label}
                </span>
              </div>
              <div className='absolute bottom-2 left-2'>
                <p className='text-white text-xs font-semibold drop-shadow-sm'>
                  {banner.title}
                </p>
              </div>
            </div>

            {/* Info */}
            <div className='px-4 py-3 space-y-2'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs font-medium text-foreground line-clamp-1'>
                    {banner.description || 'No description'}
                  </p>
                  <p className='text-[10px] text-muted-foreground'>
                    {banner.linkUrl || 'No link'}
                  </p>
                </div>
                <div className='flex items-center gap-1'>
                  <span className='text-[10px] text-muted-foreground'>
                    Order {banner.displayOrder}
                  </span>
                </div>
              </div>

              <div className='flex items-center justify-between pt-1 border-t border-border'>
                <div className='flex items-center gap-2'>
                  <Switch
                    checked={banner.isActive}
                    onCheckedChange={() => handleToggleActive(banner)}
                    className='scale-75 origin-left'
                    disabled={updateMutation.isPending}
                  />
                  <span className='text-[10px] text-muted-foreground'>
                    {banner.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className='flex items-center gap-1'>
                  <button
                    onClick={() => openEdit(banner)}
                    className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground'
                  >
                    <Edit size={13} />
                  </button>
                  <button
                    onClick={() => setDeleteId(banner.id)}
                    className='p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive'
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
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
            {/* Image upload */}
            <div>
              <Label className='text-xs font-medium'>Banner Image</Label>
              <ImageUpload
                onUploadComplete={(url, publicId) => {
                  setFormImage(url);
                  setFormImagePublicId(publicId);
                }}
                onDelete={() => {
                  setFormImage('');
                  setFormImagePublicId('');
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

            <div>
              <Label className='text-xs font-medium'>Placement</Label>
              <Select
                value={formPlacement}
                onValueChange={(v) => setFormPlacement(v as BannerPlacement)}
              >
                <SelectTrigger className='h-8 text-xs mt-1.5'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLACEMENTS.map((p) => (
                    <SelectItem
                      key={p.value}
                      value={p.value}
                      className='text-xs'
                    >
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid grid-cols-2 gap-2'>
              <div>
                <Label className='text-xs font-medium'>Link URL</Label>
                <Input
                  className='h-8 text-xs mt-1.5'
                  value={formLinkUrl}
                  onChange={(e) => setFormLinkUrl(e.target.value)}
                  placeholder='/category/cakes'
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
    </AdminShell>
  );
}
