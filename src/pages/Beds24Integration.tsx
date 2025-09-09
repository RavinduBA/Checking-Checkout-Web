import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Calendar, Users, Bed, MapPin, DollarSign, AlertCircle, CheckCircle, Clock, Wifi, Settings as SettingsIcon, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
}

interface Location {
  id: string;
  name: string;
  is_active: boolean;
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
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalBookings: 0,
    recentSync: null,
    sourceBreakdown: {},
    statusBreakdown: {}
  });
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  useEffect(() => {
    fetchData();
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

  const formatBookingDate = (booking: ExternalBooking) => {
    if (booking.raw_data?.bookingTime) {
      const date = new Date(booking.raw_data.bookingTime);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    }
    return '';
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

  const getReferrer = (booking: ExternalBooking) => {
    return booking.raw_data?.referer || booking.source || '';
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
        lines: [
          'Cancel policy flexible',
          `Base Price ${price} LKR`,
          `Host Fee -${commission}.00 LKR`,
          `Expected Payout Amount ${expectedPayout} LKR`
        ]
      };
    } else if (source === 'booking.com') {
      const rateDesc = booking.raw_data.rateDescription;
      if (rateDesc) {
        // Extract rate info from description
        const lines = rateDesc.split('\n').filter(line => line.trim());
        return {
          type: 'booking',
          lines: lines
        };
      }
    }
    
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'checked_in':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'checked_out':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const filteredBookings = selectedLocation === "all" 
    ? bookings 
    : bookings.filter(booking => booking.location_id === selectedLocation);

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
                {locations.map(location => {
                  const count = bookings.filter(b => b.location_id === location.id).length;
                  return (
                    <Button
                      key={location.id}
                      variant={selectedLocation === location.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedLocation(location.id)}
                    >
                      {location.name} ({count})
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Bookings Table */}
          <Card>
            <CardHeader>
              <CardTitle>Beds24.com Control Panel</CardTitle>
              <CardDescription>
                Showing {filteredBookings.length} bookings from Beds24
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Number</TableHead>
                      <TableHead className="w-16">Bulk Action</TableHead>
                      <TableHead className="w-20">Status</TableHead>
                      <TableHead className="w-12">Flag</TableHead>
                      <TableHead className="w-32">Property</TableHead>
                      <TableHead className="w-40">Room</TableHead>
                      <TableHead className="w-12">Unit</TableHead>
                      <TableHead className="w-28">Check In</TableHead>
                      <TableHead className="w-28">Check Out</TableHead>
                      <TableHead className="w-16">Nights</TableHead>
                      <TableHead className="w-40">Full Name</TableHead>
                      <TableHead className="w-40">Email</TableHead>
                      <TableHead className="w-16">Adults</TableHead>
                      <TableHead className="w-16">Children</TableHead>
                      <TableHead className="w-28">Referrer</TableHead>
                      <TableHead className="w-28">Booking Date</TableHead>
                      <TableHead className="w-20">Master Id</TableHead>
                      <TableHead className="w-20">Invoicee Id</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => {
                      const paymentInfo = getPaymentInfo(booking);
                      
                      return (
                        <TableRow key={booking.id} className="hover:bg-muted/50">
                          <TableCell className="font-mono text-sm">
                            {booking.external_id}
                          </TableCell>
                          <TableCell>
                            <Checkbox />
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={`${getStatusColor(booking.status)} text-xs capitalize`}
                            >
                              {booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {/* Flag column - empty for now */}
                          </TableCell>
                          <TableCell className="text-sm">
                            {booking.location?.name || 'Unknown'}
                          </TableCell>
                          <TableCell className="text-sm">
                            <div>
                              {booking.room_name || 'Unknown Room'}
                            </div>
                            {paymentInfo && (
                              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                {paymentInfo.lines.map((line, idx) => (
                                  <div key={idx}>{line}</div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            1
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(booking.check_in)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(booking.check_out)}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {calculateNights(booking.check_in, booking.check_out)}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {getGuestName(booking)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {getEmail(booking)}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {booking.adults}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {booking.children}
                          </TableCell>
                          <TableCell className="text-sm">
                            {getReferrer(booking)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatBookingDate(booking)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {booking.external_id}
                          </TableCell>
                          <TableCell className="text-sm">
                            {/* Invoicee Id - empty for now */}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              
              {filteredBookings.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No bookings found</p>
                  <p className="text-sm">Try syncing with Beds24 to fetch the latest data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Booking Sources</CardTitle>
                <CardDescription>Distribution by channel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(syncStats.sourceBreakdown).map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between">
                      <Badge variant="outline" className={getSourceColor(source)}>
                        {source.replace('_', '.')}
                      </Badge>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Booking Status</CardTitle>
                <CardDescription>Distribution by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(syncStats.statusBreakdown).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <Badge variant="outline" className={getStatusColor(status)}>
                        {status.replace('_', ' ')}
                      </Badge>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Initial Setup
              </CardTitle>
              <CardDescription>
                Exchange your Beds24 invite code for API access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!setupMode ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">API Integration Status</h4>
                      <p className="text-sm text-muted-foreground">
                        {syncStats.totalBookings > 0 
                          ? 'Connected and syncing data' 
                          : 'Ready to connect - click Setup to exchange your invite code'
                        }
                      </p>
                    </div>
                    <Button onClick={() => setSetupMode(true)} variant="outline">
                      <SettingsIcon className="h-4 w-4 mr-2" />
                      Setup
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Beds24 Invite Code</label>
                    <Input
                      id="invite-code"
                      placeholder="Paste your Beds24 invite code here..."
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      This will be exchanged for a secure refresh token and stored in Supabase secrets.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        setExchangingToken(true);
                        try {
                          // First try the automatic setup
                          const { data, error } = await supabase.functions.invoke('setup-beds24-integration');
                          
                          if (data?.success) {
                            toast.success('Refresh token generated! Please copy it to your Supabase secrets.');
                            console.log('=== BEDS24 REFRESH TOKEN ===');
                            console.log(data.data.refreshToken);
                            console.log('===========================');
                            
                            // Show instructions
                            alert(`Success! Please copy this refresh token to your BEDS24_REFRESH_TOKEN secret:\n\n${data.data.refreshToken}\n\nThen try syncing again.`);
                            setSetupMode(false);
                          } else {
                            // Fallback to manual input
                            const input = document.getElementById('invite-code') as HTMLInputElement;
                            if (input?.value) {
                              await exchangeInviteCode(input.value);
                            } else {
                              toast.error('Please enter your invite code');
                            }
                          }
                        } catch (error: any) {
                          console.error('Setup error:', error);
                          toast.error(`Setup failed: ${error.message}`);
                        } finally {
                          setExchangingToken(false);
                        }
                      }}
                      disabled={exchangingToken}
                    >
                      {exchangingToken ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Exchanging...
                        </>
                      ) : (
                        <>
                          <Key className="h-4 w-4 mr-2" />
                          Exchange Code
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setSetupMode(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Sync Configuration
              </CardTitle>
              <CardDescription>
                Beds24 integration settings and configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">API Status</h4>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Last Sync</h4>
                  <p className="text-sm text-muted-foreground">
                    {syncStats.recentSync 
                      ? format(new Date(syncStats.recentSync), 'PPpp')
                      : 'Never synced'
                    }
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <Button onClick={syncBeds24Data} disabled={syncing}>
                  {syncing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Manual Sync
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Manually trigger a sync with Beds24 to fetch the latest bookings
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}