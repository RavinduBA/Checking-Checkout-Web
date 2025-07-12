import { useState, useEffect } from "react";
import { ArrowLeft, Calendar as CalendarIcon, Eye, Filter, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type Booking = Tables<"bookings"> & {
  locations: Tables<"locations">;
};

type Location = Tables<"locations">;

export default function Calendar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
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

      // Fetch bookings with location data
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select(`
          *,
          locations (*)
        `)
        .order("check_in", { ascending: true });

      setLocations(locationsData || []);
      setBookings(bookingsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(booking => 
    selectedLocation === "all" || booking.location_id === selectedLocation
  );

  const getSourceColor = (source: string) => {
    const colors = {
      booking_com: "bg-yellow-500", // Yellow for Booking.com
      airbnb: "bg-blue-500",        // Blue for Airbnb
      direct: "bg-red-500"          // Red for direct bookings
    };
    return colors[source as keyof typeof colors] || "bg-slate-500";
  };

  const getStatusColor = (status: string) => {
    const colors = {
      confirmed: "bg-emerald-500",
      pending: "bg-amber-500",
      settled: "bg-blue-500"
    };
    return colors[status as keyof typeof colors] || "bg-slate-500";
  };

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    navigate(`/booking/new?date=${dateStr}&location=${selectedLocation !== 'all' ? selectedLocation : ''}`);
  };

  const syncCalendars = async () => {
    setSyncing(true);
    try {
      // Get Rusty Bunk location
      const rustyBunk = locations.find(loc => loc.name.toLowerCase().includes('rusty'));
      if (!rustyBunk) {
        toast({
          title: "Error",
          description: "Rusty Bunk location not found",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('sync-ical', {
        body: {
          icalUrl: 'https://ical.booking.com/v1/export?t=1d0bea4b-1994-40ec-a9c9-8a718b6cb06a',
          locationId: rustyBunk.id
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Synced ${data.eventsCount} bookings from Booking.com`
      });

      // Refresh data
      fetchData();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to sync calendars",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  // Generate calendar grid for current month
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDateObj = new Date(year, month, day);
      const dayBookings = filteredBookings.filter(booking => {
        const checkIn = new Date(booking.check_in);
        const checkOut = new Date(booking.check_out);
        return currentDateObj >= checkIn && currentDateObj < checkOut;
      });
      
      days.push({
        day,
        date: currentDateObj,
        bookings: dayBookings,
        isAvailable: dayBookings.length === 0
      });
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();

  if (loading) {
    return <div className="flex justify-center items-center min-h-64">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="md:hidden">
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Calendar & Bookings</h1>
          <p className="text-sm text-muted-foreground hidden md:block">View upcoming bookings and availability</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-card border-0 shadow-elegant">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-4 w-4 text-primary" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
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
            <Button 
              variant="outline" 
              onClick={syncCalendars}
              disabled={syncing}
              className="w-full md:w-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Calendars'}
            </Button>
            <Button asChild className="w-full md:w-auto">
              <Link to="/booking/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Booking
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card className="bg-gradient-card border-0 shadow-elegant">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarIcon className="h-4 w-4 text-primary" />
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </CardTitle>
            <div className="flex gap-1">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              >
                ←
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              >
                →
              </Button>
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs mt-3">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-emerald-500 rounded"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Direct</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Booking.com</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Airbnb</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="p-1 text-center font-semibold text-muted-foreground text-xs">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((dayData, index) => (
              <div 
                key={index} 
                className={`min-h-12 md:min-h-16 p-1 border border-border rounded-md transition-colors ${
                  dayData ? 'hover:bg-muted/50 cursor-pointer' : ''
                }`}
                onClick={() => dayData && handleDateClick(dayData.date)}
              >
                {dayData && (
                  <>
                    <div className="text-xs font-medium mb-1">{dayData.day}</div>
                    {dayData.isAvailable ? (
                      <div className="w-full h-4 md:h-6 bg-emerald-500/20 rounded text-xs flex items-center justify-center text-emerald-700">
                        <span className="hidden md:inline">Available</span>
                        <span className="md:hidden">✓</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {dayData.bookings.slice(0, 1).map((booking) => (
                          <div 
                            key={booking.id} 
                            className={`text-xs text-white px-1 py-0.5 rounded text-center ${getSourceColor(booking.source)}`}
                            title={`${booking.guest_name} - ${booking.source}`}
                          >
                            <span className="hidden md:inline">{booking.guest_name.split(' ')[0]}</span>
                            <span className="md:hidden">•</span>
                          </div>
                        ))}
                        {dayData.bookings.length > 1 && (
                          <div className="text-xs text-center text-muted-foreground">
                            +{dayData.bookings.length - 1}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Bookings */}
      <Card className="bg-gradient-card border-0 shadow-elegant">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Upcoming Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredBookings.slice(0, 10).map((booking) => (
              <div key={booking.id} className="p-3 md:p-4 border border-border rounded-lg">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-2">
                  <div>
                    <h3 className="font-semibold">{booking.guest_name}</h3>
                    <p className="text-sm text-muted-foreground">{booking.locations?.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={`text-white text-xs ${getSourceColor(booking.source)}`}>
                      {booking.source.replace('_', '.')}
                    </Badge>
                    <Badge className={`text-white text-xs ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row md:justify-between text-sm gap-1">
                  <span>Check-in: {new Date(booking.check_in).toLocaleDateString()}</span>
                  <span>Check-out: {new Date(booking.check_out).toLocaleDateString()}</span>
                </div>
                <div className="mt-2 text-sm">
                  <span className="font-medium">Total: LKR {booking.total_amount.toLocaleString()}</span>
                  {booking.paid_amount > 0 && (
                    <span className="ml-2 md:ml-4 text-emerald-600">
                      Paid: LKR {booking.paid_amount.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}