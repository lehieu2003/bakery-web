import { Check, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ORDER_PROGRESS_STEPS,
  getOrderProgressIndex,
} from '@/lib/orders/presentation';

/** Step progress bar of an order: reached steps are ticked. */
export default function OrderStatusStepper({ status }: { status: string }) {
  if (status === 'CANCELLED') {
    return (
      <div className='flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700'>
        <XCircle size={18} aria-hidden />
        Đơn hàng đã huỷ
      </div>
    );
  }

  const current = getOrderProgressIndex(status);
  if (current < 0) return null;

  return (
    <ol className='flex' aria-label='Tiến trình đơn hàng'>
      {ORDER_PROGRESS_STEPS.map((step, index) => {
        const done = index <= current;
        const isCurrent = index === current;
        return (
          <li
            key={step.status}
            className='relative flex flex-1 flex-col items-center text-center'
            aria-current={isCurrent ? 'step' : undefined}
            data-state={done ? 'done' : 'upcoming'}
          >
            {index > 0 ? (
              <span
                aria-hidden
                className={cn(
                  'absolute top-3.5 right-1/2 h-0.5 w-full -translate-y-1/2',
                  done ? 'bg-primary' : 'bg-border',
                )}
              />
            ) : null}
            <span
              className={cn(
                'relative z-10 flex size-7 items-center justify-center rounded-full border-2 text-xs font-semibold',
                done
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground',
                isCurrent && 'ring-4 ring-primary/20',
              )}
            >
              {done ? <Check size={14} strokeWidth={3} /> : index + 1}
            </span>
            <span
              className={cn(
                'mt-2 px-1 text-[11px] leading-tight sm:text-xs',
                isCurrent
                  ? 'font-semibold text-foreground'
                  : done
                    ? 'text-foreground'
                    : 'text-muted-foreground',
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
