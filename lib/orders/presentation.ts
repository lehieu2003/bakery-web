type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export type StatusPresentation = {
  label: string;
  tone: BadgeTone;
};

const ORDER_STATUS_PRESENTATION: Record<string, StatusPresentation> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  CONFIRMED: { label: 'Confirmed', tone: 'success' },
  PROCESSING: { label: 'Processing', tone: 'info' },
  READY: { label: 'Ready for pickup', tone: 'success' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
};

const PAYMENT_STATUS_PRESENTATION: Record<string, StatusPresentation> = {
  PENDING: { label: 'Payment pending', tone: 'warning' },
  PAID: { label: 'Paid', tone: 'success' },
  FAILED: { label: 'Payment failed', tone: 'danger' },
  REFUNDED: { label: 'Refunded', tone: 'info' },
};

/**
 * A cancelled order whose payment went through: the money is still with the
 * shop until an admin refunds it on the gateway portal and marks it
 * REFUNDED (POST /api/admin/orders/[id]/refund).
 */
export function isAwaitingRefund(
  orderStatus: string | null | undefined,
  paymentStatus: string | null | undefined,
): boolean {
  return orderStatus === 'CANCELLED' && paymentStatus === 'PAID';
}

export function getOrderStatusPresentation(status: string): StatusPresentation {
  return (
    ORDER_STATUS_PRESENTATION[status] ?? {
      label: status || 'Unknown',
      tone: 'neutral',
    }
  );
}

export function getPaymentStatusPresentation(
  paymentStatus: string | null | undefined,
  paymentMethod?: string | null,
  orderStatus?: string | null,
): StatusPresentation {
  if (isAwaitingRefund(orderStatus, paymentStatus)) {
    return { label: 'Refund pending', tone: 'warning' };
  }

  if (paymentStatus && PAYMENT_STATUS_PRESENTATION[paymentStatus]) {
    return PAYMENT_STATUS_PRESENTATION[paymentStatus];
  }

  if (!paymentStatus && paymentMethod === 'COD') {
    return { label: 'Pay on delivery', tone: 'neutral' };
  }

  if (!paymentStatus && paymentMethod === 'BANK_TRANSFER') {
    return { label: 'Bank transfer', tone: 'neutral' };
  }

  return { label: paymentStatus || 'No payment record', tone: 'neutral' };
}

/**
 * Vietnamese display labels for storefront surfaces only. The English
 * presentations above stay canonical (the admin pages and the confirmation
 * title logic compare against them); storefront screens translate at render.
 */
const VI_STATUS_LABELS: Record<string, string> = {
  Pending: 'Chờ xác nhận',
  Confirmed: 'Đã xác nhận',
  Processing: 'Đang chuẩn bị',
  'Ready for pickup': 'Sẵn sàng nhận',
  Completed: 'Hoàn tất',
  Cancelled: 'Đã hủy',
  'Payment pending': 'Chờ thanh toán',
  Paid: 'Đã thanh toán',
  'Payment failed': 'Thanh toán thất bại',
  Refunded: 'Đã hoàn tiền',
  'Refund pending': 'Chờ hoàn tiền',
  'Pay on delivery': 'Thanh toán khi nhận',
  'Bank transfer': 'Chuyển khoản',
  Unknown: 'Không xác định',
  'No payment record': 'Chưa có thanh toán',
};

export function toVietnameseStatusLabel(label: string): string {
  return VI_STATUS_LABELS[label] ?? label;
}

/** Vietnamese display labels for raw payment-method enum values. */
const VI_PAYMENT_METHOD_LABELS: Record<string, string> = {
  COD: 'Tiền mặt',
  MOMO: 'MoMo',
  VNPAY: 'VNPAY',
  BANK_TRANSFER: 'Chuyển khoản',
};

export function toVietnamesePaymentMethodLabel(method: string): string {
  return VI_PAYMENT_METHOD_LABELS[method] ?? method;
}

export function toneToBadgeClass(tone: BadgeTone): string {
  const toneClasses: Record<BadgeTone, string> = {
    neutral: 'bg-secondary text-foreground border-border',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
  };

  return toneClasses[tone];
}

export function getConfirmationTitle(args: {
  isAuthenticated: boolean;
  orderStatusLabel?: string;
  paymentStatusLabel?: string;
}): string {
  if (!args.isAuthenticated) return 'Đã nhận đơn';

  if (
    args.orderStatusLabel === 'Confirmed' ||
    args.paymentStatusLabel === 'Paid'
  ) {
    return 'Đơn đã được xác nhận';
  }

  return 'Đã nhận đơn';
}
