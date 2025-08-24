import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Tables, Database } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { Calendar, MapPin, User, DollarSign, Zap } from "lucide-react";

type Booking = Tables<"bookings"> & {
  locations: Tables<"locations">;
};

type Account = Tables<"accounts">;

interface BookingShortcutsProps {
  locationId: string;
  accounts: Account[];
  onQuickFill: (data: {
    type: Database["public"]["Enums"]["income_type"];
    amount: string;
    accountId: string;
    dateFrom: string;
    dateTo: string;
    bookingSource: Database["public"]["Enums"]["booking_source"];
    guestName: string;
  }) => void;
}

export function BookingShortcuts({ locationId, accounts, onQuickFill }: BookingShortcutsProps) {
  const [todaysBookings, setTodaysBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (locationId) {
      fetchTodaysBookings();
    }
  }, [locationId]);

  const fetchTodaysBookings = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      
      // Check for bookings where today is between check-in and check-out dates
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select(`
          *,
          locations (*)
        `)
        .eq("location_id", locationId)
        .lte("check_in", today)
        .gt("check_out", today); // Check-out is after today (guests still here)

      setTodaysBookings(bookingsData || []);
    } catch (error) {
      console.error("Error fetching today's bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAccountForBooking = (booking: Booking): Account | undefined => {
    const locationName = booking.locations.name;
    const source = booking.source;

    // Account mapping logic based on location and source
    if (locationName === "Rusty Bunk") {
      if (source === "booking_com") {
        return accounts.find(acc => acc.name === "RB-CASH ON HAND-LKR");
      } else if (source === "airbnb") {
        return accounts.find(acc => acc.name === "Payoneer jayathu");
      } else {
        return accounts.find(acc => acc.name === "RB-CASH ON HAND-LKR");
      }
    } else if (locationName === "Asaliya Villa") {
      if (source === "airbnb") {
        return accounts.find(acc => acc.name === "Payoneer jayathu");
      } else {
        return accounts.find(acc => acc.name === "Asaliya Cash-LKR");
      }
    }

    return accounts[0]; // Fallback to first account
  };

  const getSourceIcon = (source: string) => {
    const icons = {
      booking_com: "🏨",
      airbnb: "🏠", 
      direct: "📞"
    };
    return icons[source as keyof typeof icons] || "📅";
  };

  const getSourceColor = (source: string) => {
    const colors = {
      booking_com: "border-yellow-300 bg-yellow-50",
      airbnb: "border-pink-300 bg-pink-50",
      direct: "border-orange-300 bg-orange-50"
    };
    return colors[source as keyof typeof colors] || "border-gray-300 bg-gray-50";
  };

  const handleQuickFill = (booking: Booking) => {
    const account = getAccountForBooking(booking);
    if (!account) return;

    const checkInDate = format(new Date(booking.check_in), "yyyy-MM-dd");
    const checkOutDate = format(new Date(booking.check_out), "yyyy-MM-dd");

    onQuickFill({
      type: "booking",
      amount: "25000",
      accountId: account.id,
      dateFrom: checkInDate,
      dateTo: checkOutDate,
      bookingSource: booking.source,
      guestName: booking.guest_name,
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-20 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (todaysBookings.length === 0) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-blue-800 flex items-center gap-2 text-base">
          <Zap className="h-4 w-4" />
          Today's Booking Shortcuts
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3">
          {todaysBookings.map((booking) => {
            const account = getAccountForBooking(booking);
            const currencySymbol = account?.currency === "USD" ? "$" : "Rs.";
            
            return (
              <Button
                key={booking.id}
                variant="outline"
                className={`w-full p-4 h-auto flex flex-col items-start gap-2 hover:shadow-md transition-all ${getSourceColor(booking.source)}`}
                onClick={() => handleQuickFill(booking)}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getSourceIcon(booking.source)}</span>
                    <Badge variant="secondary" className="text-xs">
                      {booking.source === "booking_com" ? "Booking.com" : 
                       booking.source === "airbnb" ? "Airbnb" : "Direct"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-medium">
                    <DollarSign className="h-3 w-3" />
                    {currencySymbol}25,000
                  </div>
                </div>
                
                <div className="w-full text-left space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3 w-3" />
                    <span className="font-medium">{booking.guest_name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {format(new Date(booking.check_in), "MMM dd")} - {format(new Date(booking.check_out), "MMM dd")}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{account?.name} ({account?.currency})</span>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
        
        <div className="text-xs text-blue-600 text-center mt-2 italic">
          Tap any booking to auto-fill the form with suggested values
        </div>
      </CardContent>
    </Card>
  );
}