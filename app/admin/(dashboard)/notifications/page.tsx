'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  Bell,
  Globe,
  EyeOff,
  Archive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/image-upload';
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
  useNotifications,
  useCreateNotification,
  useUpdateNotification,
  useDeleteNotification,
} from '@/hooks/admin/use-notifications';
import type {
  NotificationListItem,
  NotificationStatus,
} from '@/types/api.types';

const statusConfig: Record<
  NotificationStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  DRAFT: {
    label: 'Draft',
    icon: <EyeOff size={10} />,
    className: 'bg-muted text-muted-foreground',
  },
  PUBLISHED: {
    label: 'Published',
    icon: <Globe size={10} />,
    className: 'bg-emerald-500/10 text-emerald-600',
  },
  ARCHIVED: {
    label: 'Archived',
    icon: <Archive size={10} />,
    className: 'bg-amber-500/10 text-amber-600',
  },
};

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default function NotificationsAdminPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editNotification, setEditNotification] =
    useState<NotificationListItem | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formLinkUrl, setFormLinkUrl] = useState('');
  const [formStatus, setFormStatus] = useState<NotificationStatus>('DRAFT');
  const [formPublishedAt, setFormPublishedAt] = useState('');

  const { data, isLoading, error } = useNotifications({
    page,
    limit: 20,
    search: search || undefined,
    status:
      filterStatus !== 'all' ? (filterStatus as NotificationStatus) : undefined,
  });
  const createMutation = useCreateNotification();
  const updateMutation = useUpdateNotification();
  const deleteMutation = useDeleteNotification();

  const notifications = data?.notifications || [];
  const pagination = data?.pagination;

  const openCreate = () => {
    setEditNotification(null);
    setFormTitle('');
    setFormContent('');
    setFormImageUrl('');
    setFormLinkUrl('');
    setFormStatus('DRAFT');
    setFormPublishedAt('');
    setDialogOpen(true);
  };

  const openEdit = (item: NotificationListItem) => {
    setEditNotification(item);
    setFormTitle(item.title);
    setFormContent(item.content);
    setFormImageUrl(item.imageUrl || '');
    setFormLinkUrl(item.linkUrl || '');
    setFormStatus(item.status);
    setFormPublishedAt(toDatetimeLocal(item.publishedAt));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) return;

    const payload = {
      title: formTitle.trim(),
      content: formContent.trim(),
      imageUrl: formImageUrl.trim() || undefined,
      linkUrl: formLinkUrl.trim() || undefined,
      status: formStatus,
      publishedAt: formPublishedAt
        ? new Date(formPublishedAt).toISOString()
        : undefined,
    };

    try {
      if (editNotification) {
        await updateMutation.mutateAsync({
          id: editNotification.id,
          data: payload,
        });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setDialogOpen(false);
    } catch {
      // Error handled by toast
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      // Error handled by toast
    }
  };

  const handleQuickStatus = async (id: string, status: NotificationStatus) => {
    try {
      await updateMutation.mutateAsync({ id, data: { status } });
    } catch {
      // Error handled by toast
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <Loader2 className='w-8 h-8 animate-spin text-primary' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <p className='text-destructive'>Failed to load notifications</p>
      </div>
    );
  }

  return (
    <>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>
            Notifications
          </h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            {pagination?.total || 0} notification
            {(pagination?.total || 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <Button size='sm' className='h-8 text-xs gap-1.5' onClick={openCreate}>
          <Plus size={13} />
          Add Notification
        </Button>
      </div>

      <div className='flex flex-wrap gap-2 mb-4'>
        <div className='relative flex-1 min-w-48 max-w-xs'>
          <Search
            size={13}
            className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none'
          />
          <Input
            placeholder='Search notifications...'
            className='pl-8 h-8 text-xs'
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className='flex gap-1'>
          {(['all', 'DRAFT', 'PUBLISHED', 'ARCHIVED'] as const).map((value) => (
            <button
              key={value}
              onClick={() => {
                setFilterStatus(value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {value === 'all' ? 'All' : statusConfig[value].label}
            </button>
          ))}
        </div>
      </div>

      <div className='bg-card rounded-xl border border-border shadow-sm overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-border bg-muted/30'>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground'>
                Notification
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell'>
                Status
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell'>
                Reads
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden xl:table-cell'>
                Published
              </th>
              <th className='px-5 py-3 w-28' />
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {notifications.map((item: NotificationListItem) => {
              const status = statusConfig[item.status];
              return (
                <tr
                  key={item.id}
                  className='hover:bg-muted/20 transition-colors'
                >
                  <td className='px-5 py-3.5'>
                    <div className='flex items-start gap-2'>
                      <Bell
                        size={14}
                        className='text-primary/60 shrink-0 mt-0.5'
                      />
                      <div className='min-w-0'>
                        <p className='text-xs font-medium text-foreground truncate'>
                          {item.title}
                        </p>
                        <p className='text-[11px] text-muted-foreground line-clamp-2 mt-0.5'>
                          {item.content}
                        </p>
                        {item.linkUrl && (
                          <p className='text-[10px] text-primary truncate mt-1 font-mono'>
                            {item.linkUrl}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className='px-5 py-3.5 hidden md:table-cell'>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${status.className}`}
                    >
                      {status.icon}
                      {status.label}
                    </span>
                  </td>
                  <td className='px-5 py-3.5 hidden lg:table-cell'>
                    <span className='text-xs text-muted-foreground'>
                      {item.readCount ?? 0}
                    </span>
                  </td>
                  <td className='px-5 py-3.5 hidden xl:table-cell'>
                    <span className='text-xs text-muted-foreground'>
                      {item.publishedAt
                        ? new Date(item.publishedAt).toLocaleString('vi-VN')
                        : '—'}
                    </span>
                  </td>
                  <td className='px-5 py-3.5'>
                    <div className='flex items-center gap-1 justify-end'>
                      {item.status === 'DRAFT' && (
                        <button
                          onClick={() =>
                            handleQuickStatus(item.id, 'PUBLISHED')
                          }
                          title='Publish'
                          className='p-1.5 rounded hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600'
                        >
                          <Globe size={13} />
                        </button>
                      )}
                      {item.status === 'PUBLISHED' && (
                        <button
                          onClick={() => handleQuickStatus(item.id, 'ARCHIVED')}
                          title='Archive'
                          className='p-1.5 rounded hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600'
                        >
                          <Archive size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(item)}
                        className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground'
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteId(item.id)}
                        className='p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive'
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {notifications.length === 0 && (
        <div className='text-center py-16 bg-card rounded-xl border border-border mt-4'>
          <p className='text-sm text-muted-foreground'>
            No notifications found
          </p>
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 mt-4'>
          <Button
            variant='outline'
            size='sm'
            className='h-7 text-xs'
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className='text-xs text-muted-foreground'>
            {page} / {pagination.totalPages}
          </span>
          <Button
            variant='outline'
            size='sm'
            className='h-7 text-xs'
            onClick={() =>
              setPage((prev) => Math.min(pagination.totalPages, prev + 1))
            }
            disabled={page >= pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle className='font-serif text-base'>
              {editNotification ? 'Edit Notification' : 'Add Notification'}
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-3 py-2 max-h-[70vh] overflow-y-auto'>
            <div>
              <Label className='text-xs font-medium'>Title *</Label>
              <Input
                className='h-8 text-xs mt-1.5'
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder='Notification title'
              />
            </div>

            <div>
              <Label className='text-xs font-medium'>Content *</Label>
              <Textarea
                className='text-xs mt-1.5 min-h-[140px]'
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder='Notification content'
              />
            </div>

            <div>
              <Label className='text-xs font-medium'>Picture (optional)</Label>
              <div className='mt-1.5'>
                <ImageUpload
                  folder='notifications'
                  currentImage={formImageUrl || undefined}
                  onUploadComplete={(url) => setFormImageUrl(url)}
                  onDelete={() => setFormImageUrl('')}
                  className='[&>button]:h-32 [&_.relative]:h-32'
                />
              </div>
            </div>

            <div>
              <Label className='text-xs font-medium'>Link URL (optional)</Label>
              <Input
                className='h-8 text-xs mt-1.5 font-mono'
                value={formLinkUrl}
                onChange={(e) => setFormLinkUrl(e.target.value)}
                placeholder='/products/abc or https://...'
              />
            </div>

            <div className='grid grid-cols-2 gap-3'>
              <div>
                <Label className='text-xs font-medium'>Status</Label>
                <Select
                  value={formStatus}
                  onValueChange={(v) => setFormStatus(v as NotificationStatus)}
                >
                  <SelectTrigger className='h-8 text-xs mt-1.5'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='DRAFT'>Draft</SelectItem>
                    <SelectItem value='PUBLISHED'>Published</SelectItem>
                    <SelectItem value='ARCHIVED'>Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className='text-xs font-medium'>
                  Published At (optional)
                </Label>
                <Input
                  type='datetime-local'
                  className='h-8 text-xs mt-1.5'
                  value={formPublishedAt}
                  onChange={(e) => setFormPublishedAt(e.target.value)}
                />
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
            <Button
              size='sm'
              className='text-xs h-8'
              onClick={handleSave}
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                !formTitle.trim() ||
                !formContent.trim()
              }
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className='w-3 h-3 animate-spin mr-1' />
              )}
              {editNotification ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='font-serif text-base'>
              Delete Notification?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>
              This notification will be permanently deleted.
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
