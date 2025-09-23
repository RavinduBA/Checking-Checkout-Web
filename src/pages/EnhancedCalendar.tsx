import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Filter, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SectionLoader } from "@/components/ui/loading-spinner";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, isWithinInterval, startOfDay, endOfDay, isSameDay } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type Reservation = Tables<"reservations"> & {
  locations: Tables<"locations">;
  rooms: Tables<"rooms">;
};

type Room = Tables<"rooms">;
type Location = Tables<"locations">;

export default function EnhancedCalendar() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');
  const [isQuickBookDialogOpen, setIsQuickBookDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-switch to grid view on mobile
  useEffect(() => {
    if (isMobile && viewMode === 'timeline') {
      setViewMode('grid');
    }
  }, [isMobile, viewMode]);

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
      const checkIn = startOfDay(parseISO(reservation.check_in_date));
      const checkOut = startOfDay(parseISO(reservation.check_out_date));
      const checkDate = startOfDay(date);
      
      return checkDate >= checkIn && 
             checkDate < checkOut && 
             reservation.room_id === roomId;
    });
  };

  // Calculate booking span within the calendar view
  const calculateBookingSpan = (booking: any, calendarDays: Date[]) => {
    const checkIn = startOfDay(parseISO(booking.check_in_date));
    const checkOut = startOfDay(parseISO(booking.check_out_date));
    
    // Find the start position in the calendar
    const startIndex = calendarDays.findIndex(day => isSameDay(startOfDay(day), checkIn));
    if (startIndex === -1) return { startIndex: -1, spanDays: 0, isVisible: false };
    
    // Calculate how many days the booking spans within the visible calendar
    let spanDays = 0;
    for (let i = startIndex; i < calendarDays.length; i++) {
      const currentDay = startOfDay(calendarDays[i]);
      if (currentDay < checkOut) {
        spanDays++;
      } else {
        break;
      }
    }
    
    return { 
      startIndex, 
      spanDays: Math.max(1, spanDays), 
      isVisible: startIndex >= 0 && spanDays > 0 
    };
  };

  // Get booking that spans across a range for continuous display
  const getBookingSpanForRoom = (roomId: string, startDate: Date, endDate: Date) => {
    const bookingsInRange = filteredReservations.filter(reservation => {
      const checkIn = parseISO(reservation.check_in_date);
      const checkOut = parseISO(reservation.check_out_date);
      
      return reservation.room_id === roomId && 
             ((checkIn >= startDate && checkIn < endDate) ||
              (checkOut > startDate && checkOut <= endDate) ||
              (checkIn <= startDate && checkOut >= endDate));
    });
    return bookingsInRange;
  };

  // Check if room is available for a date range
  const isRoomAvailable = (roomId: string, checkIn: Date, checkOut: Date, excludeReservationId?: string) => {
    return !filteredReservations.some(reservation => {
      if (excludeReservationId && reservation.id === excludeReservationId) return false;
      
      const resCheckIn = parseISO(reservation.check_in_date);
      const resCheckOut = parseISO(reservation.check_out_date);
      
      return reservation.room_id === roomId &&
             reservation.status !== 'cancelled' &&
             ((checkIn >= resCheckIn && checkIn < resCheckOut) ||
              (checkOut > resCheckIn && checkOut <= resCheckOut) ||
              (checkIn <= resCheckIn && checkOut >= resCheckOut));
    });
  };

  // Get status color for reservations
  const getStatusColor = (status: string) => {
    const colors = {
      confirmed: "bg-green-600",
      tentative: "bg-yellow-500", 
      pending: "bg-blue-600",
      cancelled: "bg-red-600",
      checked_in: "bg-purple-600",
      checked_out: "bg-gray-600"
    };
    return colors[status as keyof typeof colors] || "bg-gray-400";
  };

  const getStatusBorderColor = (status: string) => {
    const colors = {
      confirmed: "#22c55e",
      tentative: "#eab308", 
      pending: "#2563eb",
      cancelled: "#dc2626",
      checked_in: "#9333ea",
      checked_out: "#4b5563"
    };
    return colors[status as keyof typeof colors] || "#6b7280";
  };

  const handleBookingClick = (booking: Reservation) => {
    // If booking is tentative or pending, navigate to payment form
    if (booking.status === 'tentative' || booking.status === 'pending') {
      navigate(`/payments/new?reservation=${booking.id}`);
    } else {
      // Otherwise, view reservation details
      navigate(`/reservations/${booking.id}`);
    }
  };

  if (loading) {
    return <SectionLoader className="min-h-64" />;
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <p className="text-muted-foreground">Visual booking calendar with room timeline</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/reservations/new')} className="gap-2">
            <Plus className="size-4" />
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

          <Select value={viewMode} onValueChange={(value) => setViewMode(value as 'timeline' | 'grid')} disabled={isMobile}>
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
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-lg font-semibold px-4">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {viewMode === 'timeline' ? (
        // Timeline View (similar to uploaded image)
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Calendar Header */}
              <div className="grid grid-cols-[150px_1fr] border-b bg-gray-50">
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
                  <div key={room.id} className="grid grid-cols-[150px_1fr] border-b hover:bg-gray-50/50">
                    {/* Room Info */}
                    <div className="p-2 border-r">
                      <div className="flex items-center gap-1">

                      <div className="font-medium text-sm">{room.room_number}</div>
                      <div className="text-xs text-gray-500">{room.room_type}</div>
                      </div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {location?.name}
                      </Badge>
                    </div>

                    {/* Calendar Days for this Room */}
                    <div className="grid gap-0 relative" style={{ gridTemplateColumns: `repeat(${calendarDays.length}, minmax(40px, 1fr))` }}>
{(() => {
                        // Get all bookings for this room that intersect with the calendar view
                        const roomBookings = filteredReservations
                          .filter(reservation => reservation.room_id === room.id)
                          .map(booking => ({
                            ...booking,
                            span: calculateBookingSpan(booking, calendarDays)
                          }))
                          .filter(booking => booking.span.isVisible);

                        return calendarDays.map((day, dayIndex) => {
                          // Find booking that starts on this day
                          const bookingStartingToday = roomBookings.find(booking => 
                            booking.span.startIndex === dayIndex
                          );
                          
                          // Check if this day is occupied by any booking
                          const isOccupied = roomBookings.some(booking => 
                            dayIndex >= booking.span.startIndex && 
                            dayIndex < booking.span.startIndex + booking.span.spanDays
                          );

                          return (
                            <div 
                              key={dayIndex} 
                              className={cn(
                                "h-16 border-r border-gray-200 relative flex items-center justify-center",
                                isOccupied && !bookingStartingToday && "bg-gray-50"
                              )}
                            >
                              {bookingStartingToday && (
                                <div 
                                  className={cn(
                                    "absolute inset-0 rounded-lg text-white text-xs px-2 cursor-pointer transition-all z-10 border border-white/20 flex flex-col justify-between overflow-hidden",
                                    getStatusColor(bookingStartingToday.status)
                                  )}
                                  style={{
                                    width: `calc(${bookingStartingToday.span.spanDays * 100}% + ${(bookingStartingToday.span.spanDays - 1) * 1}px)`,
                                    minWidth: `${bookingStartingToday.span.spanDays * 38}px`
                                  }}
                                  onClick={() => handleBookingClick(bookingStartingToday)}
                                  title={`${bookingStartingToday.guest_name} - ${bookingStartingToday.status} (${format(parseISO(bookingStartingToday.check_in_date), 'MMM dd')} - ${format(parseISO(bookingStartingToday.check_out_date), 'MMM dd')})${(bookingStartingToday.status === 'tentative' || bookingStartingToday.status === 'pending') ? ' - Click to make payment' : ''}`}
                                >
                                  <div className="font-semibold truncate text-sm py-1">
                                    #{bookingStartingToday.reservation_number.slice(-4)} {bookingStartingToday.guest_name.split(' ')[0]}
                                  </div>
                                  {bookingStartingToday.span.spanDays > 2 && (
                                    <div className="text-xs opacity-90 flex items-center gap-1 pb-1">
                                      <span className="truncate">{bookingStartingToday.guest_name.split(' ').slice(1).join(' ')}</span>
                                      {(bookingStartingToday.status === 'tentative' || bookingStartingToday.status === 'pending') && (
                                        <span className="text-yellow-200 font-bold">💳</span>
                                      )}
                                    </div>
                                  )}
                                  {bookingStartingToday.span.spanDays > 4 && (
                                    <div className="text-xs opacity-75 pb-1">
                                      {bookingStartingToday.currency === 'USD' ? '$' : 'Rs. '}{bookingStartingToday.total_amount.toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {!isOccupied && (
                                <button
                                  className="w-full h-full hover:bg-blue-50 transition-colors flex items-center justify-center group"
                                  onClick={() => {
                                    setSelectedRoom(room);
                                    setSelectedDate(day);
                                    setIsQuickBookDialogOpen(true);
                                  }}
                                  title={`Book ${room.room_number} for ${format(day, 'MMM dd, yyyy')}`}
                                >
                                  <Plus className="size-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                </button>
                              )}
                            </div>
                          );
                        });
                      })()}
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
        // Grid View (Mobile-friendly and better for smaller screens)  
        <div className="space-y-4">
          {filteredReservations.length === 0 ? (
            <Card className="p-8 text-center">
              <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Reservations Found</h3>
              <p className="text-gray-500 mb-4">No reservations for the selected location and time period.</p>
              <Button onClick={() => navigate('/reservations/new')} className="gap-2">
                <Plus className="size-4" />
                Create First Reservation
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredReservations
                .filter(reservation => {
                  const checkIn = parseISO(reservation.check_in_date);
                  return isSameMonth(checkIn, currentDate);
                })
                .map((reservation) => (
                <Card key={reservation.id} className="cursor-pointer hover:transition-all duration-200 border-l-4" 
                      style={{ borderLeftColor: getStatusBorderColor(reservation.status) }}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate flex items-center gap-2">
                          {reservation.guest_name}
                          {(reservation.status === 'tentative' || reservation.status === 'pending') && (
                            <Clock className="size-4 text-orange-500 animate-pulse" />
                          )}
                        </h3>
                        <p className="text-sm text-muted-foreground">#{reservation.reservation_number}</p>
                      </div>
                      <Badge className={cn("text-white text-xs shrink-0 ml-2", getStatusColor(reservation.status))}>
                        {reservation.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium min-w-0">Room:</span>
                        <span className="truncate">{reservation.rooms?.room_number} - {reservation.rooms?.room_type}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium">Location:</span>
                        <span className="truncate">{reservation.locations?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">Dates:</span>
                        <span>{format(parseISO(reservation.check_in_date), 'MMM dd')} - {format(parseISO(reservation.check_out_date), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                        <span className="text-lg font-bold text-primary">
                          {reservation.currency === 'USD' ? '$' : 'Rs. '}{reservation.total_amount.toLocaleString()}
                        </span>
                        <div className="flex gap-2">
                          {(reservation.status === 'tentative' || reservation.status === 'pending') && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/payments/new?reservation=${reservation.id}`);
                              }}
                              className="bg-green-600 hover:bg-green-700 gap-1 text-xs px-3"
                            >
                              💳 Pay Now
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/reservations/${reservation.id}`);
                            }}
                            className="text-xs px-3"
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Book Dialog */}
      {isQuickBookDialogOpen && selectedRoom && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Quick Book Room</h3>
            <div className="space-y-3">
              <div>
                <span className="font-medium">Room:</span> {selectedRoom.room_number} ({selectedRoom.room_type})
              </div>
              <div>
                <span className="font-medium">Date:</span> {format(selectedDate, 'MMM dd, yyyy')}
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setIsQuickBookDialogOpen(false);
                  setSelectedRoom(null);
                  setSelectedDate(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const checkInDate = format(selectedDate, 'yyyy-MM-dd');
                  navigate(`/reservations/new?room=${selectedRoom.id}&checkIn=${checkInDate}`);
                }}
                className="flex-1"
              >
                Book Room
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}