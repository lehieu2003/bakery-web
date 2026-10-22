'use client';

import { useState } from 'react';
import { LogOut, ChevronRight } from 'lucide-react';
import { useCart, type MemberLevel } from '@/lib/cart-store';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOrders, usePrepareReorder } from '@/hooks/use-orders';
import { useLogout, useUpdateProfile } from '@/hooks/use-auth';
import {
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  useUpdateAddress,
} from '@/hooks/use-addresses';
import { useAuth } from '@/providers/auth-provider';
import {
  getOrderStatusPresentation,
  getPaymentStatusPresentation,
  toneToBadgeClass,
} from '@/lib/orders/presentation';
import { ApiError } from '@/lib/api/client';
import type { ReorderUnavailableItem } from '@/services/order.service';
import type { Address, Order } from '@/types/api.types';

const LEVEL_BENEFITS: Record<
  MemberLevel,
  { discount: string; perks: string[] }
> = {
  silver: {
    discount: '5% off all orders',
    perks: ['Birthday cake discount', 'Early sale access'],
  },
  gold: {
    discount: '10% off all orders',
    perks: [
      'Birthday cake discount',
      'Early sale access',
      'Free custom message',
      'Priority pickup',
    ],
  },
  platinum: {
    discount: '15% off all orders',
    perks: [
      'Birthday cake discount',
      'Early sale access',
      'Free custom message',
      'Priority pickup',
      'Complimentary tasting box',
      'Dedicated order manager',
    ],
  },
};

const MOCK_POINT_HISTORY = [
  { label: 'Order #BK20341', date: '15 Mar', points: 90, type: 'earn' },
  { label: 'Order #BK20280', date: '01 Mar', points: 41, type: 'earn' },
  { label: 'Referral Bonus', date: '20 Feb', points: 50, type: 'earn' },
  { label: 'Order #BK20210', date: '14 Feb', points: 76, type: 'earn' },
  { label: 'Redeemed Discount', date: '14 Feb', points: -100, type: 'redeem' },
];

type ReorderFeedbackState = {
  orderId: string;
  tone: 'success' | 'warning' | 'danger';
  message: string;
  unavailableItems: ReorderUnavailableItem[];
  hasPreparedItems: boolean;
};

type AddressFormValues = {
  fullName: string;
  phone: string;
  street: string;
  ward: string;
  district: string;
  province: string;
};

const EMPTY_ADDRESS_FORM: AddressFormValues = {
  fullName: '',
  phone: '',
  street: '',
  ward: '',
  district: '',
  province: '',
};

function addressToOneLine(address: Address): string {
  return [address.street, address.ward, address.district, address.province].join(
    ', ',
  );
}

const ADDRESS_INPUT_CLASS =
  'mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60';

