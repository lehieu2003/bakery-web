'use client';

import { useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import Image from 'next/image';
import { Plus, Edit, Trash2, Upload, X } from 'lucide-react';
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
import { mockBanners, Banner, BannerPlacement } from '@/lib/admin-data';
import { cn } from '@/lib/utils';

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
  const [banners, setBanners] = useState<Banner[]>(mockBanners);
  const [placementFilter, setPlacementFilter] = useState<string>('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editBanner, setEditBanner] = useState<Banner | null>(null);

  // Form
  const [formTitle, setFormTitle] = useState('');
  const [formPlacement, setFormPlacement] = useState<BannerPlacement>('HOME_HERO');
  const [formCta, setFormCta] = useState('');
  const [formCtaLink, setFormCtaLink] = useState('');
  const [formPriority, setFormPriority] = useState('1');
  const [formActive, setFormActive] = useState(true);
  const [formImage, setFormImage] = useState<string | null>(null);

  const filtered =
    placementFilter === 'ALL'
      ? banners
      : banners.filter((b) => b.placement === placementFilter);

  const openCreate = () => {
    setEditBanner(null);
    setFormTitle('');
    setFormPlacement('HOME_HERO');
    setFormCta('');
    setFormCtaLink('');
    setFormPriority('1');
    setFormActive(true);
    setFormImage(null);
    setDialogOpen(true);
  };

  const openEdit = (b: Banner) => {
    setEditBanner(b);
    setFormTitle(b.title);
    setFormPlacement(b.placement);
    setFormCta(b.ctaText);
    setFormCtaLink(b.ctaLink);
    setFormPriority(String(b.priority));
    setFormActive(b.active);
    setFormImage(b.image);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formTitle.trim()) return;
    if (editBanner) {
      setBanners((prev) =>
        prev.map((b) =>
          b.id === editBanner.id
            ? {
                ...b,
                title: formTitle,
                placement: formPlacement,
                ctaText: formCta,
                ctaLink: formCtaLink,
                priority: Number(formPriority),
                active: formActive,
                image: formImage || b.image,
              }
            : b,
        ),
      );
    } else {
      setBanners((prev) => [
        ...prev,
        {
          id: `b${Date.now()}`,
          title: formTitle,
          placement: formPlacement,
          image: formImage || '/images/hero-cake.jpg',
          ctaText: formCta,
          ctaLink: formCtaLink,
          priority: Number(formPriority),
          active: formActive,
          createdAt: new Date().toISOString().slice(0, 10),
        },
      ]);
    }
    setDialogOpen(false);
  };

  const handleToggleActive = (id: string) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, active: !b.active } : b)),
    );
  };

  return (
    <AdminShell title='Banners'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>Banners</h1>
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
            {f === 'ALL' ? 'All Placements' : PLACEMENTS.find((p) => p.value === f)?.label ?? f}
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
                src={banner.image}
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
                  <p className='text-xs font-medium text-foreground'>{banner.ctaText}</p>
                  <p className='text-[10px] text-muted-foreground'>{banner.ctaLink}</p>
                </div>
                <div className='flex items-center gap-1'>
                  <span className='text-[10px] text-muted-foreground'>
                    Priority {banner.priority}
                  </span>
                </div>
              </div>

              <div className='flex items-center justify-between pt-1 border-t border-border'>
                <div className='flex items-center gap-2'>
                  <Switch
                    checked={banner.active}
                    onCheckedChange={() => handleToggleActive(banner.id)}
                    className='scale-75 origin-left'
                  />
                  <span className='text-[10px] text-muted-foreground'>
                    {banner.active ? 'Active' : 'Inactive'}
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
              <Label className='text-xs font-medium'>Image</Label>
              <div
                className='mt-1.5 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1.5 py-5 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors relative overflow-hidden h-28'
                onClick={() => setFormImage('/images/hero-cake.jpg')}
              >
                {formImage ? (
                  <>
                    <Image src={formImage} alt='Preview' fill className='object-cover' />
                    <div className='absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity'>
                      <button
                        type='button'
                        onClick={(e) => { e.stopPropagation(); setFormImage(null); }}
                        className='bg-white rounded-full p-1 shadow'
                      >
                        <X size={12} className='text-foreground' />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload size={16} className='text-muted-foreground' />
                    <p className='text-xs text-muted-foreground'>Click to upload image</p>
                  </>
                )}
              </div>
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
                    <SelectItem key={p.value} value={p.value} className='text-xs'>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid grid-cols-2 gap-2'>
              <div>
                <Label className='text-xs font-medium'>CTA Text</Label>
                <Input
                  className='h-8 text-xs mt-1.5'
                  value={formCta}
                  onChange={(e) => setFormCta(e.target.value)}
                  placeholder='Shop Now'
                />
              </div>
              <div>
                <Label className='text-xs font-medium'>Priority</Label>
                <Input
                  type='number'
                  className='h-8 text-xs mt-1.5'
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label className='text-xs font-medium'>CTA Link</Label>
              <Input
                className='h-8 text-xs mt-1.5'
                value={formCtaLink}
                onChange={(e) => setFormCtaLink(e.target.value)}
                placeholder='/category/cakes'
              />
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
            <Button size='sm' className='text-xs h-8' onClick={handleSave}>
              {editBanner ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='font-serif text-base'>Delete Banner?</AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>
              This banner will be permanently removed from all pages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='text-xs h-8'>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className='text-xs h-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground'
              onClick={() => {
                setBanners((prev) => prev.filter((b) => b.id !== deleteId));
                setDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
