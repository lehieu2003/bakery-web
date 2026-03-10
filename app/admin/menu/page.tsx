'use client';

import { useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  Menu,
  ChevronRight,
  Link as LinkIcon,
  FolderOpen,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  useMenuItems,
  useCreateMenuItem,
  useUpdateMenuItem,
  useDeleteMenuItem,
} from '@/hooks/admin/use-menu';
import { useCategories } from '@/hooks/admin/use-categories';
import { usePages } from '@/hooks/admin/use-pages';
import type { MenuItem, MenuType } from '@/types/api.types';

/** Flatten menu tree into a list with depth info */
function flattenMenu(
  items: MenuItem[],
  depth = 0,
): (MenuItem & { depth: number })[] {
  const result: (MenuItem & { depth: number })[] = [];
  for (const item of items) {
    result.push({ ...item, depth });
    if (item.children && item.children.length > 0) {
      result.push(...flattenMenu(item.children, depth + 1));
    }
  }
  return result;
}

const typeLabels: Record<MenuType, string> = {
  CATEGORY: 'Category',
  PAGE: 'Page',
  LINK: 'Link',
};

const typeIcons: Record<MenuType, React.ReactNode> = {
  CATEGORY: <FolderOpen size={12} className='text-amber-500' />,
  PAGE: <FileText size={12} className='text-blue-500' />,
  LINK: <LinkIcon size={12} className='text-emerald-500' />,
};