// The address book mounts only for confirmed-authenticated members; legacy
// component tests mock the auth provider without this flag, and the address
// hooks require the app's auth + query providers.
function SavedAddressesSection() {
  const addressesQuery = useAddresses();
  const addresses = addressesQuery.data ?? [];
  const {
    mutateAsync: createAddress,
    isPending: isCreatingAddress,
  } = useCreateAddress();
  const {
    mutateAsync: updateAddress,
    isPending: isUpdatingAddress,
  } = useUpdateAddress();
  const { mutateAsync: deleteAddress, isPending: isDeletingAddress } =
    useDeleteAddress();
  const [form, setForm] = useState<{
    addressId: string | null;
    values: AddressFormValues;
  } | null>(null);
  const [actionError, setActionError] = useState('');

  const isSavingAddress = isCreatingAddress || isUpdatingAddress;

  const openAddForm = () => {
    setActionError('');
    setForm({ addressId: null, values: EMPTY_ADDRESS_FORM });
  };

  const openEditForm = (address: Address) => {
    setActionError('');
    setForm({
      addressId: address.id,
      values: {
        fullName: address.fullName,
        phone: address.phone,
        street: address.street,
        ward: address.ward,
        district: address.district,
        province: address.province,
      },
    });
  };

  const describeActionError = (error: unknown, fallback: string) =>
    error instanceof ApiError && error.data?.error
      ? error.data.error
      : fallback;

  const handleSaveForm = async () => {
    if (!form) return;

    const values: AddressFormValues = {
      fullName: form.values.fullName.trim(),
      phone: form.values.phone.trim(),
      street: form.values.street.trim(),
      ward: form.values.ward.trim(),
      district: form.values.district.trim(),
      province: form.values.province.trim(),
    };
    if (Object.values(values).some((value) => !value)) {
      setActionError('All six fields are required (1-200 characters).');
      return;
    }

    try {
      if (form.addressId) {
        await updateAddress({ id: form.addressId, input: values });
      } else {
        await createAddress(values);
      }
      setForm(null);
      setActionError('');
    } catch (error) {
      setActionError(
        describeActionError(error, 'Could not save this address. Please try again.'),
      );
    }
  };

  const handleSetDefault = async (address: Address) => {
    setActionError('');
    try {
      await updateAddress({ id: address.id, input: { isDefault: true } });
    } catch (error) {
      setActionError(
        describeActionError(
          error,
          'Could not set this address as default. Please try again.',
        ),
      );
    }
  };

  const handleDelete = async (address: Address) => {
    setActionError('');
    try {
      await deleteAddress(address.id);
    } catch (error) {
      setActionError(
        describeActionError(
          error,
          'Could not delete this address. Please try again.',
        ),
      );
    }
  };

  return (
    <div className='bg-card rounded-2xl border border-border/50 p-6'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='font-serif text-lg font-semibold text-foreground'>
          Saved Addresses
        </h2>
        {!form ? (
          <button
            onClick={openAddForm}
            className='text-sm font-medium text-primary hover:opacity-80'
          >
            Add address
          </button>
        ) : null}
      </div>

      {form ? (
        <div className='space-y-3'>
          {(
            [
              ['fullName', 'Full Name'],
              ['phone', 'Phone'],
              ['street', 'Street'],
              ['ward', 'Ward'],
              ['district', 'District'],
              ['province', 'Province'],
            ] as Array<[keyof AddressFormValues, string]>
          ).map(([field, label]) => (
            <label key={field} className='block'>
              <span className='text-xs text-muted-foreground'>{label}</span>
              <input
                value={form.values[field]}
                onChange={(e) =>
                  setForm((prev) =>
                    prev
                      ? { ...prev, values: { ...prev.values, [field]: e.target.value } }
                      : prev,
                  )
                }
                disabled={isSavingAddress}
                className={ADDRESS_INPUT_CLASS}
                placeholder={`Your ${label.toLowerCase()}`}
              />
            </label>
          ))}

          <div className='flex gap-2 pt-1'>
            <button
              onClick={() => void handleSaveForm()}
              disabled={isSavingAddress}
              className='rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60'
            >
              {isSavingAddress
                ? 'Saving...'
                : form.addressId
                  ? 'Save Changes'
                  : 'Save Address'}
            </button>
            <button
              onClick={() => setForm(null)}
              disabled={isSavingAddress}
              className='rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary disabled:opacity-60'
            >
              Cancel
            </button>
          </div>
        </div>
      ) : addressesQuery.isLoading ? (
        <p className='text-sm text-muted-foreground'>
          Loading saved addresses...
        </p>
      ) : addresses.length === 0 ? (
        <p className='text-sm text-muted-foreground'>No saved addresses yet.</p>
      ) : (
        <div className='space-y-3'>
          {addresses.map((address) => (
            <div
              key={address.id}
              className='rounded-xl border border-border p-4'
            >
              <div className='flex items-center justify-between gap-2'>
                <p className='text-sm font-semibold text-foreground'>
                  {address.fullName}
                </p>
                {address.isDefault && (
                  <span className='text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full font-semibold'>
                    Default
                  </span>
                )}
              </div>
              <p className='text-xs text-muted-foreground mt-0.5'>
                {address.phone}
              </p>
              <p className='text-xs text-muted-foreground'>
                {addressToOneLine(address)}
              </p>
              <div className='flex flex-wrap gap-2 mt-3'>
                <button
                  onClick={() => openEditForm(address)}
                  disabled={isDeletingAddress}
                  className='rounded-full border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-60'
                >
                  Edit
                </button>
                {!address.isDefault && (
                  <button
                    onClick={() => void handleSetDefault(address)}
                    disabled={isDeletingAddress}
                    className='rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-60'
                  >
                    Set as default
                  </button>
                )}
                <button
                  onClick={() => void handleDelete(address)}
                  disabled={isDeletingAddress}
                  className='rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60'
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {actionError ? (
        <p className='text-xs text-destructive mt-3' aria-live='polite'>
          {actionError}
        </p>
      ) : null}
    </div>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { replaceCart } = useCart();
  const { user: authUser, isAuthenticated, logout: clearAuthUser, setUser } = useAuth();
  const {
    data: ordersData,
    isLoading: ordersLoading,
    isError: ordersError,
  } = useOrders({
    enabled: !!authUser,
  });
  const orders = ordersData || [];
  const { mutate: logout } = useLogout();
  const { mutateAsync: prepareReorder, isPending: isPreparingReorder } =
    usePrepareReorder();
  const { mutate: updateProfile, isPending: isUpdatingProfile } =
    useUpdateProfile();
  const [draftProfile, setDraftProfile] = useState<{
    name: string;
    phone: string;
  } | null>(null);
  const [activeReorderOrderId, setActiveReorderOrderId] = useState<
    string | null
  >(null);
  const [reorderFeedback, setReorderFeedback] =
    useState<ReorderFeedbackState | null>(null);

  // Logout handler
  const handleLogout = () => {
    // Clear user from auth provider first
    clearAuthUser();
    // Then call API logout
    logout();
  };

  if (!authUser) {
    return (
      <div className='bg-background'>
        <div className='border-b border-border/60 bg-card'>
          <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10'>
            <h1 className='font-serif text-3xl font-semibold text-foreground'>
              Membership
            </h1>
            <p className='text-muted-foreground text-sm mt-1'>
              Join our exclusive club and enjoy premium rewards.
            </p>
          </div>
        </div>

        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-12 flex flex-col lg:flex-row gap-12 items-start'>
          {/* Left CTA */}
          <div className='flex-1'>
            <h2 className='font-serif text-2xl font-semibold text-foreground mb-3'>
              Join Our Membership Club
            </h2>
            <p className='text-muted-foreground text-sm leading-relaxed mb-8 max-w-md'>
              Earn points on every order, unlock exclusive discounts up to 15%,
              and enjoy personalised bakery experiences at every tier.
            </p>
            <div className='flex gap-4'>
              <Link
                href='/auth'
                className='px-8 py-3.5 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 transition-colors shadow-md'
              >
                Sign In
              </Link>
              <Link
                href='/auth'
                className='px-8 py-3.5 border border-primary text-primary rounded-full text-sm font-medium hover:bg-primary/8 transition-colors'
              >
                Create Account
              </Link>
            </div>
          </div>

          {/* Level cards */}
          <div className='w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col gap-4 lg:min-w-64'>
            {(['silver', 'gold', 'platinum'] as MemberLevel[]).map((level) => {
              const styles: Record<
                MemberLevel,
                { border: string; bg: string; text: string; badge: string }
              > = {
                silver: {
                  border: 'border-slate-200',
                  bg: 'bg-slate-50',
                  text: 'text-slate-700',
                  badge: 'bg-slate-200 text-slate-700',
                },
                gold: {
                  border: 'border-amber-200',
                  bg: 'bg-amber-50',
                  text: 'text-amber-800',
                  badge: 'bg-amber-100 text-amber-800',
                },
                platinum: {
                  border: 'border-rose-200',
                  bg: 'bg-rose-50',
                  text: 'text-rose-800',
                  badge: 'bg-rose-100 text-rose-800',
                },
              };
              const s = styles[level];
              return (
                <div
                  key={level}
                  className={`flex-1 rounded-2xl border ${s.border} ${s.bg} p-5`}
                >
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${s.badge}`}
                  >
                    {level}
                  </span>
                  <p className={`text-sm font-semibold ${s.text} mt-3 mb-1`}>
                    {LEVEL_BENEFITS[level].discount}
                  </p>
                  <ul className='space-y-0.5'>
                    {LEVEL_BENEFITS[level].perks.slice(0, 3).map((p) => (
                      <li key={p} className={`text-xs ${s.text} opacity-70`}>
                        · {p}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const levelConfig: Record<
    MemberLevel,
    { bg: string; text: string; border: string; barColor: string }
  > = {
    silver: {
      bg: 'from-slate-100 to-slate-50',
      text: 'text-slate-700',
      border: 'border-slate-200',
      barColor: 'bg-slate-400',
    },
    gold: {
      bg: 'from-amber-50 to-yellow-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      barColor: 'bg-amber-400',
    },
    platinum: {
      bg: 'from-rose-50 to-pink-50',
      text: 'text-rose-800',
      border: 'border-rose-200',
      barColor: 'bg-rose-400',
    },
  };
  const userLevel = (authUser.memberLevel?.toLowerCase() as MemberLevel) || 'silver';
  const displayName = authUser.name || authUser.email;
  const userPoints = authUser.points || 0;
  const lc = levelConfig[userLevel];
  const isEditingProfile = draftProfile !== null;
  const profileName = draftProfile?.name ?? (authUser.name ?? '');
  const profilePhone = draftProfile?.phone ?? (authUser.phone ?? '');

  const handleSaveProfile = () => {
    updateProfile(
      {
        name: profileName,
        phone: profilePhone,
      },
      {
        onSuccess: (updatedUser) => {
          setUser(updatedUser);
          setDraftProfile(null);
        },
      },
    );
  };

  const handleReorder = async (orderId: string) => {
    setActiveReorderOrderId(orderId);
    setReorderFeedback(null);

    try {
      const result = await prepareReorder({ orderId });
      replaceCart(
        result.items.map((item) => ({
          id: `${item.productId}:${item.variantId ?? 'default'}`,
          productId: item.productId,
          name: item.name,
          price: item.price,
          image: item.image,
          type: item.type,
          variantId: item.variantId ?? undefined,
          variantName: item.variantName ?? undefined,
          quantity: item.quantity,
        })),
      );

      const addedUnits = result.items.reduce((sum, item) => sum + item.quantity, 0);
      const baseMessage =
        addedUnits > 0
          ? `Added ${addedUnits} item(s) to cart from order #${result.sourceOrderNumber}.`
          : `No items from order #${result.sourceOrderNumber} could be added to cart.`;

      const tone: ReorderFeedbackState['tone'] = result.items.length
        ? result.unavailableItems.length
          ? 'warning'
          : 'success'
        : 'warning';
      const message = result.unavailableItems.length
        ? `${baseMessage} ${result.unavailableItems.length} item(s) need your attention below.`
        : baseMessage;

      setReorderFeedback({
        orderId,
        tone,
        message,
        unavailableItems: result.unavailableItems,
        hasPreparedItems: result.items.length > 0,
      });
    } catch (error) {
      const message =
        error instanceof ApiError && error.data?.error
          ? error.data.error
          : 'Could not prepare reorder right now. Please try again.';

      setReorderFeedback({
        orderId,
        tone: 'danger',
        message,
        unavailableItems: [],
        hasPreparedItems: false,
      });
    } finally {
      setActiveReorderOrderId(null);
    }
  };

  return (
    <div className='bg-background'>
      {/* Hero */}
      <div className={`bg-gradient-to-br ${lc.bg} border-b ${lc.border}`}>
        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10 flex items-center justify-between'>
          <div className='flex items-center gap-6'>
            <div
              className={`w-20 h-20 rounded-full border-2 ${lc.border} bg-white/80 flex items-center justify-center flex-shrink-0`}
            >
              <span className={`font-serif text-3xl font-bold ${lc.text}`}>
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className={`font-serif text-2xl font-semibold ${lc.text}`}>
                {displayName}
              </p>
              <span
                className={`text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/60 ${lc.text} inline-block mt-1`}
              >
                {userLevel} member
              </span>
            </div>
          </div>
          <div className='flex items-center gap-6'>
            <div className='text-right'>
              <p className={`font-serif text-3xl font-bold ${lc.text}`}>
                {userPoints.toLocaleString()}
              </p>
              <p className={`text-sm ${lc.text} opacity-70`}>loyalty points</p>
            </div>
            <button
              onClick={handleLogout}
              className='flex items-center gap-2 px-4 py-2 rounded-full border border-current/20 text-sm font-medium text-muted-foreground hover:bg-background/60 transition-colors'
              aria-label='Sign out'
            >
              <LogOut size={15} />
              Sign Out
            </button>
            <Link
              href='/xoa-tai-khoan'
              className='text-xs text-muted-foreground underline-offset-4 hover:text-destructive hover:underline'
            >
              Xóa tài khoản
            </Link>
          </div>
        </div>

        {/* Progress */}
        <div className='max-w-7xl mx-auto px-6 lg:px-8 pb-8'>
          <div className='max-w-sm'>
            <div className='h-2 rounded-full bg-white/60 overflow-hidden mb-2'>
              <div
                className={`h-full rounded-full ${lc.barColor}`}
                style={{ width: '84%' }}
              />
            </div>
            <p className={`text-xs ${lc.text} opacity-70`}>
              {userLevel !== 'platinum'
                ? '60 points to Platinum'
                : 'You have reached our highest tier. Thank you for your loyalty.'}
            </p>
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8'>
        {/* Left col: Membership benefits */}
        <div className='lg:col-span-1 space-y-6'>
          <div className='bg-card rounded-2xl border border-border/50 p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='font-serif text-lg font-semibold text-foreground'>
                Profile Settings
              </h2>
              {!isEditingProfile ? (
                <button
                  onClick={() =>
                    setDraftProfile({
                      name: authUser.name ?? '',
                      phone: authUser.phone ?? '',
                    })
                  }
                  className='text-sm font-medium text-primary hover:opacity-80'
                >
                  Edit
                </button>
              ) : null}
            </div>

            <div className='space-y-3'>
              <label className='block'>
                <span className='text-xs text-muted-foreground'>Name</span>
                <input
                  value={profileName}
                  onChange={(e) =>
                    setDraftProfile((prev) => ({
                      name: e.target.value,
                      phone: prev?.phone ?? authUser.phone ?? '',
                    }))
                  }
                  disabled={!isEditingProfile || isUpdatingProfile}
                  className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60'
                  placeholder='Your name'
                />
              </label>

              <label className='block'>
                <span className='text-xs text-muted-foreground'>Phone</span>
                <input
                  value={profilePhone}
                  onChange={(e) =>
                    setDraftProfile((prev) => ({
                      name: prev?.name ?? authUser.name ?? '',
                      phone: e.target.value,
                    }))
                  }
                  disabled={!isEditingProfile || isUpdatingProfile}
                  className='mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60'
                  placeholder='Your phone number'
                />
              </label>

              <label className='block'>
                <span className='text-xs text-muted-foreground'>
                  Membership Tier
                </span>
                <input
                  value={authUser.memberLevel ?? 'SILVER'}
                  readOnly
                  className='mt-1 w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground'
                />
              </label>

              <label className='block'>
                <span className='text-xs text-muted-foreground'>
                  Loyalty Points
                </span>
                <input
                  value={String(userPoints)}
                  readOnly
                  className='mt-1 w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground'
                />
              </label>
            </div>

            {isEditingProfile ? (
              <div className='mt-4 flex gap-2'>
                <button
                  onClick={handleSaveProfile}
                  disabled={isUpdatingProfile}
                  className='rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60'
                >
                  {isUpdatingProfile ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setDraftProfile(null);
                  }}
                  disabled={isUpdatingProfile}
                  className='rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary disabled:opacity-60'
                >
                  Cancel
                </button>
              </div>
            ) : null}
          </div>

          {isAuthenticated ? <SavedAddressesSection /> : null}

          <div className='bg-card rounded-2xl border border-border/50 p-6'>
            <h2 className='font-serif text-lg font-semibold text-foreground mb-5'>
              Membership Benefits
            </h2>
            <div className='space-y-3'>
              {(['silver', 'gold', 'platinum'] as MemberLevel[]).map(
                (level) => {
                  const isCurrent = userLevel === level;
                  const isUnlocked =
                    ['silver', 'gold', 'platinum'].indexOf(level) <=
                    ['silver', 'gold', 'platinum'].indexOf(userLevel);
                  return (
                    <div
                      key={level}
                      className={`rounded-xl p-4 border ${isCurrent ? 'border-primary bg-primary/8' : 'border-border bg-secondary/30'}`}
                    >
                      <div className='flex items-center gap-2 mb-1.5'>
                        <span
                          className={`text-xs font-bold uppercase tracking-wider capitalize ${isCurrent ? 'text-primary' : isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}
                        >
                          {level}
                        </span>
                        {isCurrent && (
                          <span className='text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full font-semibold'>
                            Current
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-sm font-semibold mb-2 ${isCurrent ? 'text-primary' : isUnlocked ? 'text-accent' : 'text-muted-foreground'}`}
                      >
                        {LEVEL_BENEFITS[level].discount}
                      </p>
                      <div className='flex flex-wrap gap-1.5'>
                        {LEVEL_BENEFITS[level].perks.map((perk) => (
                          <span
                            key={perk}
                            className={`text-[10px] px-2 py-0.5 rounded-full ${isUnlocked ? 'bg-background text-foreground border border-border' : 'bg-border/40 text-muted-foreground'}`}
                          >
                            {perk}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>

          {/* Points history */}
          <div className='bg-card rounded-2xl border border-border/50 p-6'>
            <h2 className='font-serif text-lg font-semibold text-foreground mb-5'>
              Points History
            </h2>
            <div className='space-y-3'>
              {MOCK_POINT_HISTORY.map((entry, i) => (
                <div
                  key={i}
                  className='flex items-center justify-between py-1.5 border-b border-border/40 last:border-0'
                >
                  <div>
                    <p className='text-sm font-medium text-foreground'>
                      {entry.label}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {entry.date}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold ${entry.type === 'earn' ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    {entry.type === 'earn' ? '+' : ''}
                    {entry.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right col: Order history */}
        <div className='lg:col-span-2'>
          <div className='bg-card rounded-2xl border border-border/50 p-6'>
            <h2 className='font-serif text-lg font-semibold text-foreground mb-6'>
              Order History
            </h2>
            <div className='space-y-3'>
              {ordersLoading ? (
                [...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className='px-5 py-4 rounded-xl border border-border animate-pulse'
                  >
                    <div className='flex items-center gap-5'>
                      <div className='w-10 h-10 rounded-full bg-secondary' />
                      <div className='flex-1 space-y-2'>
                        <div className='h-4 bg-secondary rounded w-1/3' />
                        <div className='h-3 bg-secondary rounded w-1/2' />
                      </div>
                    </div>
                  </div>
                ))
              ) : ordersError ? (
                <div className='text-center py-12 text-muted-foreground'>
                  <p className='text-sm text-amber-700'>
                    Could not load order history right now.
                  </p>
                  <p className='text-xs mt-1'>
                    Please refresh the page or try again in a few minutes.
                  </p>
                </div>
              ) : orders.length > 0 ? (
                orders.map((order: Order) => {
                  const itemsText =
                    order.orderItems.length > 1
                      ? `${order.orderItems[0].name} +${order.orderItems.length - 1} more`
                      : order.orderItems[0]?.name || 'No items';
                  const orderStatus = getOrderStatusPresentation(order.status);
                  const paymentStatus = getPaymentStatusPresentation(
                    order.payment?.status,
                    order.paymentMethod,
                  );
                  const canReorder = order.status === 'COMPLETED';
                  const feedbackForOrder =
                    reorderFeedback?.orderId === order.id ? reorderFeedback : null;
                  const feedbackToneClass = (() => {
                    if (!feedbackForOrder) return '';
                    if (feedbackForOrder.tone === 'success') {
                      return 'border-green-200 bg-green-50 text-green-800';
                    }
                    if (feedbackForOrder.tone === 'warning') {
                      return 'border-amber-200 bg-amber-50 text-amber-800';
                    }
                    return 'border-rose-200 bg-rose-50 text-rose-800';
                  })();

                  return (
                    <div key={order.id} className='space-y-2'>
                      <div className='flex items-center justify-between px-5 py-4 rounded-xl border border-border hover:border-primary/30 hover:bg-secondary/40 transition-colors group'>
                        <Link
                          href={`/orders/${order.orderNumber}`}
                          className='flex items-center gap-5 flex-1 min-w-0'
                          aria-label={`View order ${order.orderNumber}`}
                        >
                          <div className='w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0'>
                            <span className='font-serif text-xs font-semibold text-muted-foreground'>
                              {order.orderNumber.slice(-3)}
                            </span>
                          </div>
                          <div>
                            <p className='text-sm font-semibold text-foreground'>
                              #{order.orderNumber}
                            </p>
                            <div className='mt-1 flex flex-wrap gap-1.5'>
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneToBadgeClass(orderStatus.tone)}`}
                              >
                                {orderStatus.label}
                              </span>
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneToBadgeClass(paymentStatus.tone)}`}
                              >
                                {paymentStatus.label}
                              </span>
                            </div>
                            <p className='text-xs text-muted-foreground mt-0.5'>
                              {itemsText}
                            </p>
                            <p className='text-xs text-muted-foreground'>
                              {new Date(order.createdAt).toLocaleDateString(
                                'en-GB',
                                {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                },
                              )}
                            </p>
                            {order.pickupDate ? (
                              <p className='text-xs text-muted-foreground'>
                                Pickup: {order.pickupDate}
                              </p>
                            ) : null}
                            <div className='mt-2 space-y-0.5'>
                              {order.orderItems.map((item) => (
                                <div key={item.id}>
                                  <p className='text-xs text-muted-foreground'>
                                    {item.name} × {item.quantity}
                                  </p>
                                  {item.message ? (
                                    <p className='text-xs italic text-muted-foreground'>
                                      {item.message}
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                            </div>
                        </Link>
                        <div className='flex items-center gap-3'>
                          <div className='text-right'>
                            <p className='text-base font-bold text-accent'>
                              {order.total.toLocaleString('vi-VN')}đ
                            </p>
                            <p className='text-xs text-muted-foreground'>
                              {order.orderItems.length} item
                              {order.orderItems.length > 1 ? 's' : ''}
                            </p>
                          </div>
                        {canReorder ? (
                            <button
                              type='button'
                              onClick={() => void handleReorder(order.id)}
                              disabled={
                                isPreparingReorder && activeReorderOrderId === order.id
                              }
                              className='rounded-full border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-60'
                              aria-label={`Reorder order ${order.orderNumber}`}
                            >
                              {isPreparingReorder && activeReorderOrderId === order.id
                                ? 'Preparing...'
                                : 'Reorder'}
                            </button>
                          ) : null}
                          <ChevronRight
                            size={16}
                            className='text-muted-foreground group-hover:text-foreground transition-colors'
                          />
                        </div>
                      </div>
                      {feedbackForOrder ? (
                        <div
                          className={`rounded-xl border px-4 py-3 text-xs ${feedbackToneClass}`}
                          aria-live='polite'
                        >
                          <p>{feedbackForOrder.message}</p>
                          {feedbackForOrder.unavailableItems.length > 0 ? (
                            <ul className='mt-2 space-y-1'>
                              {feedbackForOrder.unavailableItems.map((item) => (
                                <li
                                  key={`${item.productId}-${item.variantId ?? 'default'}-${item.reason}`}
                                >
                                  {item.name}: {item.guidance}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {feedbackForOrder.hasPreparedItems ? (
                            <Link
                              href='/cart'
                              className='mt-3 inline-flex text-xs font-semibold underline underline-offset-2'
                            >
                              Review cart
                            </Link>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className='text-center py-12 text-muted-foreground'>
                  <p className='text-sm'>No orders yet</p>
                  <p className='text-xs mt-1'>
                    Start shopping to see your order history
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => router.push('/')}
              className='w-full mt-6 py-3.5 border border-border text-muted-foreground rounded-full text-sm font-medium hover:bg-secondary hover:text-foreground transition-colors'
            >
              Place a New Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
