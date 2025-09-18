import { useState, useEffect } from "react";
import { Eye, Printer, Edit, Calendar, User, MapPin, DollarSign, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { useAutoLocation } from "@/hooks/useAutoLocation";
import { OTPVerification } from "@/components/OTPVerification";
import { useToast } from "@/hooks/use-toast";

type Reservation = Tables<"reservations"> & {
  locations: Tables<"locations">;
  rooms: Tables<"rooms">;
};

type Payment = Tables<"payments">;

export const ReservationsList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { autoSelectedLocation, shouldShowLocationSelect, availableLocations } = useAutoLocation();
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [otpVerifiedIds, setOtpVerifiedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (autoSelectedLocation && !shouldShowLocationSelect) {
      setSelectedLocation(autoSelectedLocation);
    }
  }, [autoSelectedLocation, shouldShowLocationSelect]);

  const fetchData = async () => {
    try {
      // Fetch reservations with location and room data
      const { data: reservationsData } = await supabase
        .from("reservations")
        .select(`
          *,
          locations (*),
          rooms (*)
        `)
        .order("created_at", { ascending: false });

      // Fetch payments
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      setReservations(reservationsData || []);
      setPayments(paymentsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
      tentative: "bg-amber-100 text-amber-800 border-amber-200",
      pending: "bg-orange-100 text-orange-800 border-orange-200",
      checked_in: "bg-blue-100 text-blue-800 border-blue-200",
      checked_out: "bg-gray-100 text-gray-800 border-gray-200",
      cancelled: "bg-red-100 text-red-800 border-red-200"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols = {
      'LKR': 'LKR',
      'USD': '$',
      'EUR': '€',
      'GBP': '£'
    };
    return symbols[currency as keyof typeof symbols] || currency;
  };

  const handleOTPVerified = (reservationId: string) => {
    setOtpVerifiedIds(prev => new Set([...prev, reservationId]));
    toast({
      title: "Verification Successful",
      description: "You can now edit this reservation.",
    });
  };

  const canShowPaymentButton = (status: string) => {
    return status === 'tentative' || status === 'pending';
  };

  const filteredReservations = reservations.filter(reservation => {
    const matchesLocation = selectedLocation === "all" || reservation.location_id === selectedLocation;
    const matchesSearch = searchQuery === "" || 
      reservation.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reservation.reservation_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || reservation.status === statusFilter;
    
    return matchesLocation && matchesSearch && matchesStatus;
  });

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = searchQuery === "" || 
      payment.payment_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  if (loading) {
    return <div className="flex justify-center items-center min-h-64">Loading...</div>;
  }

  return (
    <div className="max-w-full mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Reservations & Payments</h1>
        
        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          {shouldShowLocationSelect && (
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background border shadow-lg">
                <SelectItem value="all">All Locations</SelectItem>
                {availableLocations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Input
            placeholder="Search reservations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full lg:w-64"
          />
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="z-50 bg-background border shadow-lg">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="tentative">Tentative</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="checked_in">Checked In</SelectItem>
              <SelectItem value="checked_out">Checked Out</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={() => navigate("/app/reservations/new")}>
            <Calendar className="h-4 w-4 mr-2" />
            New Reservation
          </Button>
        </div>
      </div>

      <Tabs defaultValue="reservations" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="reservations" className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <Card>
              <CardHeader>
                <CardTitle>Reservations</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reservation #</TableHead>
                      <TableHead>Guest</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReservations.map((reservation) => (
                      <TableRow key={reservation.id}>
                        <TableCell className="font-medium">
                          {reservation.reservation_number}
                        </TableCell>
                        <TableCell>{reservation.guest_name}</TableCell>
                        <TableCell>
                          {reservation.rooms?.room_number} - {reservation.rooms?.room_type}
                        </TableCell>
                        <TableCell>
                          {new Date(reservation.check_in_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(reservation.check_out_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{getCurrencySymbol(reservation.currency)} {reservation.total_amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(reservation.status)}>
                            {reservation.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/app/reservations/${reservation.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/app/reservations/${reservation.id}?print=true`)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            {canShowPaymentButton(reservation.status) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/app/payments/new?reservation=${reservation.id}&amount=${reservation.balance_amount}&currency=${reservation.currency}`)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            )}
                            {otpVerifiedIds.has(reservation.id) ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/app/reservations/edit/${reservation.id}`)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            ) : (
                              <OTPVerification
                                onVerified={() => handleOTPVerified(reservation.id)}
                                triggerComponent={
                                  <Button variant="ghost" size="icon">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                }
                              />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden grid gap-4">
            {filteredReservations.map((reservation) => (
              <Card key={reservation.id} className="w-full">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-sm">{reservation.reservation_number}</h3>
                      <p className="text-muted-foreground text-xs">{reservation.guest_name}</p>
                    </div>
                    <Badge className={`${getStatusColor(reservation.status)} text-xs`}>
                      {reservation.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <span>{reservation.rooms?.room_number} - {reservation.rooms?.room_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(reservation.check_in_date).toLocaleDateString()} - {new Date(reservation.check_out_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-3 w-3" />
                      <span>{getCurrencySymbol(reservation.currency)} {reservation.total_amount.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => navigate(`/app/reservations/${reservation.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/app/reservations/${reservation.id}?print=true`)}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    {canShowPaymentButton(reservation.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/app/payments/new?reservation=${reservation.id}&amount=${reservation.balance_amount}&currency=${reservation.currency}`)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <CreditCard className="h-4 w-4" />
                      </Button>
                    )}
                    {otpVerifiedIds.has(reservation.id) ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/app/reservations/edit/${reservation.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    ) : (
                      <OTPVerification
                        onVerified={() => handleOTPVerified(reservation.id)}
                        triggerComponent={
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        }
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">
                {filteredPayments.length} payments found
              </div>
              {filteredPayments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment #</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {payment.payment_number}
                        </TableCell>
                        <TableCell>
                          {payment.currency} {payment.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>{payment.payment_method}</TableCell>
                        <TableCell>
                          {new Date(payment.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                            Completed
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No payments found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};