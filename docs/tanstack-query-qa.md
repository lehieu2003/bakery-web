# TanStack Query Q&A (Project-Specific)

## 1) General workflow của TanStack Query trong dự án này?
1. Khởi tạo `QueryClient` ở `QueryProvider` và bọc app bằng `QueryClientProvider`.
2. Tổ chức query key theo domain trong `hooks/` và `hooks/admin/`.
3. Hook gọi service (`services/*`), service gọi HTTP client (`lib/api/client.ts`).
4. Dùng `useQuery` cho read, `useMutation` cho write.
5. Sau mutation, đồng bộ cache bằng `invalidateQueries` hoặc `setQueryData`.
6. Một số màn web dùng SSR prefetch + hydrate (`app/(web)/layout.tsx`).

## 2) `staleTime` hiện tại là bao nhiêu?
- Mặc định toàn app: **1 phút** (`60 * 1000`) trong `providers/query-provider.tsx`.
- Nhiều hook override theo feature: thường **2, 3, 5, 10 phút**.

## 3) Trong khoảng `< staleTime`, data lấy như thế nào?
- Query được xem là **fresh**.
- `useQuery` trả data cache ngay nếu đã có.
- Không tự refetch khi remount/focus theo cấu hình hiện tại, trừ khi bạn gọi `refetch` thủ công hoặc có trigger khác.

## 4) `refetchOnWindowFocus` là gì?
- Nếu `true`: quay lại tab/window có thể tự refetch query stale.
- Nếu `false`: quay lại tab/window không tự refetch.
- Repo này đang set global là **`false`**.

## 5) Vì sao không set global `refetchOnWindowFocus: true`?
- Giảm API calls dư khi user chuyển tab nhiều.
- Giảm flicker/UI nhảy trên list/admin pages.
- Dữ liệu sau thao tác ghi đã được đồng bộ chủ động bằng `invalidateQueries`/`setQueryData`.

## 6) Giả sử tạo new post thì sao?
- Hook admin create post gọi `invalidateQueries({ queryKey: blogPostKeys.lists() })`.
- List post bị mark stale và query active sẽ refetch để thấy post mới.
- Cơ chế này không phụ thuộc `refetchOnWindowFocus`.

## 7) `invalidateQueries` có phải chỉ mark stale không?
Đúng, bản chất là:
1. Mark query matching key thành **stale**.
2. Query đang active thường được refetch nền ngay (theo policy hiện tại).
