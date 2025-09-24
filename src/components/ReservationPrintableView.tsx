import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface ReservationPrintableData {
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

interface ReservationPrintableViewProps {
  reservation: ReservationPrintableData;
}

const PrintableReservation = React.forwardRef<HTMLDivElement, ReservationPrintableViewProps>(
  ({ reservation }, ref) => {
    const getCurrencySymbol = (currency: string) => {
      const symbols = { USD: '$', LKR: 'Rs. ', EUR: '€', GBP: '£' };
      return symbols[currency as keyof typeof symbols] || currency;
    };

    const getStatusColor = (status: string) => {
      switch (status.toLowerCase()) {
        case 'confirmed':
          return 'bg-green-100 text-green-800 border-green-300';
        case 'tentative':
          return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case 'pending':
          return 'bg-blue-100 text-blue-800 border-blue-300';
        case 'cancelled':
          return 'bg-red-100 text-red-800 border-red-300';
        case 'checked_in':
          return 'bg-purple-100 text-purple-800 border-purple-300';
        case 'checked_out':
          return 'bg-gray-100 text-gray-800 border-gray-300';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-300';
      }
    };

    return (
      <div ref={ref} className="print-container max-w-4xl mx-auto p-8 bg-white text-black" style={{ minHeight: '297mm' }}>
        {/* Print Styles */}
        <style>{`
          @media print {
            .print-container {
              margin: 0 !important;
              padding: 20px !important;
              box-shadow: none !important;
              background: white !important;
              color: black !important;
            }
            
            @page {
              size: A4;
              margin: 1cm;
            }
            
            .no-print {
              display: none !important;
            }
            
            .page-break {
              page-break-after: always;
            }
            
            .print-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 1rem;
            }
            
            .print-full-width {
              grid-column: 1 / -1;
            }
          }
          
          .print-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
          }
          
          .print-full-width {
            grid-column: 1 / -1;
          }
        `}</style>

        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
          <h1 className="text-3xl font-bold mb-2 text-blue-900">RESERVATION CONFIRMATION</h1>
          <div className="text-xl font-semibold text-gray-700 mb-2">
            {reservation.locations?.name || 'Hotel'}
          </div>
          <div className="text-lg text-gray-600 mb-2">
            Confirmation Number: <span className="font-bold text-blue-800">{reservation.reservation_number}</span>
          </div>
          <div className="text-sm text-gray-500">
            Booking ID: {reservation.id}
          </div>
        </div>

        {/* Guest Information */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 bg-blue-100 p-3 border-l-4 border-blue-500">
            📋 Guest Information
          </h2>
          <div className="print-grid">
            <div>
              <div className="mb-3">
                <span className="font-semibold text-gray-700">Name:</span> 
                <span className="ml-2 font-medium">{reservation.guest_name}</span>
              </div>
              <div className="mb-3">
                <span className="font-semibold text-gray-700">Email:</span> 
                <span className="ml-2">{reservation.guest_email || 'N/A'}</span>
              </div>
              <div className="mb-3">
                <span className="font-semibold text-gray-700">Phone:</span> 
                <span className="ml-2">{reservation.guest_phone || 'N/A'}</span>
              </div>
              <div className="mb-3">
                <span className="font-semibold text-gray-700">ID Number:</span> 
                <span className="ml-2">{reservation.guest_id_number || 'N/A'}</span>
              </div>
            </div>
            <div>
              <div className="mb-3">
                <span className="font-semibold text-gray-700">Nationality:</span> 
                <span className="ml-2">{reservation.guest_nationality || 'N/A'}</span>
              </div>
              <div className="mb-3">
                <span className="font-semibold text-gray-700">Adults:</span> 
                <span className="ml-2 font-medium">{reservation.adults}</span>
              </div>
              <div className="mb-3">
                <span className="font-semibold text-gray-700">Children:</span> 
                <span className="ml-2 font-medium">{reservation.children}</span>
              </div>
              <div className="mb-3">
                <span className="font-semibold text-gray-700">Total Guests:</span> 
                <span className="ml-2 font-medium">{reservation.adults + reservation.children}</span>
              </div>
            </div>
            {reservation.guest_address && (
              <div className="print-full-width mt-2">
                <span className="font-semibold text-gray-700">Address:</span> 
                <span className="ml-2">{reservation.guest_address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Room & Booking Details */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 bg-green-100 p-3 border-l-4 border-green-500">
            🏨 Accommodation Details
          </h2>
          <div className="print-grid">
            <div>
              <div className="mb-3">
                <span className="font-semibold text-gray-700">Room Number:</span> 
                <span className="ml-2 font-medium text-green-700">{reservation.rooms?.room_number}</span>
              </div>
              <div className="mb-3">
                <span className="font-semibold text-gray-700">Room Type:</span> 
                <span className="ml-2">{reservation.rooms?.room_type}</span>
              </div>
              <div className="mb-3">
                <span className="font-semibold text-gray-700">Bed Type:</span> 
                <span className="ml-2">{reservation.rooms?.bed_type}</span>
              </div>
              <div className="mb-3">
                <span className="font-semibold text-gray-700">Max Occupancy:</span> 
                <span className="ml-2">{reservation.rooms?.max_occupancy} guests</span>
              </div>
            </div>
            <div>
              <div className="mb-3">
                <span className="font-semibold text-gray-700">Check-in:</span> 
                <span className="ml-2 font-medium">{format(new Date(reservation.check_in_date), 'EEEE, MMMM do, yyyy')}</span>
              </div>
              <div className="mb-3">
                <span className="font-semibold text-gray-700">Check-out:</span> 
                <span className="ml-2 font-medium">{format(new Date(reservation.check_out_date), 'EEEE, MMMM do, yyyy')}</span>
              </div>
              <div className="mb-3">
                <span className="font-semibold text-gray-700">Duration:</span> 
                <span className="ml-2 font-medium">{reservation.nights} nights</span>
              </div>
              <div className="mb-3">
                <span className="font-semibold text-gray-700">Arrival Time:</span> 
                <span className="ml-2">{reservation.arrival_time || 'TBD'}</span>
              </div>
            </div>
          </div>
          
          {/* Room Amenities */}
          {reservation.rooms?.amenities && reservation.rooms.amenities.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 rounded border">
              <span className="font-semibold text-gray-700">Room Amenities:</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {reservation.rooms.amenities.map((amenity, index) => (
                  <span key={index} className="px-2 py-1 bg-green-200 text-green-800 text-sm rounded">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Booking Status & Source */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 bg-purple-100 p-3 border-l-4 border-purple-500">
            📊 Booking Status & Information
          </h2>
          <div className="print-grid">
            <div>
              <div className="mb-3">
                <span className="font-semibold text-gray-700">Status:</span> 
                <span className={`ml-2 px-3 py-1 rounded border font-medium ${getStatusColor(reservation.status)}`}>
                  {reservation.status.toUpperCase()}
                </span>
              </div>
              <div className="mb-3">
                <span className="font-semibold text-gray-700">Booking Source:</span> 
                <span className="ml-2 capitalize font-medium">{reservation.booking_source}</span>
              </div>
              <div className="mb-3">
                <span className="font-semibold text-gray-700">GRC Approved:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-sm font-medium ${
                  reservation.grc_approved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {reservation.grc_approved ? 'YES' : 'NO'}
                </span>
              </div>
            </div>
            <div>
              <div className="mb-3">
                <span className="font-semibold text-gray-700">Created:</span> 
                <span className="ml-2">{format(new Date(reservation.created_at), 'MMM do, yyyy \'at\' h:mm a')}</span>
              </div>
              <div className="mb-3">
                <span className="font-semibold text-gray-700">Last Updated:</span> 
                <span className="ml-2">{format(new Date(reservation.updated_at), 'MMM do, yyyy \'at\' h:mm a')}</span>
              </div>
              {reservation.grc_approved && reservation.grc_approved_at && (
                <div className="mb-3">
                  <span className="font-semibold text-gray-700">GRC Approved At:</span> 
                  <span className="ml-2">{format(new Date(reservation.grc_approved_at), 'MMM do, yyyy \'at\' h:mm a')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Commission Details */}
        {(reservation.guide_commission || reservation.agent_commission) && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 bg-orange-100 p-3 border-l-4 border-orange-500">
              💰 Commission Details
            </h2>
            <div className="print-grid">
              {reservation.guide_commission && (
                <div className="p-4 bg-orange-50 rounded border">
                  <div className="mb-2">
                    <span className="font-semibold text-gray-700">Guide Commission:</span>
                  </div>
                  <div className="text-lg font-bold text-orange-700">
                    {getCurrencySymbol(reservation.currency)}{reservation.guide_commission.toLocaleString()}
                  </div>
                  {reservation.guide_id && (
                    <div className="text-sm text-gray-600 mt-1">
                      Guide ID: {reservation.guide_id}
                    </div>
                  )}
                </div>
              )}
              {reservation.agent_commission && (
                <div className="p-4 bg-orange-50 rounded border">
                  <div className="mb-2">
                    <span className="font-semibold text-gray-700">Agent Commission:</span>
                  </div>
                  <div className="text-lg font-bold text-orange-700">
                    {getCurrencySymbol(reservation.currency)}{reservation.agent_commission.toLocaleString()}
                  </div>
                  {reservation.agent_id && (
                    <div className="text-sm text-gray-600 mt-1">
                      Agent ID: {reservation.agent_id}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Special Requests */}
        {reservation.special_requests && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 bg-purple-100 p-3 border-l-4 border-purple-500">
              📝 Special Requests
            </h2>
            <div className="p-4 bg-purple-50 rounded border">
              <div className="whitespace-pre-wrap">{reservation.special_requests}</div>
            </div>
          </div>
        )}

        {/* Financial Summary */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 bg-red-100 p-3 border-l-4 border-red-500">
            💵 Financial Summary
          </h2>
          <div className="bg-gray-50 p-6 rounded border">
            <table className="w-full">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-3 font-semibold text-gray-700">Room Rate (per night):</td>
                  <td className="py-3 text-right font-medium">{getCurrencySymbol(reservation.currency)}{reservation.room_rate.toLocaleString()}</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-3 font-semibold text-gray-700">Number of Nights:</td>
                  <td className="py-3 text-right font-medium">{reservation.nights}</td>
                </tr>
                <tr className="border-b-2 border-gray-400">
                  <td className="py-3 font-bold text-lg text-gray-800">Total Amount:</td>
                  <td className="py-3 text-right font-bold text-lg text-gray-800">{getCurrencySymbol(reservation.currency)}{reservation.total_amount.toLocaleString()}</td>
                </tr>
                {reservation.advance_amount !== undefined && reservation.advance_amount > 0 && (
                  <tr className="border-b border-gray-200">
                    <td className="py-3 font-semibold text-blue-700">Advance Amount:</td>
                    <td className="py-3 text-right text-blue-700 font-medium">{getCurrencySymbol(reservation.currency)}{reservation.advance_amount.toLocaleString()}</td>
                  </tr>
                )}
                <tr className="border-b border-gray-200">
                  <td className="py-3 font-semibold text-green-700">Paid Amount:</td>
                  <td className="py-3 text-right text-green-700 font-medium">{getCurrencySymbol(reservation.currency)}{(reservation.paid_amount || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-3 font-bold text-red-700 text-lg">Balance Due:</td>
                  <td className="py-3 text-right font-bold text-red-700 text-lg">{getCurrencySymbol(reservation.currency)}{(reservation.balance_amount || 0).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 bg-red-100 p-3 border-l-4 border-red-500">
            📋 Terms and Conditions
          </h2>
          <div className="text-sm space-y-2 bg-red-50 p-4 rounded border">
            <p><strong>Check-in:</strong> 2:00 PM | <strong>Check-out:</strong> 12:00 PM</p>
            <p><strong>Cancellation Policy:</strong> Cancellation must be made 48 hours before arrival</p>
            <p><strong>Identification:</strong> Valid government-issued ID required at check-in</p>
            <p><strong>Additional Charges:</strong> Extra services, minibar, and incidentals are charged separately</p>
            <p><strong>Early Check-in/Late Check-out:</strong> Subject to availability and may incur additional charges</p>
            <p><strong>Payment:</strong> All outstanding balances must be settled at check-in</p>
            <p><strong>Property Damage:</strong> Guests are responsible for any damage to hotel property</p>
            <p><strong>Management Rights:</strong> Management reserves the right to refuse service or terminate stay for violation of hotel policies</p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-300 pt-6 text-center text-sm text-gray-600">
          <div className="mb-3">
            <p className="text-lg font-semibold text-gray-800 mb-2">
              Thank you for choosing {reservation.locations?.name || 'our hotel'}!
            </p>
            <p className="text-gray-600">We look forward to providing you with an exceptional stay experience.</p>
          </div>
          <div className="border-t border-gray-200 pt-3 mt-3">
            <p>Generated on {format(new Date(), 'MMMM do, yyyy \'at\' h:mm a')}</p>
            <p className="mt-2 italic font-light">This is a system-generated confirmation. No signature required.</p>
          </div>
        </div>
      </div>
    );
  }
);

PrintableReservation.displayName = 'PrintableReservation';

export const ReservationPrintableView: React.FC<ReservationPrintableViewProps> = ({ reservation }) => {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Reservation-${reservation.reservation_number}`,
    pageStyle: `
      @page {
        size: A4;
        margin: 1cm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
        }
      }
    `,
  });

  return (
    <div className="space-y-4">
      <div className="no-print flex justify-center">
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Print Reservation
        </Button>
      </div>
      <PrintableReservation ref={componentRef} reservation={reservation} />
    </div>
  );
};

export default ReservationPrintableView;