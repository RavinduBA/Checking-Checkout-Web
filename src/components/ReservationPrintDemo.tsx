import React from 'react';
import { ReservationPrintableView } from '@/components/ReservationPrintableView';

// Example usage component demonstrating how to use the ReservationPrintableView
export const ReservationPrintDemo = () => {
  // Example reservation data (same as provided by user)
  const sampleReservation = {
    "id": "e5d670dd-e41d-4aec-9269-18b122bc3fa2",
    "reservation_number": "RES20250008",
    "location_id": "a24ed6cf-11cd-40b8-8a29-8f9546822ca8",
    "room_id": "b184a03f-9b0e-4b7a-9ba6-dcaadd76a4ba",
    "guest_name": "test 45",
    "guest_email": "uu@g.com",
    "guest_phone": null,
    "guest_address": null,
    "guest_id_number": null,
    "guest_nationality": null,
    "adults": 1,
    "children": 0,
    "check_in_date": "2025-09-25",
    "check_out_date": "2025-09-30",
    "nights": 5,
    "room_rate": 10000,
    "total_amount": 50000,
    "advance_amount": 0,
    "paid_amount": 50000,
    "balance_amount": 0,
    "currency": "LKR",
    "status": "confirmed",
    "special_requests": null,
    "arrival_time": null,
    "created_by": null,
    "grc_approved": false,
    "grc_approved_by": null,
    "grc_approved_at": null,
    "created_at": "2025-09-24T06:03:05.237536+00:00",
    "updated_at": "2025-09-24T06:03:45.888076+00:00",
    "guide_id": "a4d0de6e-1394-433c-a26b-1638e4e7a5ad",
    "agent_id": "24355400-ca40-4de6-8af5-affa5f065d12",
    "guide_commission": 4000,
    "agent_commission": 7000,
    "booking_source": "direct",
    "locations": {
        "id": "a24ed6cf-11cd-40b8-8a29-8f9546822ca8",
        "name": "Antiqua Serenity",
        "is_active": true,
        "created_at": "2025-09-23T09:18:26.23406+00:00"
    },
    "rooms": {
        "id": "b184a03f-9b0e-4b7a-9ba6-dcaadd76a4ba",
        "bed_type": "Double",
        "currency": "LKR",
        "amenities": [
            "Safe",
            "TV",
            "Garden View"
        ],
        "is_active": true,
        "room_type": "Deluxe",
        "base_price": 10000,
        "created_at": "2025-09-23T09:32:50.174944+00:00",
        "updated_at": "2025-09-23T09:33:08.169338+00:00",
        "description": "",
        "location_id": "a24ed6cf-11cd-40b8-8a29-8f9546822ca8",
        "room_number": "102",
        "max_occupancy": 2,
        "property_type": "Room"
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Reservation Print Demo</h1>
      <div className="max-w-4xl mx-auto">
        <ReservationPrintableView reservation={sampleReservation} />
      </div>
    </div>
  );
};

export default ReservationPrintDemo;