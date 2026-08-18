# Component Inventory

## Summary

- UI primitives (`components/ui`): ~58 files
- Custom reusable components (`components/ui-custom`): 4 files
- Web shell components (`components/web`): 4 files
- Admin components (`components/admin`): 5 files
- Screen-level components (`components/screens`): ~21 files

## Notable UI Primitive Groups

- Inputs/forms: `input.tsx`, `textarea.tsx`, `select.tsx`, `form.tsx`, `field.tsx`
- Overlays/navigation: `dialog.tsx`, `sheet.tsx`, `dropdown-menu.tsx`, `tooltip.tsx`, `sidebar.tsx`
- Data display: `table.tsx`, `card.tsx`, `badge.tsx`, `chart.tsx`
- Feedback/loading: `toast.tsx`, `toaster.tsx`, `spinner.tsx`, `skeleton.tsx`

## Feature Components

- Storefront screens: `HomeScreen`, `ProductDetailScreen`, `CartScreen`, `Checkout*Screen`, `SearchScreen`
- Admin shell and management UI: `AdminShell`, `AdminSidebar`, `ProductForm`, `ProductListView`
- Marketing/utility widgets: `BannerCarousel`, `ChatbotBubble`

## Component Conventions

- `PascalCase.tsx` for feature/screen/admin components
- `kebab-case.tsx` for many primitive/ui files
- Shared token-driven styling via Tailwind/CSS variables
- Re-export and alias usage through `@/components`, `@/components/ui`
