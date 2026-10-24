'use client';

import { useState } from 'react';
import { Plus, TicketPercent } from 'lucide-react';
import AdminRoleGuard from '@/components/admin/AdminRoleGuard';
import {
  useCoupons,
  useCreateCoupon,
  useDeleteCoupon,
  useUpdateCoupon,
} from '@/hooks/admin/use-coupons';
import type { AdminCoupon, CreateCouponRequest } from '@/services/admin/coupons.service';

function formatVnd(value: string | number) {
  return `${Number(value).toLocaleString('vi-VN')}đ`;
}

function formatWindow(startAt: string, endAt: string) {
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('vi-VN');
  return `${fmt(startAt)} → ${fmt(endAt)}`;
}

// This page sits outside the admin (dashboard) route group, so it carries its
// own client-side role gate (same one used by the (dashboard) layout).
export default function AdminCouponsPage() {
  return (
    <AdminRoleGuard>
      <AdminCouponsPageContent />
    </AdminRoleGuard>
  );
}

function AdminCouponsPageContent() {
  const couponsQuery = useCoupons();
  const createCoupon = useCreateCoupon();
  const updateCoupon = useUpdateCoupon();
  const deleteCoupon = useDeleteCoupon();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [value, setValue] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [formError, setFormError] = useState('');

  function toDatetimeLocal(date: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  const coupons = couponsQuery.data ?? [];

  function openDialog() {
    setCode('');
    setType('PERCENTAGE');
    setValue('');
    setStartAt(toDatetimeLocal(new Date()));
    setEndAt(
      toDatetimeLocal(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    );
    setUsageLimit('');
    setFormError('');
    setDialogOpen(true);
  }

  async function handleCreate() {
    const numericValue = Number(value);
    if (!code.trim() || !Number.isFinite(numericValue) || numericValue <= 0) {
      setFormError('Nhập mã và giá trị hợp lệ.');
      return;
    }

    if (!startAt || !endAt || new Date(endAt) <= new Date(startAt)) {
      setFormError('Chọn thời gian hiệu lực hợp lệ (kết thúc sau khi bắt đầu).');
      return;
    }

    const payload: CreateCouponRequest = {
      code: code.trim().toUpperCase(),
      type,
      value: numericValue,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      usageLimit: usageLimit ? Number(usageLimit) : null,
    };

    try {
      await createCoupon.mutateAsync(payload);
      setDialogOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Không tạo được coupon.';
      setFormError(message);
    }
  }

  async function handleToggle(coupon: AdminCoupon) {
    await updateCoupon.mutateAsync({
      id: coupon.id,
      data: { isActive: !coupon.isActive },
    });
  }

  async function handleDelete(coupon: AdminCoupon) {
    try {
      await deleteCoupon.mutateAsync(coupon.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Không xóa được coupon.';
      setFormError(message);
    }
  }

  return (
    <div className='p-8'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-2xl font-bold text-foreground'>Coupons</h1>
          <p className='text-sm text-muted-foreground mt-1'>
            Tạo và quản lý mã giảm giá cho khách hàng
          </p>
        </div>
        <button
          onClick={openDialog}
          className='inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90'
        >
          <Plus size={16} />
          Add Coupon
        </button>
      </div>

      {formError && (
        <div
          className='mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive'
          aria-live='polite'
        >
          {formError}
        </div>
      )}

      {couponsQuery.isLoading ? (
        <div className='rounded-xl border border-border bg-card p-6 animate-pulse'>
          <div className='h-6 w-64 bg-secondary rounded' />
        </div>
      ) : coupons.length === 0 ? (
        <div className='rounded-xl border border-border bg-card p-10 text-center'>
          <TicketPercent size={32} className='mx-auto text-muted-foreground mb-3' />
          <p className='text-sm text-muted-foreground'>
            Chưa có coupon nào. Tạo mã đầu tiên để chạy khuyến mãi.
          </p>
        </div>
      ) : (
        <div className='rounded-xl border border-border bg-card overflow-hidden'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-border bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground'>
                <th className='px-4 py-3'>Code</th>
                <th className='px-4 py-3'>Giảm giá</th>
                <th className='px-4 py-3'>Hiệu lực</th>
                <th className='px-4 py-3'>Lượt dùng</th>
                <th className='px-4 py-3'>Trạng thái</th>
                <th className='px-4 py-3' />
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id} className='border-b border-border/50'>
                  <td className='px-4 py-3 font-semibold text-foreground'>
                    {coupon.code}
                  </td>
                  <td className='px-4 py-3'>
                    {coupon.type === 'PERCENTAGE'
                      ? `${Number(coupon.value)}% off`
                      : `${formatVnd(coupon.value)} off`}
                  </td>
                  <td className='px-4 py-3 text-muted-foreground'>
                    {formatWindow(coupon.startAt, coupon.endAt)}
                  </td>
                  <td className='px-4 py-3'>
                    {coupon._count?.redemptions ?? 0}
                    {coupon.usageLimit ? `/${coupon.usageLimit}` : ''}
                  </td>
                  <td className='px-4 py-3'>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${coupon.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-secondary text-muted-foreground border-border'}`}
                    >
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className='px-4 py-3 text-right space-x-2 whitespace-nowrap'>
                    <button
                      onClick={() => handleToggle(coupon)}
                      className='rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary'
                    >
                      {coupon.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(coupon)}
                      disabled={(coupon._count?.redemptions ?? 0) > 0}
                      className='rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-40 disabled:cursor-not-allowed'
                      title={
                        (coupon._count?.redemptions ?? 0) > 0
                          ? 'Coupon đã có lượt dùng — chỉ có thể Deactivate'
                          : undefined
                      }
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'
          role='dialog'
          aria-label='Add Coupon'
        >
          <div className='w-full max-w-md rounded-2xl border border-border bg-card p-6'>
            <h2 className='text-lg font-semibold text-foreground mb-4'>
              Add Coupon
            </h2>
            <div className='space-y-4'>
              <div>
                <label className='text-xs font-semibold text-muted-foreground uppercase'>
                  Mã coupon *
                </label>
                <input
                  placeholder='Ví dụ: SAVE10'
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm'
                />
              </div>
              <div>
                <label className='text-xs font-semibold text-muted-foreground uppercase'>
                  Loại giảm giá
                </label>
                <select
                  aria-label='Loại giảm giá'
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as 'PERCENTAGE' | 'FIXED')
                  }
                  className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm'
                >
                  <option value='PERCENTAGE'>Giảm theo %</option>
                  <option value='FIXED'>Giảm số tiền (VND)</option>
                </select>
              </div>
              <div>
                <label className='text-xs font-semibold text-muted-foreground uppercase'>
                  {type === 'PERCENTAGE'
                    ? 'Phần trăm giảm *'
                    : 'Số tiền giảm (VND) *'}
                </label>
                <input
                  aria-label={
                    type === 'PERCENTAGE'
                      ? 'Phần trăm giảm'
                      : 'Số tiền giảm (VND)'
                  }
                  placeholder={type === 'PERCENTAGE' ? '20' : '50000'}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm'
                />
              </div>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='text-xs font-semibold text-muted-foreground uppercase'>
                    Bắt đầu
                  </label>
                  <input
                    type='datetime-local'
                    aria-label='Bắt đầu'
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm'
                  />
                </div>
                <div>
                  <label className='text-xs font-semibold text-muted-foreground uppercase'>
                    Kết thúc
                  </label>
                  <input
                    type='datetime-local'
                    aria-label='Kết thúc'
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm'
                  />
                </div>
              </div>
              <div>
                <label className='text-xs font-semibold text-muted-foreground uppercase'>
                  Giới hạn lượt dùng
                </label>
                <input
                  placeholder='Bỏ trống = không giới hạn'
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm'
                />
              </div>
            </div>
            <div className='mt-6 flex justify-end gap-2'>
              <button
                onClick={() => setDialogOpen(false)}
                className='rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary'
              >
                Cancel
              </button>
              <button
                onClick={() => void handleCreate()}
                disabled={createCoupon.isPending}
                className='rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60'
              >
                {createCoupon.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
