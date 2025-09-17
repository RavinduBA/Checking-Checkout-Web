import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Calendar, Users, Bed, MapPin, DollarSign, AlertCircle, CheckCircle, Clock, Wifi, Settings as SettingsIcon, Key, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

interface ExternalBooking {
  id: string;
  external_id: string;
  property_id: string;
  source: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  status: string;
  total_amount: number;
  currency: string;
  adults: number;
  children: number;
  room_name?: string;
  location_id?: string;
  location?: {
    name: string;
  };
  last_synced_at: string;
  raw_data?: any;
  mappedLocation?: Location | null;
}

interface Location {
  id: string;
  name: string;
  is_active: boolean;
}

interface PropertyMapping {
  locationId: string;
  locationName: string;
  beds24Properties: string[];
}

interface SyncStats {
  totalBookings: number;
  recentSync: string | null;
  sourceBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
}

export default function Beds24Integration() {
  const [bookings, setBookings] = useState<ExternalBooking[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [exchangingToken, setExchangingToken] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<ExternalBooking | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalBookings: 0,
    recentSync: null,
    sourceBreakdown: {},
    statusBreakdown: {}
  });
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [propertyMappings, setPropertyMappings] = useState<PropertyMapping[]>([
    {
      locationId: "f8ad4c1d-1fb3-4bbe-992f-f434d0b43df8", // Rusty Bunk
      locationName: "Rusty Bunk",
      beds24Properties: [
        "Rusty Bunk Villa", 
        "Three-Bedroom Apartment", 
        "Luxury 3 Bedroom Mountain-View Villa, Sleeps 1-6",
        "Room 609309" // Adding room ID as fallback
      ]
    },
    {
      locationId: "ddbdda7c-23d4-4685-9ef3-43f5b5d989a5", // Asaliya Villa
      locationName: "Asaliya Villa", 
      beds24Properties: [
        "Luxury 4BR Bungalow Sleeps 8-10"
      ]
    }
  ]);

  useEffect(() => {
    fetchData();
    setLastSyncTime(new Date());
    
    // Auto-sync every hour
    const interval = setInterval(() => {
      syncBeds24Data();
    }, 60 * 60 * 1000); // 1 hour in milliseconds

    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch bookings with location data
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('external_bookings')
        .select(`
          *,
          location:locations(name)
        `)
        .order('check_in', { ascending: false });

      // Fetch locations
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (bookingsError) throw bookingsError;
      if (locationsError) throw locationsError;

      setBookings(bookingsData || []);
      setLocations(locationsData || []);
      
      // Calculate stats
      if (bookingsData) {
        const stats = calculateStats(bookingsData);
        setSyncStats(stats);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch Beds24 data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (bookings: ExternalBooking[]): SyncStats => {
    const sourceBreakdown: Record<string, number> = {};
    const statusBreakdown: Record<string, number> = {};
    let recentSync: string | null = null;

    bookings.forEach(booking => {
      // Source breakdown
      sourceBreakdown[booking.source] = (sourceBreakdown[booking.source] || 0) + 1;
      
      // Status breakdown
      statusBreakdown[booking.status] = (statusBreakdown[booking.status] || 0) + 1;
      
      // Find most recent sync
      if (!recentSync || booking.last_synced_at > recentSync) {
        recentSync = booking.last_synced_at;
      }
    });

    return {
      totalBookings: bookings.length,
      recentSync,
      sourceBreakdown,
      statusBreakdown
    };
  };

  const syncBeds24Data = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-beds24-bookings');
      
      if (error) throw error;
      
      toast.success(data.message || 'Beds24 sync completed successfully');
      setLastSyncTime(new Date());
      await fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(`Sync failed: ${error.message || 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  };

  const exchangeInviteCode = async (inviteCode: string) => {
    setExchangingToken(true);
    try {
      const { data, error } = await supabase.functions.invoke('beds24-token-exchange', {
        body: { inviteCode }
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast.success('Token exchange successful! You can now sync with Beds24.');
        toast.info('Please save your refresh token in Supabase secrets as BEDS24_REFRESH_TOKEN');
        console.log('Refresh token:', data.data.refreshToken);
        setSetupMode(false);
      } else {
        throw new Error(data.error || 'Token exchange failed');
      }
    } catch (error: any) {
      console.error('Token exchange error:', error);
      toast.error(`Token exchange failed: ${error.message || 'Unknown error'}`);
    } finally {
      setExchangingToken(false);
    }
  };

  // Helper function to get location from booking based on property mappings
  const getLocationFromBooking = (booking: ExternalBooking): Location | null => {
    // Special handling for "Luxury 3 Bedroom Mountain-View Villa" - force to Rusty Bunk
    if (booking.room_name && booking.room_name.includes("Room 609309")) {
      // All Room 609309 should go to Rusty Bunk based on the Airbnb property name
      const rustyBunkLocation = locations.find(loc => loc.name === "Rusty Bunk");
      if (rustyBunkLocation) {
        console.log(`Forcing booking ${booking.external_id} with Room 609309 to Rusty Bunk`);
        return rustyBunkLocation;
      }
    }
    
    // Check multiple possible property name fields from the raw_data
    const possiblePropertyNames = [
      booking.raw_data?.propertyName,
      booking.room_name,
      booking.raw_data?.roomName,
      booking.raw_data?.referer // Check referer for Airbnb
    ].filter(Boolean);
    
    console.log('Booking external_id:', booking.external_id, 'Property names to check:', possiblePropertyNames);
    console.log('Raw data keys:', booking.raw_data ? Object.keys(booking.raw_data) : 'no raw_data');
    
    for (const mapping of propertyMappings) {
      for (const propertyName of possiblePropertyNames) {
        if (propertyName && mapping.beds24Properties.some(prop => 
          propertyName.includes(prop) || prop.includes(propertyName) || 
          prop === propertyName
        )) {
          console.log('Matched booking to location:', mapping.locationName);
          return locations.find(loc => loc.id === mapping.locationId) || null;
        }
      }
    }
    
    console.log('No mapping found, using fallback location');
    // Fallback to existing location mapping
    if (booking.location) {
      return locations.find(loc => loc.name === booking.location?.name) || null;
    }
    
    return null;
  };

  // Helper functions for formatting
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
    return nights;
  };

  const getGuestName = (booking: ExternalBooking) => {
    if (booking.raw_data?.firstName && booking.raw_data?.lastName) {
      return `${booking.raw_data.firstName} ${booking.raw_data.lastName}`;
    }
    return booking.guest_name || 'Unknown Guest';
  };

  const getEmail = (booking: ExternalBooking) => {
    return booking.raw_data?.email || '';
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'new':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'checked_in':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'checked_out':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source.toLowerCase()) {
      case 'booking_com':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'airbnb':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'expedia':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-purple-100 text-purple-800 border-purple-200';
    }
  };

  const openBookingDetails = (booking: ExternalBooking) => {
    setSelectedBooking(booking);
    setShowBookingDialog(true);
  };

  const filteredBookings = selectedLocation === "all" 
    ? bookings.map(booking => {
        const mappedLocation = getLocationFromBooking(booking);
        console.log(`Booking ${booking.external_id}: mapped to ${mappedLocation?.name || 'none'}`);
        return {
          ...booking,
          mappedLocation: mappedLocation
        };
      })
    : bookings
        .map(booking => {
          const mappedLocation = getLocationFromBooking(booking);
          return {
            ...booking,
            mappedLocation: mappedLocation
          };
        })
        .filter(booking => booking.mappedLocation?.id === selectedLocation);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Beds24 Integration</h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Beds24 Integration</h1>
          <p className="text-muted-foreground">Manage and sync your Beds24 booking data</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={syncBeds24Data} 
            disabled={syncing}
            className="bg-gradient-primary hover:opacity-90"
          >
            {syncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Wifi className="h-4 w-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>
          <div className="text-xs text-muted-foreground">
            Auto-syncs every hour
            {lastSyncTime && (
              <div>Last sync: {format(lastSyncTime, 'MMM dd, HH:mm')}</div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncStats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">External bookings synced</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {syncStats.recentSync ? format(new Date(syncStats.recentSync), 'MMM dd') : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground">
              {syncStats.recentSync ? format(new Date(syncStats.recentSync), 'HH:mm') : 'No sync yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${bookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total booking value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(syncStats.sourceBreakdown).length}</div>
            <p className="text-xs text-muted-foreground">Booking channels</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings" className="space-y-4">
          {/* Location Filter */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Filter by Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedLocation === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedLocation("all")}
                >
                  All Locations ({bookings.length})
                </Button>
                {locations.map((location) => {
                  const locationBookings = bookings.filter(booking => {
                    const mappedLocation = getLocationFromBooking(booking);
                    return mappedLocation?.id === location.id;
                  }).length;
                  
                  return (
                    <Button
                      key={location.id}
                      variant={selectedLocation === location.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedLocation(location.id)}
                    >
                      {location.name} ({locationBookings})
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Bookings Table */}
          <Card>
            <CardHeader>
              <CardTitle>External Bookings</CardTitle>
              <CardDescription>
                Bookings synchronized from Beds24 and other external sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Guest</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Guests</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => (
                      <TableRow key={booking.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {booking.room_name || 'Unknown Property'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ID: {booking.external_id}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {booking.mappedLocation?.name || 'Unmapped'}
                            </span>
                            {!booking.mappedLocation && (
                              <Badge variant="secondary" className="text-xs">
                                Needs Mapping
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">
                              {getGuestName(booking)}
                            </div>
                            {getEmail(booking) && (
                              <div className="text-xs text-muted-foreground">
                                {getEmail(booking)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">
                              {formatDate(booking.check_in)} - {formatDate(booking.check_out)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {calculateNights(booking.check_in, booking.check_out)} nights
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {booking.adults + booking.children}
                              <span className="text-xs text-muted-foreground ml-1">
                                ({booking.adults}A + {booking.children}C)
                              </span>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">
                              {formatPrice(booking)}
                            </div>
                            {getPaymentInfo(booking) && (
                              <div className="text-xs text-green-600">
                                Payout: {getPaymentInfo(booking)?.payout} LKR
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getSourceColor(booking.source)}>
                            {booking.source.replace('_', '.')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openBookingDetails(booking)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {filteredBookings.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No bookings found for the selected location.</p>
                    <Button 
                      onClick={syncBeds24Data} 
                      variant="outline" 
                      className="mt-4"
                      disabled={syncing}
                    >
                      {syncing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync Now
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Booking Details Dialog */}
        <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Guest Details</h4>
                    <div className="mt-1">
                      <p className="font-medium">{getGuestName(selectedBooking)}</p>
                      {getEmail(selectedBooking) && (
                        <p className="text-sm text-muted-foreground">{getEmail(selectedBooking)}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Property</h4>
                    <div className="mt-1">
                      <p className="font-medium">{selectedBooking.room_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedBooking.mappedLocation?.name || 'Unmapped Location'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Check-in / Check-out</h4>
                    <div className="mt-1">
                      <p className="font-medium">
                        {formatDate(selectedBooking.check_in)} - {formatDate(selectedBooking.check_out)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {calculateNights(selectedBooking.check_in, selectedBooking.check_out)} nights
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Guests</h4>
                    <div className="mt-1">
                      <p className="font-medium">
                        {selectedBooking.adults + selectedBooking.children} total
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedBooking.adults} adults, {selectedBooking.children} children
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Source & Status</h4>
                    <div className="mt-1 flex gap-2">
                      <Badge className={getSourceColor(selectedBooking.source)}>
                        {selectedBooking.source.replace('_', '.')}
                      </Badge>
                      <Badge className={getStatusColor(selectedBooking.status)}>
                        {selectedBooking.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Amount</h4>
                    <div className="mt-1">
                      <p className="font-medium">{formatPrice(selectedBooking)}</p>
                      {getPaymentInfo(selectedBooking) && (
                        <p className="text-sm text-green-600">
                          Expected Payout: {getPaymentInfo(selectedBooking)?.payout} LKR
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {getPaymentInfo(selectedBooking)?.type === 'airbnb' && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Payment Breakdown</h4>
                    <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Base Price:</span>
                        <span>{getPaymentInfo(selectedBooking)?.basePrice} LKR</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Host Fee:</span>
                        <span>-{getPaymentInfo(selectedBooking)?.hostFee} LKR</span>
                      </div>
                      <div className="border-t pt-1 flex justify-between font-medium text-green-600">
                        <span>Expected Payout:</span>
                        <span>{getPaymentInfo(selectedBooking)?.payout} LKR</span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Booking Details</h4>
                  <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>External ID:</span>
                      <span className="font-mono">{selectedBooking.external_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Property ID:</span>
                      <span className="font-mono">{selectedBooking.property_id}</span>
                    </div>
                    {selectedBooking.last_synced_at && (
                      <div className="flex justify-between">
                        <span>Last Synced:</span>
                        <span>{format(new Date(selectedBooking.last_synced_at), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Booking Analytics</CardTitle>
              <CardDescription>
                Insights and trends from your external bookings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Source Breakdown</h4>
                  <div className="space-y-2">
                    {Object.entries(syncStats.sourceBreakdown).map(([source, count]) => (
                      <div key={source} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getSourceColor(source)}>
                            {source.replace('_', '.')}
                          </Badge>
                        </div>
                        <span className="text-sm font-medium">{count} bookings</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Status Breakdown</h4>
                  <div className="space-y-2">
                    {Object.entries(syncStats.statusBreakdown).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(status)}>
                            {status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <span className="text-sm font-medium">{count} bookings</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {/* Property Mapping Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5" />
                    Beds24 Property Mapping
                  </CardTitle>
                  <CardDescription>
                    Map your Beds24 properties to internal locations and rooms
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Location-based Property Mappings */}
              <div className="space-y-4">
                {locations.map((location) => {
                  const mapping = propertyMappings.find(m => m.locationName === location.name);
                  return (
                    <Card key={location.id} className="border-l-4 border-l-primary">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{location.name}</CardTitle>
                          <Badge variant={mapping ? "default" : "secondary"}>
                            {mapping ? `${mapping.beds24Properties.length} Properties` : "Not Mapped"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {mapping && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Mapped Beds24 Properties:</Label>
                            <div className="flex flex-wrap gap-2">
                              {mapping.beds24Properties.map((property, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {property}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`property-${location.id}`} className="text-sm">
                              Add Beds24 Property Name
                            </Label>
                            <Input
                              id={`property-${location.id}`}
                              placeholder="e.g., Rusty Bunk Villa"
                              className="mt-1"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button size="sm" className="w-full">
                              Add Property Mapping
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* API Setup Section */}
              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    API Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure your Beds24 API connection
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!setupMode ? (
                    <div className="text-center py-8">
                      <div className="space-y-4">
                        <div className="text-muted-foreground">
                          API connection is already configured. 
                          {syncStats.recentSync ? (
                            <span className="block mt-2">
                              Last successful sync: {format(new Date(syncStats.recentSync), 'MMM dd, yyyy HH:mm')}
                            </span>
                          ) : (
                            <span className="block mt-2 text-yellow-600">
                              No successful sync yet
                            </span>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={() => setSetupMode(true)}
                        >
                          Reconfigure API
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                          <div className="space-y-2">
                            <h4 className="font-medium text-amber-800">Setup Instructions</h4>
                            <ol className="text-sm text-amber-700 space-y-1 ml-4 list-decimal">
                              <li>Log into your Beds24 account</li>
                              <li>Go to Settings → Channel Manager → API</li>
                              <li>Generate an invite code for this application</li>
                              <li>Enter the invite code below to complete setup</li>
                            </ol>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="inviteCode">Beds24 Invite Code</Label>
                        <div className="flex gap-2">
                          <Input
                            id="inviteCode"
                            placeholder="Enter your Beds24 invite code"
                            disabled={exchangingToken}
                          />
                          <Button 
                            onClick={() => {
                              const input = document.getElementById('inviteCode') as HTMLInputElement;
                              if (input?.value) {
                                exchangeInviteCode(input.value);
                              }
                            }}
                            disabled={exchangingToken}
                            className="min-w-[100px]"
                          >
                            {exchangingToken ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Setup...
                              </>
                            ) : (
                              'Setup'
                            )}
                          </Button>
                        </div>
                      </div>

                      <Button 
                        variant="ghost" 
                        onClick={() => setSetupMode(false)}
                        className="w-full"
                      >
                        Cancel Setup
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
