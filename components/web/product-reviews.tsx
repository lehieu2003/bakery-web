'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useSubmitReview, useProductReviews } from '@/hooks/use-reviews';
import { useAuth } from '@/providers/auth-provider';
import type { Review } from '@/types/api.types';

const MAX_COMMENT_LENGTH = 2000;
const STAR = '★';

interface ProductReviewsSectionProps {
  productId: string;
  reviewCount: number;
  ratingAverage: number | null;
}

function StarRating({ rating, className }: { rating: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className ?? ''}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`text-sm leading-none ${
            i <= rating ? 'text-amber-400' : 'text-border'
          }`}
        >
          {STAR}
        </span>
      ))}
    </span>
  );
}

function ReviewItem({ review }: { review: Review }) {
  const displayName = review.user?.name ?? 'Khách';

  return (
    <li className='flex gap-3 py-4 border-b border-border/50 last:border-0'>
      <span className='flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold'>
        {displayName.charAt(0).toUpperCase()}
      </span>
      <div className='min-w-0 space-y-1'>
        <div className='flex items-baseline gap-2'>
          <span className='text-sm font-medium text-foreground'>
            {displayName}
          </span>
          <span className='text-xs text-muted-foreground'>
            {new Date(review.createdAt).toLocaleDateString('vi-VN')}
          </span>
        </div>
        <StarRating rating={review.rating} />
        {review.comment && (
          <p className='text-sm text-foreground/90 leading-relaxed'>
            {review.comment}
          </p>
        )}
      </div>
    </li>
  );
}

export default function ProductReviewsSection({
  productId,
  reviewCount,
  ratingAverage,
}: ProductReviewsSectionProps) {
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = useProductReviews(productId);
  const { mutateAsync, isPending, isError } = useSubmitReview(productId);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const reviews = data?.reviews ?? [];
  const hasStats = reviewCount > 0;

  async function handleSubmit() {
    if (rating < 1) return;

    const payload: { rating: number; comment?: string } = { rating };
    const trimmedComment = comment.trim();
    if (trimmedComment.length > 0) {
      payload.comment = trimmedComment;
    }

    try {
      await mutateAsync(payload);
      setRating(0);
      setComment('');
    } catch {
      // Kept silent here: the error state is rendered below the form.
    }
  }

  return (
    <section className='mt-8' aria-label='Đánh giá sản phẩm'>
      {hasStats && (
        <div className='flex items-center gap-2'>
          <StarRating rating={Math.round(ratingAverage ?? 0)} />
          <span className='text-sm text-muted-foreground'>
            ({reviewCount} đánh giá)
          </span>
        </div>
      )}

      <div className='mt-4'>
        {isLoading ? (
          <p className='text-sm text-muted-foreground py-4'>
            Đang tải đánh giá...
          </p>
        ) : reviews.length === 0 ? (
          <p className='text-sm text-muted-foreground py-4'>
            Chưa có đánh giá nào.
          </p>
        ) : (
          <ul>
            {reviews.map((review) => (
              <ReviewItem key={review.id} review={review} />
            ))}
          </ul>
        )}
      </div>

      {isAuthenticated ? (
        <div className='mt-6 rounded-2xl border border-border/50 bg-card p-5 space-y-4'>
          <p className='text-xs font-semibold text-muted-foreground uppercase tracking-widest'>
            Đánh giá của bạn
          </p>
          <div className='flex items-center gap-1'>
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type='button'
                aria-label={`${i} sao`}
                onClick={() => setRating(i)}
                className={`text-2xl leading-none transition-colors focus:outline-none ${
                  i <= rating ? 'text-amber-400' : 'text-border hover:text-amber-200'
                }`}
              >
                {STAR}
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={MAX_COMMENT_LENGTH}
            placeholder='Chia sẻ cảm nhận của bạn về sản phẩm...'
            rows={3}
            className='w-full text-sm bg-background rounded-xl px-4 py-3 border border-border focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground transition-colors resize-none'
          />
          <div className='flex items-center justify-between gap-4'>
            <p className='text-xs text-muted-foreground'>
              {comment.length}/{MAX_COMMENT_LENGTH}
            </p>
            <button
              type='button'
              onClick={handleSubmit}
              disabled={isPending || rating < 1}
              className='px-6 py-2.5 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
            >
              {isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </div>
          {isError && (
            <p className='text-xs text-destructive'>
              Không thể gửi đánh giá. Vui lòng thử lại.
            </p>
          )}
        </div>
      ) : (
        <p className='mt-6 text-sm text-muted-foreground'>
          <Link
            href={`/auth?redirect=/products/${productId}`}
            className='text-primary underline underline-offset-2'
          >
            Đăng nhập để đánh giá
          </Link>
        </p>
      )}
    </section>
  );
}