export default function MenuAdminPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formType, setFormType] = useState<MenuType>('LINK');
  const [formParentId, setFormParentId] = useState<string>('');
  const [formCategoryId, setFormCategoryId] = useState<string>('');
  const [formPageId, setFormPageId] = useState<string>('');
  const [formDisplayOrder, setFormDisplayOrder] = useState('0');
  const [formActive, setFormActive] = useState(true);

  // API hooks
  const { data: menuItems, isLoading, error } = useMenuItems();
  const { data: categories } = useCategories();
  const { data: pages } = usePages();
  const createMutation = useCreateMenuItem();
  const updateMutation = useUpdateMenuItem();
  const deleteMutation = useDeleteMenuItem();

  const allFlat = flattenMenu(menuItems || []);
  const filtered = allFlat.filter((item) => {
    if (!search) return true;
    return item.title.toLowerCase().includes(search.toLowerCase());
  });

  // Only root-level items for parent selector (exclude current edit)
  const parentOptions = allFlat.filter(
    (item) => item.depth === 0 && (!editItem || item.id !== editItem.id),
  );

  const openCreate = (parentId?: string) => {
    setEditItem(null);
    setFormTitle('');
    setFormUrl('');
    setFormType('LINK');
    setFormParentId(parentId || '');
    setFormCategoryId('');
    setFormPageId('');
    setFormDisplayOrder('0');
    setFormActive(true);
    setDialogOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditItem(item);
    setFormTitle(item.title);
    setFormUrl(item.url || '');
    setFormType(item.type);
    setFormParentId(item.parentId || '');
    setFormCategoryId(item.categoryId || '');
    setFormPageId(item.pageId || '');
    setFormDisplayOrder(String(item.displayOrder));
    setFormActive(item.isActive);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;

    const data = {
      title: formTitle,
      url: formUrl || undefined,
      type: formType,
      parentId: formParentId || undefined,
      categoryId:
        formType === 'CATEGORY' ? formCategoryId || undefined : undefined,
      pageId: formType === 'PAGE' ? formPageId || undefined : undefined,
      displayOrder: parseInt(formDisplayOrder) || 0,
      isActive: formActive,
    };

    try {
      if (editItem) {
        await updateMutation.mutateAsync({ id: editItem.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setDialogOpen(false);
    } catch {
      // Error handled by mutation/toast
    }
  };

  const handleToggleActive = async (item: MenuItem) => {
    await updateMutation.mutateAsync({
      id: item.id,
      data: { isActive: !item.isActive },
    });
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
      <AdminShell title='Menu'>
        <div className='flex items-center justify-center min-h-[400px]'>
          <Loader2 className='w-8 h-8 animate-spin text-primary' />
        </div>
      </AdminShell>
    );
  }

  if (error) {
    return (
      <AdminShell title='Menu'>
        <div className='flex items-center justify-center min-h-[400px]'>
          <p className='text-destructive'>Failed to load menu items</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title='Menu'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>
            Menu
          </h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            {allFlat.length} item{allFlat.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          size='sm'
          className='h-8 text-xs gap-1.5'
          onClick={() => openCreate()}
        >
          <Plus size={13} />
          Add Menu Item
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
            placeholder='Search menu items...'
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
                Title
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell'>
                Type
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell'>
                URL / Target
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground'>
                Order
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground'>
                Active
              </th>
              <th className='px-5 py-3 w-28' />
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {filtered.map((item) => (
              <tr key={item.id} className='hover:bg-muted/20 transition-colors'>
                <td className='px-5 py-3.5'>
                  <div
                    className='flex items-center gap-2'
                    style={{ paddingLeft: `${item.depth * 24}px` }}
                  >
                    {item.depth > 0 && (
                      <ChevronRight
                        size={12}
                        className='text-muted-foreground/50'
                      />
                    )}
                    {item.depth === 0 && (
                      <Menu size={14} className='text-primary/60 shrink-0' />
                    )}
                    <p className='text-xs font-medium text-foreground'>
                      {item.title}
                    </p>
                  </div>
                </td>
                <td className='px-5 py-3.5 hidden sm:table-cell'>
                  <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted'>
                    {typeIcons[item.type]}
                    {typeLabels[item.type]}
                  </span>
                </td>
                <td className='px-5 py-3.5 hidden md:table-cell'>
                  <p className='text-xs text-muted-foreground truncate max-w-[200px] font-mono'>
                    {item.url || item.category?.name || item.page?.title || '—'}
                  </p>
                </td>
                <td className='px-5 py-3.5'>
                  <span className='text-xs text-muted-foreground'>
                    {item.displayOrder}
                  </span>
                </td>
                <td className='px-5 py-3.5'>
                  <Switch
                    checked={item.isActive}
                    onCheckedChange={() => handleToggleActive(item)}
                    className='scale-75 origin-left'
                    disabled={updateMutation.isPending}
                  />
                </td>
                <td className='px-5 py-3.5'>
                  <div className='flex items-center gap-1 justify-end'>
                    {item.depth === 0 && (
                      <button
                        onClick={() => openCreate(item.id)}
                        className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground'
                        title='Add child item'
                      >
                        <Plus size={13} />
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
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className='text-center py-16 bg-card rounded-xl border border-border mt-4'>
          <p className='text-sm text-muted-foreground'>No menu items found</p>
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle className='font-serif text-base'>
              {editItem ? 'Edit Menu Item' : 'Add Menu Item'}
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-3 py-2 max-h-[60vh] overflow-y-auto'>
            <div>
              <Label className='text-xs font-medium'>Title</Label>
              <Input
                className='h-8 text-xs mt-1.5'
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder='Menu item title'
              />
            </div>

            <div>
              <Label className='text-xs font-medium'>Type</Label>
              <Select
                value={formType}
                onValueChange={(v) => setFormType(v as MenuType)}
              >
                <SelectTrigger className='h-8 text-xs mt-1.5'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='LINK'>Link</SelectItem>
                  <SelectItem value='CATEGORY'>Category</SelectItem>
                  <SelectItem value='PAGE'>Page</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formType === 'LINK' && (
              <div>
                <Label className='text-xs font-medium'>URL</Label>
                <Input
                  className='h-8 text-xs mt-1.5'
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder='https://... or /path'
                />
              </div>
            )}

            {formType === 'CATEGORY' && (
              <div>
                <Label className='text-xs font-medium'>Category</Label>
                <Select
                  value={formCategoryId}
                  onValueChange={setFormCategoryId}
                >
                  <SelectTrigger className='h-8 text-xs mt-1.5'>
                    <SelectValue placeholder='Select category' />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories || []).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formType === 'PAGE' && (
              <div>
                <Label className='text-xs font-medium'>Page</Label>
                <Select value={formPageId} onValueChange={setFormPageId}>
                  <SelectTrigger className='h-8 text-xs mt-1.5'>
                    <SelectValue placeholder='Select page' />
                  </SelectTrigger>
                  <SelectContent>
                    {(pages || []).map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {page.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className='text-xs font-medium'>Parent Item</Label>
              <Select value={formParentId} onValueChange={setFormParentId}>
                <SelectTrigger className='h-8 text-xs mt-1.5'>
                  <SelectValue placeholder='None (root level)' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>None (root level)</SelectItem>
                  {parentOptions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {editItem ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='font-serif text-base'>
              Delete Menu Item?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>
              This menu item and all its children will be permanently removed.
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
