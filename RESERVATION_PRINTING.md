# Reservation Printing System

This system provides comprehensive reservation printing functionality using `react-to-print` library. It includes multiple components and hooks for different use cases.

## Components Overview

### 1. `ReservationPrintableView`
The main printable component that renders a detailed reservation confirmation with all information including:
- Guest information with full contact details
- Room and accommodation details with amenities
- Booking status and source information
- Commission details (guide and agent commissions)
- Special requests
- Financial summary with currency formatting
- Terms and conditions
- Professional formatting with print-specific styles

**Usage:**
```tsx
import { ReservationPrintableView } from '@/components/ReservationPrintableView';

<ReservationPrintableView reservation={reservationData} />
```

### 2. `ReservationPrintButton`
A reusable button component that handles all printing logic internally. Just pass the reservation data and customize the button appearance.

**Usage:**
```tsx
import { ReservationPrintButton } from '@/components/ReservationPrintButton';

<ReservationPrintButton 
  reservation={reservationData}
  buttonText="Print Reservation"
  buttonVariant="outline"
  buttonSize="sm"
/>
```

**Props:**
- `reservation`: The reservation data object
- `buttonText`: Text to display on the button (default: "Print")
- `buttonVariant`: Button style variant (default: "outline")
- `buttonSize`: Button size (default: "sm")
- `showIcon`: Whether to show printer icon (default: true)
- `className`: Additional CSS classes

### 3. `useReservationPrint` Hook
A custom hook for advanced printing integration. Provides direct access to print functionality.

**Usage:**
```tsx
import { useReservationPrint } from '@/hooks/useReservationPrint';

const MyComponent = () => {
  const { printRef, printReservation } = useReservationPrint();

  const handlePrint = () => {
    printReservation(reservationData);
  };

  return (
    <div>
      <button onClick={handlePrint}>Print</button>
      <div ref={printRef} className="hidden">
        <ReservationPrintableView reservation={reservationData} />
      </div>
    </div>
  );
};
```

## Data Structure

The reservation data should include the following structure:

```typescript
interface PrintableReservationData {
  id: string;
  reservation_number: string;
  location_id: string;
  room_id: string;
  guest_name: string;
  guest_email?: string | null;
  guest_phone?: string | null;
  guest_address?: string | null;
  guest_id_number?: string | null;
  guest_nationality?: string | null;
  adults: number;
  children: number;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  room_rate: number;
  total_amount: number;
  advance_amount?: number;
  paid_amount?: number;
  balance_amount?: number;
  currency: string;
  status: string;
  special_requests?: string | null;
  arrival_time?: string | null;
  created_by?: string | null;
  grc_approved: boolean;
  grc_approved_by?: string | null;
  grc_approved_at?: string | null;
  created_at: string;
  updated_at: string;
  guide_id?: string | null;
  agent_id?: string | null;
  guide_commission?: number;
  agent_commission?: number;
  booking_source: string;
  locations?: {
    id: string;
    name: string;
    is_active: boolean;
    created_at: string;
  };
  rooms?: {
    id: string;
    bed_type: string;
    currency: string;
    amenities: string[];
    is_active: boolean;
    room_type: string;
    base_price: number;
    created_at: string;
    updated_at: string;
    description: string;
    location_id: string;
    room_number: string;
    max_occupancy: number;
    property_type: string;
  };
}
```

## Integration Examples

### In Reservation Lists
```tsx
// In ReservationsList.tsx or similar components
import { ReservationPrintButton } from '@/components/ReservationPrintButton';

const ReservationRow = ({ reservation }) => (
  <tr>
    <td>{reservation.reservation_number}</td>
    <td>{reservation.guest_name}</td>
    <td>
      <ReservationPrintButton 
        reservation={reservation}
        buttonSize="sm"
        buttonVariant="ghost"
      />
    </td>
  </tr>
);
```

### In Reservation Details Pages
```tsx
// In ReservationDetails.tsx or similar components
import { ReservationPrintButton } from '@/components/ReservationPrintButton';

const ReservationDetails = ({ reservation }) => (
  <div>
    <div className="flex justify-between items-center mb-6">
      <h1>Reservation Details</h1>
      <ReservationPrintButton 
        reservation={reservation}
        buttonText="Print Confirmation"
        buttonVariant="default"
        buttonSize="lg"
      />
    </div>
    {/* Rest of the component */}
  </div>
);
```

### Custom Integration with Hook
```tsx
// For more complex scenarios
import { useReservationPrint } from '@/hooks/useReservationPrint';
import { ReservationPrintableView } from '@/components/ReservationPrintableView';

const CustomComponent = ({ reservations }) => {
  const { printRef, printReservation } = useReservationPrint();
  const [selectedReservation, setSelectedReservation] = useState(null);

  const handlePrintSelected = () => {
    if (selectedReservation) {
      printReservation(selectedReservation);
    }
  };

  return (
    <div>
      {/* Custom UI for selecting reservation */}
      <button onClick={handlePrintSelected}>Print Selected</button>
      
      {selectedReservation && (
        <div ref={printRef} className="hidden">
          <ReservationPrintableView reservation={selectedReservation} />
        </div>
      )}
    </div>
  );
};
```

## Features

### Print Styling
- A4 page size optimized
- Professional layout with proper spacing
- Color-coded sections for easy reading
- Print-specific CSS that hides navigation elements
- Responsive design that works on screen and print

### Data Presentation
- Currency formatting with symbols (USD: $, LKR: Rs., EUR: €, GBP: £)
- Date formatting with readable formats
- Status badges with appropriate colors
- Commission details clearly displayed
- Room amenities as styled tags
- Comprehensive guest and booking information

### Browser Compatibility
- Works with all modern browsers
- Handles print dialog automatically
- Maintains formatting across different devices
- Supports custom page styling

## Installation

The system requires `react-to-print` which is already installed:

```bash
bun add react-to-print
```

## File Structure

```
src/
├── components/
│   ├── ReservationPrintableView.tsx    # Main printable component
│   ├── ReservationPrintButton.tsx      # Reusable print button
│   └── ReservationPrintDemo.tsx        # Demo/example component
├── hooks/
│   └── useReservationPrint.tsx         # Custom printing hook
```

## Notes

- Always ensure reservation data includes the `locations` and `rooms` nested objects for complete information
- The system handles missing optional fields gracefully by showing "N/A"
- Commission details are only displayed if present in the data
- Special requests section is only shown if requests exist
- The print button can be customized extensively using the provided props