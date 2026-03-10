'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AdminShell from '@/components/admin/AdminShell';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  ChevronDown,
  Loader2,
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
import { useProducts, useDeleteProduct } from '@/hooks/admin/use-products';
import { useCategories } from '@/hooks/admin/use-categories';
import { formatVND } from '@/lib/admin-data';
import { cn } from '@/lib/utils';
import type { Product, Category } from '@/types/api.types';
import { getProductImage } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'INACTIVE'
  >('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { toast } = useToast();

  const {
    data: productsData,
    isLoading: productsLoading,
    error: productsError,
  } = useProducts({
    page,
    limit: 20,
    search: search || undefined,
  });

  const { data: categories } = useCategories();
  const deleteMutation = useDeleteProduct();

  const products = productsData?.products || [];
  const pagination = productsData?.pagination;

  // Client-side filters
  const filtered = products.filter((p: Product) => {
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' ? p.isActive : !p.isActive);
    const matchCategory =
      categoryFilter === 'ALL' ||
      (p.categories || []).some((pc) => pc.categoryId === categoryFilter);
    return matchStatus && matchCategory;
  });

  const allSelected =
    filtered.length > 0 &&
    filtered.every((p: Product) => selectedIds.includes(p.id));
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds((ids) =>
        ids.filter((id) => !filtered.find((p: Product) => p.id === id)),
      );
    } else {
      setSelectedIds((ids) => [
        ...new Set([...ids, ...filtered.map((p: Product) => p.id)]),
      ]);
    }
  };
  const toggleOne = (id: string) => {
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id],
    );
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    console.log('Deleting product with ID:', deleteId);

    try {
      await deleteMutation.mutateAsync(deleteId);
      console.log('Product deleted successfully');
      setDeleteId(null);
    } catch (error) {
      console.error('Delete product error:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to delete product',
        variant: 'destructive',
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    console.log('Bulk deleting products:', selectedIds);

    try {
      // Delete all selected products
      await Promise.all(
        selectedIds.map((id) => deleteMutation.mutateAsync(id)),
      );

      console.log('Bulk delete successful');
      toast({
        title: 'Success',
        description: `Deleted ${selectedIds.length} product${selectedIds.length > 1 ? 's' : ''} successfully`,
      });

      setSelectedIds([]);
      setBulkDeleteOpen(false);
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to delete products',
        variant: 'destructive',
      });
    }
  };

  if (productsLoading) {
    return (
      <AdminShell title='Products'>
        <div className='flex items-center justify-center min-h-100'>
          <Loader2 className='w-8 h-8 animate-spin text-primary' />
        </div>
      </AdminShell>
    );
  }

  if (productsError) {
    return (
      <AdminShell title='Products'>
        <div className='flex items-center justify-center min-h-100'>
          <p className='text-destructive'>Failed to load products</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title='Products'>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>
            Products
          </h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            {pagination?.total || filtered.length} product
            {(pagination?.total || filtered.length) !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href='/admin/products/new'>
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
            placeholder='Search products...'
            className='pl-8 h-8 text-xs'
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((s) => (
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
              Category:{' '}
              {categoryFilter === 'ALL'
                ? 'All'
                : categories?.find((c: Category) => c.id === categoryFilter)
                    ?.name || 'All'}
              <ChevronDown size={11} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-44'>
            <DropdownMenuItem
              className={cn(
                'text-xs',
                categoryFilter === 'ALL' && 'font-semibold',
              )}
              onClick={() => {
                setCategoryFilter('ALL');
                setPage(1);
              }}
            >
              All Categories
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {(categories || []).map((c: Category) => (
              <React.Fragment key={c.id}>
                <DropdownMenuItem
                  className={cn(
                    'text-xs font-medium',
                    categoryFilter === c.id && 'font-semibold',
                  )}
                  onClick={() => {
                    setCategoryFilter(c.id);
                    setPage(1);
                  }}
                >
                  {c.name}
                </DropdownMenuItem>
                {(c as any).children?.map((child: any) => (
                  <DropdownMenuItem
                    key={child.id}
                    className={cn(
                      'text-xs pl-6',
                      categoryFilter === child.id && 'font-semibold',
                    )}
                    onClick={() => {
                      setCategoryFilter(child.id);
                      setPage(1);
                    }}
                  >
                    └ {child.name}
                  </DropdownMenuItem>
                ))}
              </React.Fragment>
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
            <Button
              variant='outline'
              size='sm'
              className='h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10'
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 size={12} className='mr-1' />
              Delete
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='h-7 text-xs'
              onClick={() => setSelectedIds([])}
            >
              Clear
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
          <Link href='/admin/products/new'>
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
                  Stock
                </th>
                <th className='px-3 py-3 w-10' />
              </tr>
            </thead>
            <tbody className='divide-y divide-border'>
              {filtered.map((product: Product) => (
                <tr
                  key={product.id}
                  className={cn(
                    'hover:bg-muted/20 transition-colors',
                    selectedIds.includes(product.id) && 'bg-primary/5',
                  )}
                >
                  <td className='px-4 py-3'>
                    <Checkbox
                      checked={selectedIds.includes(product.id)}
                      onCheckedChange={() => toggleOne(product.id)}
                      className='w-3.5 h-3.5'
                    />
                  </td>
                  <td className='px-3 py-3'>
                    <div className='flex items-center gap-3'>
                      <div className='w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted'>
                        <Image
                          src={getProductImage(product)}
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
                      {product.categories?.[0]?.category?.name || '—'}
                    </span>
                  </td>
                  <td className='px-3 py-3 hidden sm:table-cell'>
                    <span className='text-xs font-medium text-foreground'>
                      {formatVND(Number(product.price))}
                    </span>
                  </td>
                  <td className='px-3 py-3'>
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border',
                        product.isActive
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-muted text-muted-foreground border-border',
                      )}
                    >
                      {product.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className='px-3 py-3 hidden lg:table-cell'>
                    <span className='text-xs text-muted-foreground'>
                      {product.stock}
                    </span>
                  </td>
                  <td className='px-3 py-3'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-7 w-7 p-0'
                        >
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className='text-xs gap-2 text-destructive focus:text-destructive'
                          onClick={() => setDeleteId(product.id)}
                        >
                          <Trash2 size={12} />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 mt-4'>
          <Button
            variant='outline'
            size='sm'
            className='h-8 text-xs'
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className='text-xs text-muted-foreground'>
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant='outline'
            size='sm'
            className='h-8 text-xs'
            disabled={page === pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
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

      {/* Bulk Delete confirm */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='font-serif text-base'>
              Delete {selectedIds.length} Product
              {selectedIds.length > 1 ? 's' : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>
              This action cannot be undone. {selectedIds.length} product
              {selectedIds.length > 1 ? 's' : ''} will be permanently removed
              from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='text-xs h-8'>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className='text-xs h-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground'
              onClick={handleBulkDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className='w-3 h-3 animate-spin mr-1' />
              )}
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
