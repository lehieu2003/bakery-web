/**
 * Where the order summary drawer exists. The cart and checkout pages show
 * the cart as their main view, and admin has no storefront cart; there the
 * header cart icon links to /cart instead of opening the drawer.
 */
export function hasOrderSummary(pathname: string | null) {
  return !(
    pathname === '/cart' ||
    pathname?.startsWith('/checkout') ||
    pathname?.startsWith('/admin')
  );
}
