# Copilot Instructions

This is a hospitality ERP system built with React, TypeScript, Vite, and Supabase. The app manages hotel reservations, income/expenses, reports, and booking channels integration.

## Core Architecture

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL database, Auth, Edge Functions)
- **State**: Context API for auth/location, TanStack Query for data fetching
- **Routing**: React Router v6 with nested protected routes

## Key Domain Concepts

### Multi-Location & Permission System
The app is multi-tenant supporting multiple hotel locations. Users have granular permissions per location:
- Permissions: `dashboard`, `income`, `expenses`, `reports`, `calendar`, `bookings`, `rooms`, `master_files`, `accounts`, `users`, `settings`, `booking_channels`
- Admin role bypasses all permission checks
- Use `usePermissions()` hook and `PermissionRoute` component for access control

### Routing Patterns
All protected routes follow this structure:
```tsx
<Route path="/page" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
  <Route index element={<PermissionRoute permission="feature"><Component /></PermissionRoute>} />
</Route>
```

### Component Organization
- **Pages**: In `/src/pages/` for route components
- **Components**: Shared UI in `/src/components/`, domain-specific in subfolders
- **UI Components**: shadcn/ui components in `/src/components/ui/`
- **Contexts**: Auth and Location management
- **Hooks**: Custom hooks like `usePermissions`, `useProfile`

## Supabase Integration

### Database Patterns
- Foreign key relationships extensively used (reservations → rooms → locations)
- RPC functions for complex queries: `get_user_permissions`, `is_email_allowed`
- Type-safe database access via generated types in `/src/integrations/supabase/types.ts`

### Auth Flow
- Email-based authentication with Supabase Auth
- Profile creation on signup with role assignment
- Email allowlist validation via `is_email_allowed` RPC
- Session persistence in localStorage

### Edge Functions
Located in `/supabase/functions/`:
- `send-sms-notification`: SMS alerts for financial transactions
- `booking-reminders`: Scheduled booking notifications
- `fetch-beds24-bookings`: External booking sync
- `clear-bookings`: Booking cleanup utility

## Development Workflow

### Key Commands
- `bun dev` - Start development server
- `bun build` - Production build
- `bun build:dev` - Development build

### State Management
- Auth state: `AuthContext` + `useAuth()`
- Location switching: `LocationContext` + `useLocationContext()`
- Data fetching: TanStack Query with Supabase

### Common Patterns

#### Permission Checking
```tsx
const { hasAnyPermission, hasPermission } = usePermissions();
if (!hasAnyPermission("income")) return <AccessDenied />;
```

#### Data Fetching
```tsx
const { data, loading } = useQuery({
  queryKey: ['reservations', locationId],
  queryFn: () => supabase.from('reservations').select('*')
});
```

#### Location-Aware Components
Always filter data by selected location when applicable using `useLocationContext()`.

## Integration Points

### External Booking Channels
- Beds24 integration via Edge Functions
- iCal sync for calendar management
- External bookings stored separately from internal reservations

### SMS Notifications
- Hutch SMS API integration for payment/booking alerts
- Token-based authentication with automatic renewal
- Configurable message templates

## File Conventions

- TypeScript throughout with strict types from Supabase
- Kebab-case for files/directories
- PascalCase for components
- Database types auto-generated, never edit manually
- Use absolute imports with `@/` prefix

## Critical Implementation Notes

- Always wrap protected routes with both `ProtectedRoute` and `PermissionRoute`
- Use `SmartRedirect` to route users to their first accessible page
- Handle loading states consistently with provided spinner components
- Currency handling via `LKR`, `USD`, `EUR`, `GBP` enum values
- Toast notifications via sonner for user feedback