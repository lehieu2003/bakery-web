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
};

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
): StatusPresentation {
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
  if (!args.isAuthenticated) return 'Order Received';

  if (
    args.orderStatusLabel === 'Confirmed' ||
    args.paymentStatusLabel === 'Paid'
  ) {
    return 'Order Confirmed';
  }

  return 'Order Received';
}
