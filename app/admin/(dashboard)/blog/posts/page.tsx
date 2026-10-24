'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  FileText,
  Globe,
  EyeOff,
  Archive,
  Eye,
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
  useBlogPosts,
  useCreateBlogPost,
  useUpdateBlogPost,
  useDeleteBlogPost,
  useUpdateBlogPostStatus,
} from '@/hooks/admin/use-blog-posts';
import { useBlogCategories } from '@/hooks/admin/use-blog-categories';
import { useBlogTags } from '@/hooks/admin/use-blog-tags';
import type {
  BlogPost,
  BlogPostStatus,
  BlogCategory,
  BlogTag,
} from '@/types/api.types';
import { slugify } from '@/lib/slug';

const statusConfig: Record<
  BlogPostStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  DRAFT: {
    label: 'Nháp',
    icon: <EyeOff size={10} />,
    className: 'bg-muted text-muted-foreground',
  },
  PUBLISHED: {
    label: 'Đã xuất bản',
    icon: <Globe size={10} />,
    className: 'bg-emerald-500/10 text-emerald-600',
  },
  ARCHIVED: {
    label: 'Lưu trữ',
    icon: <Archive size={10} />,
    className: 'bg-amber-500/10 text-amber-600',
  },
};

export default function BlogPostsAdminPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editPost, setEditPost] = useState<BlogPost | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formExcerpt, setFormExcerpt] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCoverUrl, setFormCoverUrl] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formTagIds, setFormTagIds] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState<BlogPostStatus>('DRAFT');
  const [formMetaTitle, setFormMetaTitle] = useState('');
  const [formMetaDesc, setFormMetaDesc] = useState('');

  // API hooks
  const { data, isLoading, error } = useBlogPosts({
    page,
    limit: 20,
    search: search || undefined,
    status:
      filterStatus !== 'all' ? (filterStatus as BlogPostStatus) : undefined,
    categoryId: filterCategory !== 'all' ? filterCategory : undefined,
  });
  const { data: catData } = useBlogCategories();
  const { data: tagData } = useBlogTags();
  const createMutation = useCreateBlogPost();
  const updateMutation = useUpdateBlogPost();
  const deleteMutation = useDeleteBlogPost();
  const statusMutation = useUpdateBlogPostStatus();

  const posts = data?.posts || [];
  const pagination = data?.pagination;
  const categories: BlogCategory[] = catData?.categories || [];
  const tags: BlogTag[] = tagData?.tags || [];

  const openCreate = () => {
    setEditPost(null);
    setFormTitle('');
    setFormSlug('');
    setFormExcerpt('');
    setFormContent('');
    setFormCoverUrl('');
    setFormCategoryId('');
    setFormTagIds([]);
    setFormStatus('DRAFT');
    setFormMetaTitle('');
    setFormMetaDesc('');
    setDialogOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditPost(post);
    setFormTitle(post.title);
    setFormSlug(post.slug);
    setFormExcerpt(post.excerpt || '');
    setFormContent(post.content);
    setFormCoverUrl(post.coverUrl || '');
    setFormCategoryId(post.categoryId || '');
    setFormTagIds(post.tags?.map((t) => t.id) || []);
    setFormStatus(post.status);
    setFormMetaTitle(post.metaTitle || '');
    setFormMetaDesc(post.metaDescription || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) return;
    const slug = slugify(formSlug || formTitle);

    const payload = {
      title: formTitle,
      slug,
      excerpt: formExcerpt || undefined,
      content: formContent,
      coverUrl: formCoverUrl || undefined,
      categoryId: formCategoryId || undefined,
      tagIds: formTagIds.length > 0 ? formTagIds : undefined,
      status: formStatus,
      metaTitle: formMetaTitle || undefined,
      metaDescription: formMetaDesc || undefined,
    };

    try {
      if (editPost) {
        await updateMutation.mutateAsync({ id: editPost.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setDialogOpen(false);
    } catch {
      // Handled by toast
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      // Handled by toast
    }
  };

  const handleStatusChange = async (id: string, status: BlogPostStatus) => {
    try {
      await statusMutation.mutateAsync({ id, status });
    } catch {
      // Handled by toast
    }
  };

  const toggleTag = (tagId: string) => {
    setFormTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
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
        <p className='text-destructive'>Không thể tải bài viết</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='font-serif text-xl font-semibold text-foreground'>
            Bài viết Blog
          </h1>
          <p className='text-xs text-muted-foreground mt-0.5'>
            {pagination?.total || 0} bài viết
          </p>
        </div>
        <Button size='sm' className='h-8 text-xs gap-1.5' onClick={openCreate}>
          <Plus size={13} />
          Thêm bài viết
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
            placeholder='Tìm bài viết...'
            className='pl-8 h-8 text-xs'
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className='flex gap-1'>
          {(['all', 'DRAFT', 'PUBLISHED', 'ARCHIVED'] as const).map((val) => (
            <button
              key={val}
              onClick={() => {
                setFilterStatus(val);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === val
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {val === 'all' ? 'Tất cả' : statusConfig[val].label}
            </button>
          ))}
        </div>
        {categories.length > 0 && (
          <Select
            value={filterCategory}
            onValueChange={(v) => {
              setFilterCategory(v);
              setPage(1);
            }}
          >
            <SelectTrigger className='h-8 text-xs w-40'>
              <SelectValue placeholder='Danh mục' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Tất cả danh mục</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <div className='bg-card rounded-xl border border-border shadow-sm overflow-hidden'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-border bg-muted/30'>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground'>
                Bài viết
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell'>
                Danh mục
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden sm:table-cell'>
                Trạng thái
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell'>
                Lượt xem
              </th>
              <th className='text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell'>
                Ngày
              </th>
              <th className='px-5 py-3 w-28' />
            </tr>
          </thead>
          <tbody className='divide-y divide-border'>
            {posts.map((post: BlogPost) => {
              const st = statusConfig[post.status];
              return (
                <tr
                  key={post.id}
                  className='hover:bg-muted/20 transition-colors'
                >
                  <td className='px-5 py-3.5'>
                    <div className='flex items-center gap-3'>
                      {post.coverUrl ? (
                        <Image
                          src={post.coverUrl}
                          alt={post.title}
                          width={40}
                          height={40}
                          className='w-10 h-10 rounded-lg object-cover shrink-0'
                        />
                      ) : (
                        <div className='w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0'>
                          <FileText
                            size={14}
                            className='text-muted-foreground'
                          />
                        </div>
                      )}
                      <div className='min-w-0'>
                        <p className='text-xs font-medium text-foreground truncate'>
                          {post.title}
                        </p>
                        <p className='text-xs text-muted-foreground font-mono truncate'>
                          {post.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className='px-5 py-3.5 hidden md:table-cell'>
                    <p className='text-xs text-muted-foreground'>
                      {post.category?.name || '—'}
                    </p>
                  </td>
                  <td className='px-5 py-3.5 hidden sm:table-cell'>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}
                    >
                      {st.icon}
                      {st.label}
                    </span>
                  </td>
                  <td className='px-5 py-3.5 hidden lg:table-cell'>
                    <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                      <Eye size={12} />
                      {post.viewCount}
                    </div>
                  </td>
                  <td className='px-5 py-3.5 hidden lg:table-cell'>
                    <p className='text-xs text-muted-foreground'>
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString('vi-VN')
                        : new Date(post.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </td>
                  <td className='px-5 py-3.5'>
                    <div className='flex items-center gap-1 justify-end'>
                      {post.status === 'DRAFT' && (
                        <button
                          onClick={() =>
                            handleStatusChange(post.id, 'PUBLISHED')
                          }
                          title='Xuất bản'
                          className='p-1.5 rounded hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600'
                        >
                          <Globe size={13} />
                        </button>
                      )}
                      {post.status === 'PUBLISHED' && (
                        <button
                          onClick={() =>
                            handleStatusChange(post.id, 'ARCHIVED')
                          }
                          title='Lưu trữ'
                          className='p-1.5 rounded hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600'
                        >
                          <Archive size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(post)}
                        className='p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground'
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteId(post.id)}
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

      {posts.length === 0 && (
        <div className='text-center py-16 bg-card rounded-xl border border-border mt-4'>
          <p className='text-sm text-muted-foreground'>Chưa có bài viết nào</p>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className='flex items-center justify-center gap-2 mt-4'>
          <Button
            variant='outline'
            size='sm'
            className='h-7 text-xs'
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Trước
          </Button>
          <span className='text-xs text-muted-foreground'>
            {page} / {pagination.totalPages}
          </span>
          <Button
            variant='outline'
            size='sm'
            className='h-7 text-xs'
            onClick={() =>
              setPage((p) => Math.min(pagination.totalPages, p + 1))
            }
            disabled={page >= pagination.totalPages}
          >
            Sau
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='font-serif text-base'>
              {editPost ? 'Sửa bài viết' : 'Thêm bài viết'}
            </DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-2'>
            {/* Title */}
            <div>
              <Label className='text-xs font-medium'>Tiêu đề *</Label>
              <Input
                className='h-8 text-xs mt-1.5'
                value={formTitle}
                onChange={(e) => {
                  setFormTitle(e.target.value);
                  if (!editPost) setFormSlug(slugify(e.target.value));
                }}
                placeholder='Tiêu đề bài viết'
              />
            </div>

            {/* Slug */}
            <div>
              <Label className='text-xs font-medium'>Slug</Label>
              <Input
                className='h-8 text-xs mt-1.5 font-mono'
                value={formSlug}
                onChange={(e) => setFormSlug(slugify(e.target.value))}
                placeholder='bai-viet-slug'
              />
            </div>

            {/* Excerpt */}
            <div>
              <Label className='text-xs font-medium'>Tóm tắt</Label>
              <Textarea
                className='text-xs mt-1.5 min-h-[60px]'
                value={formExcerpt}
                onChange={(e) => setFormExcerpt(e.target.value)}
                placeholder='Mô tả ngắn về bài viết...'
              />
            </div>

            {/* Content */}
            <div>
              <Label className='text-xs font-medium'>Nội dung *</Label>
              <Textarea
                className='text-xs mt-1.5 min-h-[200px]'
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder='Nội dung bài viết (HTML)...'
              />
            </div>

            {/* Cover image */}
            <div>
              <Label className='text-xs font-medium'>Ảnh bìa</Label>
              <div className='mt-1.5'>
                <ImageUpload
                  currentImage={formCoverUrl || undefined}
                  onUploadComplete={(url) => setFormCoverUrl(url)}
                  onDelete={() => setFormCoverUrl('')}
                  folder='blog'
                />
              </div>
            </div>

            {/* Category & Status row */}
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <Label className='text-xs font-medium'>Danh mục</Label>
                <Select
                  value={formCategoryId || 'none'}
                  onValueChange={(v) =>
                    setFormCategoryId(v === 'none' ? '' : v)
                  }
                >
                  <SelectTrigger className='h-8 text-xs mt-1.5'>
                    <SelectValue placeholder='Chọn danh mục' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>Không chọn</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className='text-xs font-medium'>Trạng thái</Label>
                <Select
                  value={formStatus}
                  onValueChange={(v) => setFormStatus(v as BlogPostStatus)}
                >
                  <SelectTrigger className='h-8 text-xs mt-1.5'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='DRAFT'>Nháp</SelectItem>
                    <SelectItem value='PUBLISHED'>Xuất bản</SelectItem>
                    <SelectItem value='ARCHIVED'>Lưu trữ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <Label className='text-xs font-medium'>Tags</Label>
                <div className='flex flex-wrap gap-1.5 mt-1.5'>
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type='button'
                      onClick={() => toggleTag(tag.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                        formTagIds.includes(tag.id)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SEO */}
            <div className='border-t border-border pt-3'>
              <p className='text-xs font-medium text-foreground mb-3'>SEO</p>
              <div className='space-y-3'>
                <div>
                  <Label className='text-xs font-medium text-muted-foreground'>
                    Meta Title
                  </Label>
                  <Input
                    className='h-8 text-xs mt-1'
                    value={formMetaTitle}
                    onChange={(e) => setFormMetaTitle(e.target.value)}
                    placeholder='SEO title'
                  />
                </div>
                <div>
                  <Label className='text-xs font-medium text-muted-foreground'>
                    Meta Description
                  </Label>
                  <Textarea
                    className='text-xs mt-1 min-h-[60px]'
                    value={formMetaDesc}
                    onChange={(e) => setFormMetaDesc(e.target.value)}
                    placeholder='SEO description'
                  />
                </div>
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
              Hủy
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
              {editPost ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='font-serif text-base'>
              Xóa bài viết?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-xs'>
              Bài viết sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='text-xs h-8'>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className='text-xs h-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground'
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className='w-3 h-3 animate-spin mr-1' />
              )}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
