import { useState, useEffect } from "react";
import { ArrowLeft, Calendar as CalendarIcon, Filter, Plus, RefreshCw, ChevronLeft, ChevronRight, MapPin, Users, DollarSign, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type Reservation = Tables<"reservations"> & {
  locations: Tables<"locations">;
  rooms: Tables<"rooms">;
};

type Room = Tables<"rooms">;
type Location = Tables<"locations">;

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
  raw_data?: any;
  location?: {
    name: string;
  };
}

interface PropertyMapping {
  locationId: string;
  locationName: string;
  beds24Properties: string[];
}

export default function Calendar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [externalBookings, setExternalBookings] = useState<ExternalBooking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<ExternalBooking | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);

  const propertyMappings: PropertyMapping[] = [
    {
      locationId: "f8ad4c1d-1fb3-4bbe-992f-f434d0b43df8", // Rusty Bunk
      locationName: "Rusty Bunk",
      beds24Properties: [
        "Rusty Bunk Villa", 
        "Three-Bedroom Apartment", 
        "Luxury 3 Bedroom Mountain-View Villa, Sleeps 1-6",
        "Room 609309"
      ]
    },
    {
      locationId: "ddbdda7c-23d4-4685-9ef3-43f5b5d989a5", // Asaliya Villa
      locationName: "Asaliya Villa", 
      beds24Properties: [
        "Luxury 4BR Bungalow Sleeps 8-10"
      ]
    }
  ];

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

      // Fetch external bookings
      const { data: externalBookingsData } = await supabase
        .from('external_bookings')
        .select(`
          *,
          location:locations(name)
        `)
        .order('check_in', { ascending: true });

      setLocations(locationsData || []);
      setRooms(roomsData || []);
      setReservations(reservationsData || []);
      setExternalBookings(externalBookingsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get location from external booking based on property mappings
  const getLocationFromExternalBooking = (booking: ExternalBooking): Location | null => {
    // Special handling for "Room 609309" - force to Rusty Bunk
    if (booking.room_name && booking.room_name.includes("Room 609309")) {
      return locations.find(loc => loc.name === "Rusty Bunk") || null;
    }
    
    const possiblePropertyNames = [
      booking.raw_data?.propertyName,
      booking.room_name,
      booking.raw_data?.roomName,
      booking.raw_data?.referer
    ].filter(Boolean);
    
    for (const mapping of propertyMappings) {
      for (const propertyName of possiblePropertyNames) {
        if (propertyName && mapping.beds24Properties.some(prop => 
          propertyName.includes(prop) || prop.includes(propertyName) || prop === propertyName
        )) {
          return locations.find(loc => loc.id === mapping.locationId) || null;
        }
      }
    }
    
    if (booking.location) {
      return locations.find(loc => loc.name === booking.location?.name) || null;
    }
    
    return null;
  };

  const filteredRooms = rooms.filter(room => 
    selectedLocation === "all" || room.location_id === selectedLocation
  );

  const filteredReservations = reservations.filter(reservation => 
    selectedLocation === "all" || reservation.location_id === selectedLocation
  );

  const filteredExternalBookings = externalBookings
    .map(booking => ({
      ...booking,
      mappedLocation: getLocationFromExternalBooking(booking)
    }))
    .filter(booking => 
      selectedLocation === "all" || booking.mappedLocation?.id === selectedLocation
    );

  const getStatusColor = (status: string, isExternal = false) => {
    if (isExternal) {
      const colors = {
        confirmed: "bg-purple-100 text-purple-800 border-purple-200",
        new: "bg-indigo-100 text-indigo-800 border-indigo-200",
        cancelled: "bg-red-100 text-red-800 border-red-200",
      };
      return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200";
    }
    
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

  // Get reservations and external bookings for a specific room and date
  const getBookingsForRoomAndDate = (roomId: string, date: Date) => {
    const internalReservations = filteredReservations.filter(reservation => {
      const checkIn = new Date(reservation.check_in_date);
      const checkOut = new Date(reservation.check_out_date);
      return date >= checkIn && date < checkOut && reservation.room_id === roomId;
    });

    // For external bookings, we need to match by location since they don't have room_id
    const room = rooms.find(r => r.id === roomId);
    const externalReservations = filteredExternalBookings
      .filter(booking => {
        const checkIn = new Date(booking.check_in);
        const checkOut = new Date(booking.check_out);
        const belongsToSameLocation = booking.mappedLocation?.id === room?.location_id;
        return date >= checkIn && date < checkOut && belongsToSameLocation;
      })
      .slice(0, 1); // Only show one external booking per cell to avoid clutter

    return { internalReservations, externalReservations };
  };

  const openBookingDetails = (booking: ExternalBooking) => {
    setSelectedBooking(booking);
    setShowBookingDialog(true);
  };

  const formatPrice = (booking: ExternalBooking) => {
    if (booking.raw_data?.price) {
      return `${booking.raw_data.price.toLocaleString()} LKR`;
    }
    return `${booking.total_amount?.toLocaleString() || '0'} ${booking.currency}`;
  };

  const getPaymentInfo = (booking: ExternalBooking) => {
    if (!booking.raw_data) return null;
    
    const source = booking.raw_data.apiSource?.toLowerCase();
    
    if (source === 'airbnb') {
      const price = booking.raw_data.price;
      const commission = booking.raw_data.commission;
      const expectedPayout = price - commission;
      
      return {
        type: 'airbnb',
        basePrice: price,
        hostFee: commission,
        payout: expectedPayout
      };
    }
    
    return null;
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
                        const { internalReservations, externalReservations } = getBookingsForRoomAndDate(room.id, date);
                        const internalReservation = internalReservations[0];
                        const externalReservation = externalReservations[0];
                        
                        return (
                          <div key={dateIndex} className="border-b border-r min-h-[60px] p-0.5 relative">
                            {internalReservation && (
                              <div 
                                className={`text-xs p-0.5 rounded text-center cursor-pointer mb-0.5 ${getStatusColor(internalReservation.status)} overflow-hidden`}
                                onClick={() => navigate(`/reservations/${internalReservation.id}`)}
                                title={`${internalReservation.guest_name} - ${internalReservation.status}`}
                              >
                                <div className="font-medium text-xs leading-tight truncate">
                                  {internalReservation.guest_name.split(' ')[0].slice(0, 4)}
                                </div>
                                <div className="text-xs opacity-75 leading-tight">
                                  {new Date(internalReservation.check_in_date).getDate()}-{new Date(internalReservation.check_out_date).getDate()}
                                </div>
                              </div>
                            )}
                            
                            {externalReservation && (
                              <div 
                                className={`text-xs p-0.5 rounded text-center cursor-pointer ${getStatusColor(externalReservation.status, true)} overflow-hidden`}
                                onClick={() => openBookingDetails(externalReservation)}
                                title={`External: ${externalReservation.guest_name || 'Unknown'} - ${externalReservation.source}`}
                              >
                                <div className="font-medium text-xs leading-tight truncate">
                                  {(externalReservation.raw_data?.firstName || externalReservation.guest_name?.split(' ')[0] || 'Ext').slice(0, 4)}
                                </div>
                                <div className="text-xs opacity-75 leading-tight">
                                  {externalReservation.source.charAt(0).toUpperCase()}
                                </div>
                              </div>
                            )}
                            
                            {!internalReservation && !externalReservation && (
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
              <span>Internal - Confirmed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-amber-100 border border-amber-200 rounded"></div>
              <span>Internal - Tentative</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-purple-100 border border-purple-200 rounded"></div>
              <span>External - Confirmed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-indigo-100 border border-indigo-200 rounded"></div>
              <span>External - New</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
              <span>Cancelled</span>
            </div>
          </div>
        </div>

        {/* Booking Details Dialog */}
        <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                External Booking Details
              </DialogTitle>
            </DialogHeader>
            
            {selectedBooking && (
              <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Booking ID</div>
                    <div className="font-mono text-sm">#{selectedBooking.external_id}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Status</div>
                    <Badge variant="outline" className={getStatusColor(selectedBooking.status, true)}>
                      {selectedBooking.status}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Source</div>
                    <Badge variant="outline">
                      {selectedBooking.raw_data?.referer || selectedBooking.source}
                    </Badge>
                  </div>
                </div>

                {/* Guest Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Guest Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Guest Name</div>
                        <div className="font-medium">
                          {selectedBooking.raw_data?.firstName && selectedBooking.raw_data?.lastName 
                            ? `${selectedBooking.raw_data.firstName} ${selectedBooking.raw_data.lastName}`
                            : selectedBooking.guest_name
                          }
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Email</div>
                        <div>{selectedBooking.raw_data?.email || 'Not available'}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Guests</div>
                        <div>{selectedBooking.adults} adults{selectedBooking.children > 0 && `, ${selectedBooking.children} children`}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Phone</div>
                        <div>{selectedBooking.raw_data?.phone || 'Not available'}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stay Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5" />
                      Stay Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Check-in</div>
                        <div className="font-medium">{format(new Date(selectedBooking.check_in), 'PPP')}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Check-out</div>
                        <div className="font-medium">{format(new Date(selectedBooking.check_out), 'PPP')}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Nights</div>
                        <div>{Math.ceil((new Date(selectedBooking.check_out).getTime() - new Date(selectedBooking.check_in).getTime()) / (1000 * 60 * 60 * 24))}</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Booking Date</div>
                        <div>
                          {selectedBooking.raw_data?.bookingTime 
                            ? format(new Date(selectedBooking.raw_data.bookingTime), 'PPP')
                            : 'Not available'
                          }
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Property Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Property Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Location</div>
                        <div className="font-medium">
                          {getLocationFromExternalBooking(selectedBooking)?.name || selectedBooking.location?.name || 'Unknown'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Room</div>
                        <div>{selectedBooking.room_name || 'Not specified'}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pricing Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Pricing Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(() => {
                      const paymentInfo = getPaymentInfo(selectedBooking);
                      
                      if (paymentInfo?.type === 'airbnb') {
                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Base Price:</span>
                              <span className="font-medium">{paymentInfo.basePrice.toLocaleString()} LKR</span>
                            </div>
                            <div className="flex justify-between text-red-600">
                              <span>Host Fee:</span>
                              <span>-{paymentInfo.hostFee.toLocaleString()} LKR</span>
                            </div>
                            <div className="border-t pt-2 flex justify-between font-medium text-green-600">
                              <span>Expected Payout:</span>
                              <span>{paymentInfo.payout.toLocaleString()} LKR</span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-2">
                              Cancel policy flexible
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="flex justify-between font-medium">
                            <span>Total Amount:</span>
                            <span>{formatPrice(selectedBooking)}</span>
                          </div>
                        );
                      }
                    })()}
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}