import { useState, useEffect } from "react";
import { ArrowLeft, Calendar as CalendarIcon, Filter, Plus, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { ExternalBookings } from "@/components/ExternalBookings";

type Reservation = Tables<"reservations"> & {
  locations: Tables<"locations">;
  rooms: Tables<"rooms">;
};

type Room = Tables<"rooms">;
type Location = Tables<"locations">;

export default function Calendar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

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

      // Fetch rooms with location data
      const { data: roomsData } = await supabase
        .from("rooms")
        .select("*")
        .eq("is_active", true)
        .order("room_number");

      // Fetch reservations with location and room data
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

  const getStatusColor = (status: string) => {
    const colors = {
      confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
      tentative: "bg-amber-100 text-amber-800 border-amber-200",
      completed: "bg-blue-100 text-blue-800 border-blue-200",
      cancelled: "bg-red-100 text-red-800 border-red-200"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getRoomStatus = (room: Room) => {
    // Simple room status logic - can be enhanced
    return "Ready";
  };

  // Generate dates for calendar header
  const generateCalendarDates = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const dates = [];
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(new Date(year, month, day));
    }
    return dates;
  };

  // Get reservations for a specific room and date
  const getReservationsForRoomAndDate = (roomId: string, date: Date) => {
    return filteredReservations.filter(reservation => {
      const checkIn = new Date(reservation.check_in_date);
      const checkOut = new Date(reservation.check_out_date);
      
      // Check if date falls within reservation period
      return date >= checkIn && date < checkOut && reservation.room_id === roomId;
    });
  };

  const calendarDates = generateCalendarDates();

  if (loading) {
    return <div className="flex justify-center items-center min-h-64">Loading...</div>;
  }

  return (
    <div className="max-w-full mx-auto p-2 lg:p-4 space-y-3 lg:space-y-4 animate-fade-in overflow-x-auto">
      {/* Header */}
      <div className="flex items-center gap-2 lg:gap-4">
        <Button asChild variant="ghost" size="icon" className="md:hidden h-8 w-8">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg lg:text-xl xl:text-2xl font-bold text-foreground">Reservation Calendar</h1>
          <p className="text-xs lg:text-sm text-muted-foreground hidden md:block">Room-based calendar view with external bookings</p>
        </div>
      </div>

      {/* Main content in flex layout */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Main calendar section */}
        <div className="flex-1 space-y-4">
          {/* Filters & Controls */}
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
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
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-3">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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

          {/* Calendar Grid */}
          <Card className="bg-gradient-card border-0 shadow-elegant">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="min-w-full">
                  {/* Header with dates */}
                  <div className="grid" style={{ gridTemplateColumns: `120px repeat(${calendarDates.length}, 32px)` }}>
                    <div className="border-b border-r p-1 bg-muted font-semibold text-xs">
                      <div>Room</div>
                      <div className="text-xs text-muted-foreground">Type</div>
                    </div>
                    {calendarDates.map((date, index) => (
                      <div key={index} className="border-b border-r p-0.5 text-center bg-muted">
                        <div className="text-xs font-medium">{date.getDate()}</div>
                        <div className="text-xs text-muted-foreground">
                          {date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Room rows */}
                  {filteredRooms.map((room) => (
                    <div key={room.id} className="grid" style={{ gridTemplateColumns: `120px repeat(${calendarDates.length}, 32px)` }}>
                      {/* Room info column */}
                      <div className="border-b border-r p-1 bg-background">
                        <div className="font-medium text-xs">{room.room_number}</div>
                        <div className="text-xs text-muted-foreground truncate">{room.room_type}</div>
                      </div>
                      
                      {/* Date columns */}
                      {calendarDates.map((date, dateIndex) => {
                        const reservations = getReservationsForRoomAndDate(room.id, date);
                        const reservation = reservations[0];
                        
                        return (
                          <div key={dateIndex} className="border-b border-r min-h-[45px] p-0.5 relative">
                            {reservation ? (
                              <div 
                                className={`text-xs p-0.5 rounded text-center cursor-pointer ${getStatusColor(reservation.status)} overflow-hidden`}
                                onClick={() => navigate(`/reservations/${reservation.id}`)}
                                title={`${reservation.guest_name} - ${reservation.status}`}
                              >
                                <div className="font-medium text-xs leading-tight truncate">
                                  {reservation.guest_name.split(' ')[0].slice(0, 4)}
                                </div>
                                <div className="text-xs opacity-75 leading-tight">
                                  {new Date(reservation.check_in_date).getDate()}-{new Date(reservation.check_out_date).getDate()}
                                </div>
                              </div>
                            ) : (
                              <div 
                                className="h-full hover:bg-muted/50 cursor-pointer rounded"
                                onClick={() => navigate(`/reservations/new?room=${room.id}&date=${date.toISOString().split('T')[0]}`)}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-emerald-100 border border-emerald-200 rounded"></div>
              <span>Confirmed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-amber-100 border border-amber-200 rounded"></div>
              <span>Tentative</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
              <span>Cancelled</span>
            </div>
          </div>
        </div>

        {/* External bookings sidebar */}
        <div className="lg:w-96">
          <ExternalBookings 
            locationId={selectedLocation === "all" ? undefined : selectedLocation}
          />
        </div>
      </div>
    </div>
  );
}