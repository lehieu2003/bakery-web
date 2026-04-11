# TanStack Query Flow

## End-to-End Flow
1. App khởi tạo `QueryClient` trong `QueryProvider` và bọc toàn bộ UI bằng `QueryClientProvider`.
2. Hook trong `hooks/` và `hooks/admin/` gọi `useQuery`/`useMutation` theo từng domain.
3. Hook gọi `services/*`, service gọi `http` client ở `lib/api/client.ts`.
4. API route xử lý ở `app/api/**/route.ts`, trả dữ liệu về query cache.
5. Sau mutation, cache được đồng bộ bằng `invalidateQueries` hoặc `setQueryData`.

## Global Defaults
- File: `providers/query-provider.tsx`
- `refetchOnWindowFocus: false`
- Query `retry: 1`, Mutation `retry: 0`
- `staleTime` mặc định 60s
- `gcTime` 24h
- Devtools chỉ bật ở môi trường development

## SSR Hydration (Web Layout)
- File: `app/(web)/layout.tsx`
- Server prefetch categories bằng `prefetchQuery({ queryKey: ['categories'] })`
- Hydrate xuống client bằng `HydrationBoundary` + `dehydrate(queryClient)`
- Hook `useCategories()` tái sử dụng key `['categories']` để đọc cache sẵn có.

## Query Key Map (Public)
- `authKeys`: `['auth']` -> user profile/session.
- `productKeys`: `['products']` + list/detail/related/best-sellers/filters.
- `bannerKeys`: `['banners']` -> active banners.
- `blogKeys`: `['blog']` -> posts/post/categories/tags.
- `wishlistKeys`: `['wishlist']` -> wishlist list.
- `orderKeys`: `['orders']` -> list theo scope `auth|guest`.
- `userNotificationKeys`: `['notifications']` -> list + infinite feed.
- `membershipBenefitsKeys`: `['membership','benefits']`.
- `availableIncentivesKeys`: `['incentives','available']` + subtotal/cart fingerprint.
- `personalizedRecommendationsKeys`: `['products','personalized']` + limit.

## Query Key Map (Admin)
- Tất cả key admin dùng prefix `['admin', ...]`.
- Domains hiện có: `products`, `categories`, `orders`, `customers`, `dashboard`, `settings`, `membership`, `notifications`, `banners`, `pages`, `menu`, `product-attributes`, `blog-posts`, `blog-categories`, `blog-tags`.
- Mỗi domain theo pattern thống nhất: `all -> lists/list -> details/detail`.

## Cache Update Strategy
- Mặc định: mutation xong `invalidateQueries` cho list/detail liên quan.
- Trường hợp cần UX mượt: dùng `setQueryData` (wishlist, reorder admin categories/banners) rồi fallback invalidate khi lỗi.
- Notification flow: invalidate toàn bộ `userNotificationKeys.all` sau thao tác mark-read.

## Khi Thêm Feature Mới
1. Tạo key factory trong hook domain (`all`, `lists`, `list`, `details`, `detail`).
2. Đặt query key chứa đủ tham số filter để tránh cache đè nhau.
3. Chọn một chiến lược sau mutation: invalidate hoặc optimistic update.
4. Nếu có SSR prefetch, đảm bảo key server/client giống hệt nhau.
