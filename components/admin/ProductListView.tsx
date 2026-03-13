'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Copy,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  mockProducts,
  mockCategories,
  Product,
  ProductType,
  formatVND,
} from '@/lib/admin-data';
import { cn } from '@/lib/utils';

interface ProductListViewProps {
  type: ProductType;
  title: string;
}

export default function ProductListView({ type, title }: ProductListViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const products = mockProducts.filter((p) => p.type === type);
  const categories = mockCategories.filter((c) => c.type === type);

  const filtered = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchCategory =
      categoryFilter === 'ALL' || p.category === categoryFilter;
    return matchSearch && matchStatus && matchCategory;
  });

  const allSelected =
    filtered.length > 0 && filtered.every((p) => selectedIds.includes(p.id));
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds((ids) =>
        ids.filter((id) => !filtered.find((p) => p.id === id)),
      );
    } else {
      setSelectedIds((ids) => [
        ...new Set([...ids, ...filtered.map((p) => p.id)]),
      ]);
    }
  };
  const toggleOne = (id: string) => {
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id],
    );
  };

  return (
    <div>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>
            {title}
          </h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            {filtered.length} product{filtered.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Link href={`/admin/products/new?type=${type.toLowerCase()}`}>
          <Button size='sm' className='h-8 text-xs gap-1.5'>
            <Plus size={13} />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className='flex flex-wrap gap-2 mb-4'>
        <div className='relative flex-1 min-w-48 max-w-sm'>
          <Search
            size={13}
            className='absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none'
          />
          <Input
            placeholder={`Search ${title.toLowerCase()}...`}
            className='pl-8 h-8 text-xs'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm' className='h-8 text-xs gap-1.5'>
              <Filter size={12} />
              {statusFilter === 'ALL' ? 'Status' : statusFilter}
              <ChevronDown size={11} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-32'>
            {['ALL', 'ACTIVE', 'INACTIVE'].map((s) => (
              <DropdownMenuItem
                key={s}
                className={cn('text-xs', statusFilter === s && 'font-semibold')}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'ALL' ? 'All Status' : s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Category filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' size='sm' className='h-8 text-xs gap-1.5'>
              Category: {categoryFilter === 'ALL' ? 'All' : categoryFilter}
              <ChevronDown size={11} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-44'>
            <DropdownMenuItem
              className={cn(
                'text-xs',
                categoryFilter === 'ALL' && 'font-semibold',
              )}
              onClick={() => setCategoryFilter('ALL')}
            >
              All Categories
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {categories.map((c) => (
              <DropdownMenuItem
                key={c.id}
                className={cn(
                  'text-xs',
                  categoryFilter === c.name && 'font-semibold',
                )}
                onClick={() => setCategoryFilter(c.name)}
              >
                {c.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div className='flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/20 rounded-lg mb-4'>
          <span className='text-xs font-medium text-primary'>
            {selectedIds.length} selected
          </span>
          <div className='flex items-center gap-1.5 ml-auto'>
            <Button variant='outline' size='sm' className='h-7 text-xs'>
              Activate
            </Button>
            <Button variant='outline' size='sm' className='h-7 text-xs'>
              Deactivate
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10'
              onClick={() => setSelectedIds([])}
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className='bg-card rounded-xl border border-border p-12 text-center'>
          <div className='w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3'>
            <Search size={20} className='text-muted-foreground' />
          </div>
          <p className='text-sm font-medium text-foreground mb-1'>
            No products found
          </p>
          <p className='text-xs text-muted-foreground mb-4'>
            Try adjusting your filters or add your first product.
          </p>
          <Link href={`/admin/products/new?type=${type.toLowerCase()}`}>
            <Button size='sm' className='text-xs gap-1.5'>
              <Plus size={13} />
              Add Product
            </Button>
          </Link>
        </div>
      ) : (
        <div className='bg-card rounded-xl border border-border shadow-sm overflow-hidden'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-border bg-muted/30'>
                <th className='w-10 px-4 py-3'>
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    className='w-3.5 h-3.5'
                  />
                </th>
                <th className='text-left px-3 py-3 text-xs font-medium text-muted-foreground'>
                  Product
                </th>
                <th className='text-left px-3 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell'>
                  Category
                </th>
                <th className='text-left px-3 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell'>
                  Price
                </th>
                <th className='text-left px-3 py-3 text-xs font-medium text-muted-foreground'>
                  Status
                </th>
                <th className='text-left px-3 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell'>
                  Updated
                </th>
                <th className='px-3 py-3 w-10' />
              </tr>
            </thead>
            <tbody className='divide-y divide-border'>
              {filtered.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  selected={selectedIds.includes(product.id)}
                  onSelect={() => toggleOne(product.id)}
                  onDelete={() => setDeleteId(product.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='font-serif text-base'>
              Delete Product?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>
              This action cannot be undone. The product will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='text-xs h-8'>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className='text-xs h-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground'
              onClick={() => setDeleteId(null)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductRow({
  product,
  selected,
  onSelect,
  onDelete,
}: {
  product: Product;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <tr
      className={cn(
        'hover:bg-muted/20 transition-colors',
        selected && 'bg-primary/5',
      )}
    >
      <td className='px-4 py-3'>
        <Checkbox
          checked={selected}
          onCheckedChange={onSelect}
          className='w-3.5 h-3.5'
        />
      </td>
      <td className='px-3 py-3'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted'>
            <Image
              src={product.thumbnail}
              alt={product.name}
              width={40}
              height={40}
              className='w-full h-full object-cover'
            />
          </div>
          <div>
            <p className='text-xs font-medium text-foreground line-clamp-1'>
              {product.name}
            </p>
            <p className='text-[10px] text-muted-foreground mt-0.5'>
              {product.slug}
            </p>
          </div>
        </div>
      </td>
      <td className='px-3 py-3 hidden md:table-cell'>
        <span className='text-xs text-muted-foreground'>
          {product.category || '—'}
        </span>
      </td>
      <td className='px-3 py-3 hidden sm:table-cell'>
        <span className='text-xs font-medium text-foreground'>
          {formatVND(product.price)}
        </span>
      </td>
      <td className='px-3 py-3'>
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border',
            product.status === 'ACTIVE'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-muted text-muted-foreground border-border',
          )}
        >
          {product.status}
        </span>
      </td>
      <td className='px-3 py-3 hidden lg:table-cell'>
        <span className='text-[10px] text-muted-foreground'>
          {product.updatedAt}
        </span>
      </td>
      <td className='px-3 py-3'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='sm' className='h-7 w-7 p-0'>
              <ChevronDown size={13} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-36'>
            <Link href={`/admin/products/${product.id}/edit`}>
              <DropdownMenuItem className='text-xs gap-2'>
                <Edit size={12} />
                Edit
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem className='text-xs gap-2'>
              <Copy size={12} />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className='text-xs gap-2 text-destructive focus:text-destructive'
              onClick={onDelete}
            >
              <Trash2 size={12} />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
