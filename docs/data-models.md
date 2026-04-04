# Data Models

## Persistence Stack

- ORM: Prisma
- Database: PostgreSQL
- Schema source: `prisma/schema.prisma`
- Migration path: `prisma/migrations/*`

## Core Enums

- User and auth: `UserRole`, `OtpPurpose`, `MemberLevel`
- Commerce: `OrderStatus`, `DiscountType`, `PaymentMethod`
- Content/CMS: `MenuType`, `BlogPostStatus`, `NotificationStatus`
- Catalog attribute system: `ProductAttributeType`

## Core Domain Model Groups

### Identity and Session

- `User`
- `Session`
- `OtpVerification`

### Catalog and Merchandising

- `Category` (tree via self-relation)
- `Product`
- `ProductImage`
- `ProductVariant`
- `ProductCategory` (many-to-many)
- EAV-style attribute subsystem:
  - `ProductAttribute`
  - `ProductAttributeValue`
  - `ProductAttributeAssignment`

### Commerce and Customer Activity

- `Cart`, `CartItem`
- `Order`, `OrderItem`, `Payment`
- `Address`, `Review`, `Wishlist`, `Coupon`

### CMS and Content

- `MenuItem`, `Page`, `Banner`
- `BlogCategory`, `BlogTag`, `BlogPost`, `BlogPostTag`, `BlogComment`

### Notification and Settings

- `Notification`, `NotificationRead`
- `Setting`

## Data Modeling Notes

- Extensive use of indexes for common query paths (status, published date, sort order, foreign keys)
- `@updatedAt` for automatic update timestamps
- Cascading deletes in many relation edges for referential cleanup
- Attribute assignment table supports multiple value types (`textValue`, `numberValue`, `booleanValue`)
