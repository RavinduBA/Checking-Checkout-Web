import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type Reservation = Tables<"reservations"> & {
  locations: Tables<"locations">;
  rooms: Tables<"rooms">;
};

type Room = Tables<"rooms">;
type Location = Tables<"locations">;

export default function EnhancedCalendar() {
  const navigate = useNavigate();
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch locations
      const { data: locationsData } = await supabase
        .from("locations")
        .select("*")
        .eq("is_active", true);

      // Fetch rooms
      const { data: roomsData } = await supabase
        .from("rooms")
        .select("*")
        .eq("is_active", true)
        .order("room_number");

      // Fetch reservations
      const { data: reservationsData } = await supabase
        .from("reservations")
        .select(`
          *,
          locations (*),
          rooms (*)
        `)
        .order("check_in_date", { ascending: true });

      setLocations(locationsData || []);
      setRooms(roomsData || []);
      setReservations(reservationsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = rooms.filter(room => 
    selectedLocation === "all" || room.location_id === selectedLocation
  );

  const filteredReservations = reservations.filter(reservation => 
    selectedLocation === "all" || reservation.location_id === selectedLocation
  );

  // Generate calendar days for current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get bookings for a specific room and date
  const getBookingsForRoomAndDate = (roomId: string, date: Date) => {
    return filteredReservations.filter(reservation => {
      const checkIn = new Date(reservation.check_in_date);
      const checkOut = new Date(reservation.check_out_date);
      return date >= checkIn && date < checkOut && reservation.room_id === roomId;
    });
  };

  // Get booking that spans across a range for continuous display
  const getBookingSpanForRoom = (roomId: string, startDate: Date, endDate: Date) => {
    const bookingsInRange = filteredReservations.filter(reservation => {
      const checkIn = new Date(reservation.check_in_date);
      const checkOut = new Date(reservation.check_out_date);
      return reservation.room_id === roomId && 
             ((checkIn >= startDate && checkIn < endDate) ||
              (checkOut > startDate && checkOut <= endDate) ||
              (checkIn <= startDate && checkOut >= endDate));
    });
    return bookingsInRange;
  };

  // Get status color for reservations
  const getStatusColor = (status: string) => {
    const colors = {
      confirmed: "bg-green-500",
      tentative: "bg-yellow-500",
      pending: "bg-blue-500",
      cancelled: "bg-red-500",
      checked_in: "bg-purple-500",
      checked_out: "bg-gray-500"
    };
    return colors[status as keyof typeof colors] || "bg-gray-400";
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-64">Loading...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold">Calendar View</h1>
          <p className="text-muted-foreground">Visual booking calendar with room timeline</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/app/reservations/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            New Reservation
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'timeline' | 'grid')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="timeline">Timeline</SelectItem>
              <SelectItem value="grid">Grid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold px-4">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === 'timeline' ? (
        // Timeline View (similar to uploaded image)
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Calendar Header */}
              <div className="grid grid-cols-[200px_1fr] border-b bg-gray-50">
                <div className="p-3 font-semibold border-r">Rooms</div>
                <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${calendarDays.length}, minmax(40px, 1fr))` }}>
                  {calendarDays.map((day, index) => (
                    <div 
                      key={index} 
                      className={cn(
                        "p-2 text-center text-xs border-r font-medium",
                        isToday(day) && "bg-blue-100 text-blue-800",
                        !isSameMonth(day, currentDate) && "text-gray-400"
                      )}
                    >
                      <div>{format(day, 'd')}</div>
                      <div className="text-xs text-gray-500">{format(day, 'EEE')}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Room Rows */}
              {filteredRooms.map((room) => {
                const location = locations.find(l => l.id === room.location_id);
                return (
                  <div key={room.id} className="grid grid-cols-[200px_1fr] border-b hover:bg-gray-50/50">
                    {/* Room Info */}
                    <div className="p-3 border-r">
                      <div className="font-medium text-sm">{room.room_number}</div>
                      <div className="text-xs text-gray-500">{room.room_type}</div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {location?.name}
                      </Badge>
                    </div>

                    {/* Calendar Days for this Room */}
                    <div className="grid gap-0 relative" style={{ gridTemplateColumns: `repeat(${calendarDays.length}, minmax(40px, 1fr))` }}>
                      {calendarDays.map((day, dayIndex) => {
                        const bookings = getBookingsForRoomAndDate(room.id, day);
                        const booking = bookings[0];
                        
                        // Check if this is the start of a booking span
                        const isBookingStart = booking && new Date(booking.check_in_date).toDateString() === day.toDateString();
                        const isBookingEnd = booking && new Date(booking.check_out_date).toDateString() === day.toDateString();
                        
                        // Calculate span width for continuous bookings
                        let spanWidth = 1;
                        let shouldDisplay = true;
                        
                        if (booking) {
                          const checkIn = new Date(booking.check_in_date);
                          const checkOut = new Date(booking.check_out_date);
                          
                          // Only display the booking element on the first day
                          if (day.toDateString() !== checkIn.toDateString()) {
                            shouldDisplay = false;
                          } else {
                            // Calculate how many days this booking spans
                            const remainingDays = calendarDays.slice(dayIndex);
                            spanWidth = 0;
                            for (const remainingDay of remainingDays) {
                              if (remainingDay < checkOut) {
                                spanWidth++;
                              } else {
                                break;
                              }
                            }
                          }
                        }

                        return (
                          <div 
                            key={dayIndex} 
                            className={cn(
                              "h-16 border-r border-gray-200 relative flex items-center justify-center",
                              booking && !shouldDisplay && "bg-gray-50"
                            )}
                          >
                            {booking && shouldDisplay && (
                              <div 
                                className={cn(
                                  "absolute inset-1 rounded text-white text-xs p-1 cursor-pointer transition-all hover:opacity-80 z-10",
                                  getStatusColor(booking.status)
                                )}
                                style={{
                                  width: `${spanWidth * 100 + (spanWidth - 1) * 1}%`,
                                  minWidth: `${spanWidth * 41}px`
                                }}
                                onClick={() => navigate(`/app/reservations/${booking.id}`)}
                                title={`${booking.guest_name} - ${booking.status} (${format(new Date(booking.check_in_date), 'MMM dd')} - ${format(new Date(booking.check_out_date), 'MMM dd')})`}
                              >
                                <div className="font-medium truncate">
                                  {booking.guest_name.split(' ')[0]}
                                </div>
                                <div className="text-xs opacity-90">
                                  #{booking.reservation_number.slice(-4)}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="p-4 bg-gray-50 border-t">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>Confirmed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span>Tentative</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500 rounded"></div>
                <span>Checked In</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>Cancelled</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Grid View (Mobile-friendly cards with better responsive layout)
        <div className="space-y-4">
          {/* Mobile/Tablet View */}
          <div className="lg:hidden space-y-3">
            {filteredReservations.map((reservation) => (
              <Card key={reservation.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{reservation.guest_name}</h3>
                      <p className="text-xs text-muted-foreground">#{reservation.reservation_number}</p>
                    </div>
                    <Badge className={cn("text-white text-xs shrink-0 ml-2", getStatusColor(reservation.status))}>
                      {reservation.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium">Room:</span>
                      <span className="truncate">{reservation.rooms?.room_number} - {reservation.rooms?.room_type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium">Location:</span>
                      <span className="truncate">{reservation.locations?.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium">Dates:</span>
                      <span>{format(new Date(reservation.check_in_date), 'MMM dd')} - {format(new Date(reservation.check_out_date), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm font-bold">
                        {reservation.currency === 'USD' ? '$' : 'Rs. '}{reservation.total_amount.toLocaleString()}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/app/reservations/${reservation.id}`)}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop Grid View */}
          <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredReservations.map((reservation) => (
              <Card key={reservation.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-sm">{reservation.guest_name}</CardTitle>
                    <Badge className={cn("text-white", getStatusColor(reservation.status))}>
                      {reservation.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm text-gray-600">
                    <div>Room: {reservation.rooms?.room_number} - {reservation.rooms?.room_type}</div>
                    <div>Location: {reservation.locations?.name}</div>
                  </div>
                  <div className="text-sm">
                    <div>Check-in: {format(new Date(reservation.check_in_date), 'MMM dd, yyyy')}</div>
                    <div>Check-out: {format(new Date(reservation.check_out_date), 'MMM dd, yyyy')}</div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">
                      {reservation.currency === 'USD' ? '$' : 'Rs. '}{reservation.total_amount.toLocaleString()}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/app/reservations/${reservation.id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}