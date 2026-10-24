'use client';

import { ChevronLeft } from 'lucide-react';
import { useEffect, useImperativeHandle, useRef, useState, type RefObject } from 'react';
import { useCart } from '@/lib/cart-store';
import { useMembershipBenefits } from '@/hooks/use-membership-benefits';
import { useAddresses, useCreateAddress } from '@/hooks/use-addresses';
import { useAuth } from '@/providers/auth-provider';
import type { Address } from '@/types/api.types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// CheckoutInfoScreen is also rendered by legacy component tests without
// AuthProvider mounted; treat a missing provider as "not authenticated"
// instead of crashing the whole checkout screen.
function useOptionalAuth() {
  try {
    return useAuth();
  } catch {
    return null;
  }
}

function addressToOneLine(address: Address): string {
  return [address.street, address.ward, address.district, address.province].join(
    ', ',
  );
}

type SavedAddressPickerHandle = {
  // Runs on the checkout form's valid submit. Returns false when the save was
  // requested but failed (the message is rendered inside the picker) so the
  // caller can abort navigation.
  saveNewAddress: (contact: {
    fullName: string;
    phone: string;
  }) => Promise<boolean>;
};

function SavedAddressPicker({
  onUseSaved,
  onUseNew,
  handleRef,
}: {
  onUseSaved: (address: Address) => void;
  onUseNew?: () => void;
  handleRef: RefObject<SavedAddressPickerHandle | null>;
}) {
  const addressesQuery = useAddresses();
  const addresses = addressesQuery.data ?? [];
  const {
    mutateAsync: createAddress,
    isPending: isSavingAddress,
  } = useCreateAddress();
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null);
  const [saveRequested, setSaveRequested] = useState(false);
  const [street, setStreet] = useState('');
  const [ward, setWard] = useState('');
  const [district, setDistrict] = useState('');
  const [province, setProvince] = useState('');
  const [saveError, setSaveError] = useState('');

  useImperativeHandle(handleRef, () => ({
    saveNewAddress: async (contact) => {
      if (!saveRequested) return true;

      const payload = {
        fullName: contact.fullName.trim(),
        phone: contact.phone.trim(),
        street: street.trim(),
        ward: ward.trim(),
        district: district.trim(),
        province: province.trim(),
      };
      if (
        !payload.street ||
        !payload.ward ||
        !payload.district ||
        !payload.province
      ) {
        setSaveError(
          'Điền đầy đủ đường, phường/xã, quận/huyện và tỉnh/thành để lưu địa chỉ này.',
        );
        return false;
      }

      try {
        await createAddress(payload);
        return true;
      } catch {
        setSaveError(
          'Không lưu được địa chỉ. Bạn có thể thử lại hoặc tiếp tục mà không lưu.',
        );
        return false;
      }
    },
  }));

  // Authenticated members with no saved addresses keep the free-text flow.
  if (addresses.length === 0) {
    return null;
  }

  const radioCardClass = (isSelected: boolean) =>
    `w-full text-left rounded-2xl border p-4 transition-colors ${
      isSelected
        ? 'bg-primary/10 border-primary'
        : 'border-border bg-card hover:border-primary/50'
    }`;

  return (
    <div>
      <label className='text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2.5'>
        Địa chỉ đã lưu
      </label>
      <div
        role='radiogroup'
        aria-label='Danh sách địa chỉ đã lưu'
        className='space-y-2.5 mb-4'
      >
        {addresses.map((savedAddress) => (
          <button
            key={savedAddress.id}
            type='button'
            role='radio'
            aria-checked={selectedId === savedAddress.id}
            onClick={() => {
              setSelectedId(savedAddress.id);
              setSaveRequested(false);
              setSaveError('');
              onUseSaved(savedAddress);
            }}
            className={radioCardClass(selectedId === savedAddress.id)}
          >
            <div className='flex items-center justify-between gap-2'>
              <span className='text-sm font-semibold text-foreground'>
                {savedAddress.fullName}
              </span>
              {savedAddress.isDefault && (
                <span className='text-xs bg-primary text-white px-1.5 py-0.5 rounded-full font-semibold'>
                  Mặc định
                </span>
              )}
            </div>
            <p className='text-xs text-muted-foreground mt-0.5'>
              {savedAddress.phone}
            </p>
            <p className='text-xs text-muted-foreground'>
              {addressToOneLine(savedAddress)}
            </p>
          </button>
        ))}
        <button
          type='button'
          role='radio'
          aria-checked={selectedId === 'new'}
          onClick={() => {
            setSelectedId('new');
            onUseNew?.();
          }}
          className={radioCardClass(selectedId === 'new')}
        >
          <span className='text-sm font-medium text-foreground'>
            Dùng địa chỉ mới
          </span>
        </button>
      </div>

      {selectedId === 'new' && (
        <div className='rounded-2xl border border-border bg-secondary/40 p-4 mb-4 space-y-3'>
          <label className='flex items-center gap-2 text-sm text-foreground'>
            <input
              type='checkbox'
              checked={saveRequested}
              onChange={(e) => {
                setSaveRequested(e.target.checked);
                if (!e.target.checked) setSaveError('');
              }}
              disabled={isSavingAddress}
            />
            Lưu địa chỉ này cho lần sau
          </label>
          {saveRequested && (
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <input
                type='text'
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder='Đường'
                aria-label='Đường'
                className='px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:border-primary transition-colors'
              />
              <input
                type='text'
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                placeholder='Phường/Xã'
                aria-label='Phường/Xã'
                className='px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:border-primary transition-colors'
              />
              <input
                type='text'
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder='Quận/Huyện'
                aria-label='Quận/Huyện'
                className='px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:border-primary transition-colors'
              />
              <input
                type='text'
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                placeholder='Tỉnh/Thành phố'
                aria-label='Tỉnh/Thành phố'
                className='px-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:border-primary transition-colors'
              />
            </div>
          )}
          {saveError && (
            <p className='text-xs text-destructive' aria-live='polite'>
              {saveError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function OrderSidebar({
  step,
  discountPercent,
  memberLabel,
  points,
  eligibilityMessage,
}: {
  step: 1 | 2;
  discountPercent: number;
  memberLabel: string;
  points: number;
  eligibilityMessage: string;
}) {
  const { cart, user } = useCart();
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountRate = user ? discountPercent / 100 : 0;
  const discount = Math.round(subtotal * discountRate);
  const total = subtotal - discount;

  return (
    <div className='bg-card rounded-2xl border border-border/50 p-6 sticky top-24'>
      <h3 className='font-serif text-base font-semibold text-foreground mb-5'>
        Tóm tắt đơn hàng
      </h3>

      {/* Step progress */}
      <div className='flex items-center gap-2 mb-6'>
        <div
          className={`flex-1 h-1.5 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-border'}`}
        />
        <div
          className={`flex-1 h-1.5 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-border'}`}
        />
      </div>
      <p className='text-xs text-muted-foreground mb-5'>
        Bước {step}/2 – {step === 1 ? 'Thông tin' : 'Thanh toán'}
      </p>

      <div className='space-y-2.5 mb-4'>
        <div className='flex justify-between text-sm'>
          <span className='text-muted-foreground'>Tạm tính</span>
          <span className='text-foreground font-medium'>
            {subtotal.toLocaleString('vi-VN')}đ
          </span>
        </div>
        {user && discount > 0 && (
          <div className='flex justify-between text-sm'>
            <span className='text-primary capitalize'>
              Ưu đãi hạng {memberLabel}
            </span>
            <span className='text-primary font-semibold'>
              -{discount.toLocaleString('vi-VN')}đ
            </span>
          </div>
        )}
        {user && (
          <div className='rounded-xl bg-secondary/70 px-3 py-2' aria-live='polite'>
            <p className='text-xs text-muted-foreground'>
              Điểm tích luỹ: {points.toLocaleString('vi-VN')}
            </p>
            <p className='text-xs text-muted-foreground'>{eligibilityMessage}</p>
          </div>
        )}
      </div>
      <div className='h-px bg-border mb-4' />
      <div className='flex justify-between items-center bg-secondary/70 rounded-xl px-4 py-3'>
        <span className='font-serif text-sm font-bold text-foreground'>
          Tổng cộng
        </span>
        <span className='font-serif text-lg font-bold text-accent'>
          {total.toLocaleString('vi-VN')}đ
        </span>
      </div>
    </div>
  );
}

export default function CheckoutInfoScreen() {
  const { user, cart, setCheckoutInfo, checkoutInfo } = useCart();
  const router = useRouter();
  const membershipBenefitsQuery = useMembershipBenefits({
    enabled: Boolean(user),
  });
  const discountPercent =
    membershipBenefitsQuery.data?.benefits.currentTier.discountPercent ?? 0;
  const memberLabel =
    membershipBenefitsQuery.data?.benefits.currentTier.label ??
    user?.level ??
    'Thành viên';
  const membershipPoints =
    membershipBenefitsQuery.data?.user.points ?? user?.points ?? 0;
  const eligibilityMessage = membershipBenefitsQuery.isLoading
    ? 'Đang kiểm tra ưu đãi thành viên...'
    : membershipBenefitsQuery.data?.benefits.eligibility.message ??
      'Tạm thời không hiển thị được ưu đãi thành viên.';
  const [name, setName] = useState(
    checkoutInfo?.customerName || user?.name || '',
  );
  const [phone, setPhone] = useState(checkoutInfo?.customerPhone || '');
  const [email, setEmail] = useState(checkoutInfo?.customerEmail || '');
  const [address, setAddress] = useState(checkoutInfo?.customerAddress || '');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [method, setMethod] = useState<'pickup' | 'delivery'>(
    checkoutInfo?.deliveryMethod || 'pickup',
  );
  const auth = useOptionalAuth();
  const showSavedAddresses = auth?.isAuthenticated === true;
  // The one-shot useState initializers above run before auth resolves on a
  // direct load — sync contact fields from the profile once the user arrives,
  // without overwriting anything already typed or restored from the draft.
  useEffect(() => {
    const profile = auth?.user;
    if (!profile) return;
    if (!checkoutInfo?.customerName) {
      setName((current) => current || profile.name || '');
    }
    if (!checkoutInfo?.customerPhone) {
      setPhone((current) => current || profile.phone || '');
    }
  }, [auth?.user, checkoutInfo?.customerName, checkoutInfo?.customerPhone]);
  const pickerHandleRef = useRef<SavedAddressPickerHandle | null>(null);
  const [isSavingNewAddress, setIsSavingNewAddress] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    checkoutInfo?.addressId ?? null,
  );
  // One-line text of the currently selected saved card. Hand-edits that no
  // longer match it must drop the id, or the backend would snapshot the saved
  // address and silently discard the edited text.
  const selectedAddressLineRef = useRef<string | null>(null);

  const fillFromSavedAddress = (savedAddress: Address) => {
    setName(savedAddress.fullName);
    setPhone(savedAddress.phone);
    setAddress(addressToOneLine(savedAddress));
    setPhoneError('');
    setAddressError('');
    setSelectedAddressId(savedAddress.id);
    selectedAddressLineRef.current = addressToOneLine(savedAddress);
  };

  const handleAddressChange = (nextAddress: string) => {
    setAddress(nextAddress);
    if (
      selectedAddressId !== null &&
      nextAddress !== selectedAddressLineRef.current
    ) {
      setSelectedAddressId(null);
      selectedAddressLineRef.current = null;
    }
    if (addressError) validateAddress(nextAddress, method);
  };

  // Vietnamese phone: 0xx or +84xx, 9-11 digits
  const VN_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

  function validatePhone(value: string): boolean {
    const cleaned = value.replace(/[\s.-]/g, '');
    if (!cleaned) {
      setPhoneError('Vui lòng nhập số điện thoại');
      return false;
    }
    if (!VN_PHONE_REGEX.test(cleaned)) {
      setPhoneError('Số điện thoại chưa hợp lệ');
      return false;
    }
    setPhoneError('');
    return true;
  }

  function validateEmail(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) {
      setEmailError('');
      return true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setEmailError('Email chưa hợp lệ');
      return false;
    }

    setEmailError('');
    return true;
  }

  function validateAddress(value: string, collectionMethod: 'pickup' | 'delivery'): boolean {
    if (collectionMethod === 'pickup') {
      setAddressError('');
      return true;
    }

    if (!value.trim()) {
      setAddressError('Vui lòng nhập địa chỉ giao hàng');
      return false;
    }

    setAddressError('');
    return true;
  }

  const cakeItems = cart.filter((i) => i.type === 'cake');
  const pickupDates = [
    ...new Set(cakeItems.map((i) => i.pickupDate).filter(Boolean)),
  ];

  return (
    <div className='bg-background'>
      <div className='border-b border-border/60 bg-card'>
        <div className='max-w-7xl mx-auto px-6 lg:px-8 py-8'>
          <Link
            href='/cart'
            className='flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4'
          >
            <ChevronLeft size={16} />
            Về giỏ hàng
          </Link>
          <h1 className='font-serif text-3xl font-semibold text-foreground'>
            Thanh toán
          </h1>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-6 lg:px-8 py-10 flex flex-col lg:flex-row gap-10'>
        {/* Form */}
        <div className='flex-1 min-w-0 space-y-6'>
          <div>
            <label className='text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2.5'>
              Họ và tên
            </label>
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Họ và tên của bạn'
              className='w-full px-5 py-3.5 rounded-2xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus:border-primary transition-colors'
            />
          </div>

          <div>
            <label className='text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2.5'>
              Số điện thoại
            </label>
            <input
              type='tel'
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError) validatePhone(e.target.value);
              }}
              onBlur={() => validatePhone(phone)}
              placeholder='0909 xxx xxx'
              className={`w-full px-5 py-3.5 rounded-2xl border bg-card text-sm text-foreground placeholder:text-muted-foreground transition-colors ${
                phoneError
                  ? 'border-destructive focus:border-destructive'
                  : 'border-border focus:border-primary'
              }`}
            />
            {phoneError && (
              <p className='text-xs text-destructive mt-1.5'>{phoneError}</p>
            )}
          </div>

          <div>
            <label className='text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2.5'>
              Email (không bắt buộc)
            </label>
            <input
              type='email'
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={() => validateEmail(email)}
              placeholder='you@example.com'
              className={`w-full px-5 py-3.5 rounded-2xl border bg-card text-sm text-foreground placeholder:text-muted-foreground transition-colors ${
                emailError
                  ? 'border-destructive focus:border-destructive'
                  : 'border-border focus:border-primary'
              }`}
            />
            {emailError && (
              <p className='text-xs text-destructive mt-1.5'>{emailError}</p>
            )}
          </div>

          <div>
            <label className='text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2.5'>
              Hình thức nhận bánh
            </label>
            <div className='grid grid-cols-2 gap-3'>
              {(['pickup', 'delivery'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMethod(m);
                    if (addressError) {
                      validateAddress(address, m);
                    }
                  }}
                  className={`py-3.5 rounded-2xl border text-sm font-medium transition-colors ${
                    method === m
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'border-border text-muted-foreground bg-card hover:border-primary/50'
                  }`}
                >
                  {m === 'pickup' ? 'Nhận tại cửa hàng' : 'Giao tận nơi'}
                </button>
              ))}
            </div>
          </div>

          {showSavedAddresses && (
            <SavedAddressPicker
              onUseSaved={fillFromSavedAddress}
              onUseNew={() => {
                setSelectedAddressId(null);
                selectedAddressLineRef.current = null;
              }}
              handleRef={pickerHandleRef}
            />
          )}

          <div>
            <label className='text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2.5'>
              Địa chỉ giao hàng {method === 'delivery' ? '' : '(không bắt buộc)'}
            </label>
            <textarea
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              onBlur={() => validateAddress(address, method)}
              placeholder={
                method === 'delivery'
                  ? 'Đường, phường/xã, quận/huyện, thành phố'
                  : 'Không bắt buộc khi nhận tại cửa hàng'
              }
              rows={3}
              className={`w-full px-5 py-3.5 rounded-2xl border bg-card text-sm text-foreground placeholder:text-muted-foreground transition-colors resize-none ${
                addressError
                  ? 'border-destructive focus:border-destructive'
                  : 'border-border focus:border-primary'
              }`}
            />
            {addressError && (
              <p className='text-xs text-destructive mt-1.5'>{addressError}</p>
            )}
          </div>

          {cakeItems.length > 0 && pickupDates.length > 0 && (
            <div className='bg-primary/8 border border-primary/20 rounded-2xl p-5'>
              <p className='text-xs font-semibold text-primary uppercase tracking-widest mb-3'>
                Xác nhận ngày nhận bánh
              </p>
              {pickupDates.map((d) => (
                <p key={d} className='text-sm text-foreground font-medium'>
                  {d}
                </p>
              ))}
              <p className='text-xs text-muted-foreground mt-2'>
                Vui lòng đến nhận bánh trong khung giờ bạn đã chọn.
              </p>
            </div>
          )}

          {!user && (
            <div className='rounded-2xl border border-border bg-card p-5'>
              <p className='text-sm text-muted-foreground'>
                <Link
                  href='/profile'
                  className='text-primary font-medium underline underline-offset-2'
                >
                  Tạo tài khoản
                </Link>{' '}
                để tích điểm cho đơn hàng này.
              </p>
            </div>
          )}

          <button
            onClick={async () => {
              if (!validatePhone(phone)) return;
              if (!validateEmail(email)) return;
              if (!validateAddress(address, method)) return;

              if (showSavedAddresses) {
                setIsSavingNewAddress(true);
                try {
                  const saved = await pickerHandleRef.current?.saveNewAddress({
                    fullName: name,
                    phone,
                  });
                  if (saved === false) return;
                } finally {
                  setIsSavingNewAddress(false);
                }
              }

              setCheckoutInfo({
                customerName: name.trim(),
                customerPhone: phone.replace(/[\s.-]/g, ''),
                customerEmail: email.trim() || undefined,
                customerAddress: address.trim() || undefined,
                deliveryMethod: method,
                addressId: selectedAddressId ?? undefined,
              });
              router.push('/checkout/payment');
            }}
            disabled={
              !name.trim() ||
              !phone.trim() ||
              (method === 'delivery' && !address.trim()) ||
              isSavingNewAddress
            }
            className='w-full py-4 bg-primary text-white rounded-full font-medium text-sm shadow-md hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
          >
            Tiếp tục thanh toán
          </button>
        </div>

        {/* Summary sidebar */}
        <aside className='w-full lg:w-80 flex-shrink-0'>
          <OrderSidebar
            step={1}
            discountPercent={discountPercent}
            memberLabel={memberLabel}
            points={membershipPoints}
            eligibilityMessage={eligibilityMessage}
          />
        </aside>
      </div>
    </div>
  );
}


