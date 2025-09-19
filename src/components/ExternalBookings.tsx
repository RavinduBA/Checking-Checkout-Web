import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Users, MapPin, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface ExternalBooking {
  id: string;
  external_id: string;
  property_id: string;
  source: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  status: string;
  total_amount: number | null;
  currency: string;
  location_id: string | null;
  room_name: string | null;
  adults: number;
  children: number;
  created_at: string;
  last_synced_at: string | null;
  locations?: {
    name: string;
  } | null;
}

interface ExternalBookingsProps {
  locationId?: string;
  className?: string;
}

export const ExternalBookings = ({ locationId, className = "" }: ExternalBookingsProps) => {
  const [bookings, setBookings] = useState<ExternalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchExternalBookings = async () => {
    try {
      let query = supabase
        .from('external_bookings')
        .select(`
          *,
          locations(name)
        `)
        .order('check_in', { ascending: true });

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching external bookings:', error);
        toast.error('Failed to fetch external bookings');
        return;
      }

      setBookings((data as unknown as ExternalBooking[]) || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fetch external bookings');
    } finally {
      setLoading(false);
    }
  };

  const syncBookings = async () => {
    setSyncing(true);
    try {
      console.log('Starting manual sync of booking channel data...');
      
      const { data, error } = await supabase.functions.invoke('fetch-channel-bookings');

      if (error) {
        console.error('Sync error:', error);
        toast.error('Failed to sync bookings: ' + error.message);
        return;
      }

      console.log('Sync result:', data);
      
      if (data?.success) {
        toast.success(data.message || 'Bookings synced successfully');
        // Refresh the bookings list
        await fetchExternalBookings();
      } else {
        toast.error(data?.error || 'Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync bookings');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchExternalBookings();
  }, [locationId]);

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'airbnb':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'booking_com':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'booked':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            External Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            External Bookings ({bookings.length})
          </CardTitle>
          <Button 
            onClick={syncBookings} 
            disabled={syncing}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync Now
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {bookings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No external bookings found</p>
            <p className="text-sm mt-2">Click "Sync Now" to fetch bookings from booking channels</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="border rounded-lg p-4 space-y-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium">{booking.guest_name}</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-4 w-4" />
                        {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {booking.adults + booking.children} guests
                      </span>
                      {booking.locations && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {booking.locations.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                      <Badge className={getSourceBadgeColor(booking.source)}>
                        {booking.source === 'airbnb' ? 'Airbnb' : 
                         booking.source === 'booking_com' ? 'Booking.com' : booking.source}
                      </Badge>
                      <Badge className={getStatusBadgeColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </div>
                    {booking.total_amount && (
                      <span className="text-sm font-medium">
                        {booking.currency} {booking.total_amount}
                      </span>
                    )}
                  </div>
                </div>
                
                {booking.room_name && (
                  <div className="text-sm text-muted-foreground">
                    Room: {booking.room_name}
                  </div>
                )}
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Booking ID: {booking.external_id}</span>
                  {booking.last_synced_at && (
                    <span>
                      Last synced: {formatDate(booking.last_synced_at)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};