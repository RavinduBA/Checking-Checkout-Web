import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Calendar, 
  User, 
  CreditCard, 
  Edit, 
  Eye, 
  CheckCircle, 
  XCircle,
  Clock,
  UserCheck,
  Settings,
  Receipt,
  Banknote
} from "lucide-react";

type Location = {
  id: string;
  name: string;
};

type Room = {
  id: string;
  room_number: string;
  room_type: string;
  base_price: number;
  location_id: string;
};

type Account = {
  id: string;
  name: string;
  currency: string;
};

type Reservation = {
  id: string;
  reservation_number: string;
  location_id: string;
  room_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_address: string;
  guest_id_number: string;
  guest_nationality: string;
  adults: number;
  children: number;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  room_rate: number;
  total_amount: number;
  advance_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: 'tentative' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'pending';
  special_requests: string;
  arrival_time: string;
  grc_approved: boolean;
  created_at: string;
  locations?: Location;
  rooms?: Room;
};

type Payment = {
  id: string;
  payment_number: string;
  reservation_id: string;
  amount: number;
  payment_method: string;
  account_id: string;
  payment_type: string;
  reference_number: string;
  notes: string;
  created_at: string;
};

export default function Income() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReservationDialogOpen, setIsReservationDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [selectedTab, setSelectedTab] = useState("reservations");
  
  const [reservationForm, setReservationForm] = useState({
    location_id: "",
    room_id: "",
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    guest_address: "",
    guest_id_number: "",
    guest_nationality: "",
    adults: 1,
    children: 0,
    check_in_date: "",
    check_out_date: "",
    special_requests: "",
    arrival_time: "",
    advance_amount: 0,
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: "",
    account_id: "",
    payment_type: "advance",
    reference_number: "",
    notes: "",
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [reservationsRes, locationsRes, roomsRes, accountsRes] = await Promise.all([
        supabase
          .from("reservations")
          .select(`
            *,
            locations (id, name),
            rooms (id, room_number, room_type, base_price, location_id)
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("locations")
          .select("*")
          .eq("is_active", true),
        supabase
          .from("rooms")
          .select("*")
          .eq("is_active", true),
        supabase
          .from("accounts")
          .select("*")
      ]);

      if (reservationsRes.error) throw reservationsRes.error;
      if (locationsRes.error) throw locationsRes.error;
      if (roomsRes.error) throw roomsRes.error;
      if (accountsRes.error) throw accountsRes.error;

      setReservations(reservationsRes.data || []);
      setLocations(locationsRes.data || []);
      setRooms(roomsRes.data || []);
      setAccounts(accountsRes.data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const selectedRoom = rooms.find(r => r.id === reservationForm.room_id);
      if (!selectedRoom) throw new Error("Room not found");

      const nights = calculateNights(reservationForm.check_in_date, reservationForm.check_out_date);
      const totalAmount = nights * selectedRoom.base_price;
      const balanceAmount = totalAmount - reservationForm.advance_amount;

      // Generate reservation number by getting count and creating unique number
      const { data: existingReservations, error: countError } = await supabase
        .from('reservations')
        .select('id');
      
      if (countError) throw countError;
      
      const currentYear = new Date().getFullYear();
      const reservationNumber = `RES${currentYear}${String((existingReservations?.length || 0) + 1).padStart(4, '0')}`;

      const reservationData = {
        ...reservationForm,
        reservation_number: reservationNumber,
        nights,
        room_rate: selectedRoom.base_price,
        total_amount: totalAmount,
        paid_amount: reservationForm.advance_amount,
        balance_amount: balanceAmount,
        status: 'tentative' as const,
      };

      const { error } = await supabase
        .from("reservations")
        .insert([reservationData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reservation created successfully",
      });

      setIsReservationDialogOpen(false);
      setReservationForm({
        location_id: "",
        room_id: "",
        guest_name: "",
        guest_email: "",
        guest_phone: "",
        guest_address: "",
        guest_id_number: "",
        guest_nationality: "",
        adults: 1,
        children: 0,
        check_in_date: "",
        check_out_date: "",
        special_requests: "",
        arrival_time: "",
        advance_amount: 0,
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create reservation",
        variant: "destructive",
      });
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReservation) return;

    try {
      // Generate payment number
      const { data: existingPayments, error: countError } = await supabase
        .from('payments')
        .select('id');
      
      if (countError) throw countError;
      
      const currentYear = new Date().getFullYear();
      const paymentNumber = `PAY${currentYear}${String((existingPayments?.length || 0) + 1).padStart(4, '0')}`;

      const paymentData = {
        ...paymentForm,
        payment_number: paymentNumber,
        reservation_id: selectedReservation.id,
      };

      const { error } = await supabase
        .from("payments")
        .insert([paymentData]);

      if (error) throw error;

      // Update reservation paid amount
      const newPaidAmount = selectedReservation.paid_amount + paymentForm.amount;
      const newBalanceAmount = selectedReservation.total_amount - newPaidAmount;

      await supabase
        .from("reservations")
        .update({ 
          paid_amount: newPaidAmount,
          balance_amount: newBalanceAmount 
        })
        .eq("id", selectedReservation.id);

      toast({
        title: "Success",
        description: "Payment processed successfully",
      });

      setIsPaymentDialogOpen(false);
      setSelectedReservation(null);
      setPaymentForm({
        amount: 0,
        payment_method: "",
        account_id: "",
        payment_type: "advance",
        reference_number: "",
        notes: "",
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive",
      });
    }
  };

  const updateReservationStatus = async (id: string, status: string, grcApproved?: boolean) => {
    try {
      const updateData: any = { status };
      if (grcApproved !== undefined) {
        updateData.grc_approved = grcApproved;
        updateData.grc_approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("reservations")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reservation status updated",
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'tentative': return 'secondary';
      case 'confirmed': return 'default';
      case 'checked_in': return 'default';
      case 'checked_out': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getFilteredRooms = () => {
    return rooms.filter(room => room.location_id === reservationForm.location_id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reservations & Payments</h1>
          <p className="text-muted-foreground">Manage hotel reservations and process payments</p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="reservations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Hotel Reservations
                  </CardTitle>
                  <CardDescription>
                    Manage guest reservations and bookings
                  </CardDescription>
                </div>
                <Dialog open={isReservationDialogOpen} onOpenChange={setIsReservationDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Reservation
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Create New Reservation</DialogTitle>
                      <DialogDescription>
                        Enter guest details and booking information
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleReservationSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="location_id">Location</Label>
                          <Select
                            value={reservationForm.location_id}
                            onValueChange={(value) => 
                              setReservationForm({ ...reservationForm, location_id: value, room_id: "" })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                              {locations.map((location) => (
                                <SelectItem key={location.id} value={location.id}>
                                  {location.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="room_id">Room</Label>
                          <Select
                            value={reservationForm.room_id}
                            onValueChange={(value) => 
                              setReservationForm({ ...reservationForm, room_id: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select room" />
                            </SelectTrigger>
                            <SelectContent>
                              {getFilteredRooms().map((room) => (
                                <SelectItem key={room.id} value={room.id}>
                                  {room.room_number} - {room.room_type} (LKR {room.base_price}/night)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="guest_name">Guest Name</Label>
                          <Input
                            id="guest_name"
                            value={reservationForm.guest_name}
                            onChange={(e) => setReservationForm({ ...reservationForm, guest_name: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="guest_email">Guest Email</Label>
                          <Input
                            id="guest_email"
                            type="email"
                            value={reservationForm.guest_email}
                            onChange={(e) => setReservationForm({ ...reservationForm, guest_email: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="guest_phone">Phone Number</Label>
                          <Input
                            id="guest_phone"
                            value={reservationForm.guest_phone}
                            onChange={(e) => setReservationForm({ ...reservationForm, guest_phone: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="guest_nationality">Nationality</Label>
                          <Input
                            id="guest_nationality"
                            value={reservationForm.guest_nationality}
                            onChange={(e) => setReservationForm({ ...reservationForm, guest_nationality: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="guest_address">Address</Label>
                        <Textarea
                          id="guest_address"
                          value={reservationForm.guest_address}
                          onChange={(e) => setReservationForm({ ...reservationForm, guest_address: e.target.value })}
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor="adults">Adults</Label>
                          <Input
                            id="adults"
                            type="number"
                            min="1"
                            value={reservationForm.adults}
                            onChange={(e) => setReservationForm({ ...reservationForm, adults: parseInt(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="children">Children</Label>
                          <Input
                            id="children"
                            type="number"
                            min="0"
                            value={reservationForm.children}
                            onChange={(e) => setReservationForm({ ...reservationForm, children: parseInt(e.target.value) })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="check_in_date">Check-in Date</Label>
                          <Input
                            id="check_in_date"
                            type="date"
                            value={reservationForm.check_in_date}
                            onChange={(e) => setReservationForm({ ...reservationForm, check_in_date: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="check_out_date">Check-out Date</Label>
                          <Input
                            id="check_out_date"
                            type="date"
                            value={reservationForm.check_out_date}
                            onChange={(e) => setReservationForm({ ...reservationForm, check_out_date: e.target.value })}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="arrival_time">Expected Arrival Time</Label>
                          <Input
                            id="arrival_time"
                            type="time"
                            value={reservationForm.arrival_time}
                            onChange={(e) => setReservationForm({ ...reservationForm, arrival_time: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="advance_amount">Advance Payment (LKR)</Label>
                          <Input
                            id="advance_amount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={reservationForm.advance_amount}
                            onChange={(e) => setReservationForm({ ...reservationForm, advance_amount: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="special_requests">Special Requests</Label>
                        <Textarea
                          id="special_requests"
                          value={reservationForm.special_requests}
                          onChange={(e) => setReservationForm({ ...reservationForm, special_requests: e.target.value })}
                          rows={3}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsReservationDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          Create Reservation
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reservation #</TableHead>
                    <TableHead>Guest Name</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>GRC</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell className="font-medium">
                        {reservation.reservation_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{reservation.guest_name}</div>
                          <div className="text-sm text-muted-foreground">{reservation.guest_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{reservation.rooms?.room_number}</div>
                          <div className="text-sm text-muted-foreground">{reservation.locations?.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(reservation.check_in_date).toLocaleDateString()} - {new Date(reservation.check_out_date).toLocaleDateString()}</div>
                          <div className="text-muted-foreground">{reservation.nights} nights</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>Total: LKR {reservation.total_amount.toLocaleString()}</div>
                          <div className="text-green-600">Paid: LKR {reservation.paid_amount.toLocaleString()}</div>
                          <div className="text-red-600">Balance: LKR {reservation.balance_amount.toLocaleString()}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(reservation.status)}>
                          {reservation.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {reservation.grc_approved ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm">
                            {reservation.grc_approved ? "Approved" : "Pending"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!reservation.grc_approved && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateReservationStatus(reservation.id, reservation.status, true)}
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedReservation(reservation);
                              setPaymentForm({
                                ...paymentForm,
                                amount: reservation.balance_amount
                              });
                              setIsPaymentDialogOpen(true);
                            }}
                          >
                            <CreditCard className="h-4 w-4" />
                          </Button>
                          <Select
                            value={reservation.status}
                            onValueChange={(value) => updateReservationStatus(reservation.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="tentative">Tentative</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="checked_in">Checked In</SelectItem>
                              <SelectItem value="checked_out">Checked Out</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Payment History
              </CardTitle>
              <CardDescription>
                View all payment transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Payment history will be displayed here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
            <DialogDescription>
              Process payment for reservation {selectedReservation?.reservation_number}
            </DialogDescription>
          </DialogHeader>
          {selectedReservation && (
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm">
                  <div>Guest: {selectedReservation.guest_name}</div>
                  <div>Room: {selectedReservation.rooms?.room_number}</div>
                  <div>Total Amount: LKR {selectedReservation.total_amount.toLocaleString()}</div>
                  <div>Paid Amount: LKR {selectedReservation.paid_amount.toLocaleString()}</div>
                  <div className="font-medium text-red-600">Balance: LKR {selectedReservation.balance_amount.toLocaleString()}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Payment Amount (LKR)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="payment_method">Payment Method</Label>
                  <Select
                    value={paymentForm.payment_method}
                    onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Credit/Debit Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="account_id">Account</Label>
                  <Select
                    value={paymentForm.account_id}
                    onValueChange={(value) => setPaymentForm({ ...paymentForm, account_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payment_type">Payment Type</Label>
                  <Select
                    value={paymentForm.payment_type}
                    onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="advance">Advance</SelectItem>
                      <SelectItem value="balance">Balance</SelectItem>
                      <SelectItem value="full">Full Payment</SelectItem>
                      <SelectItem value="extra">Extra Charges</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="reference_number">Reference Number</Label>
                <Input
                  id="reference_number"
                  value={paymentForm.reference_number}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                  placeholder="Transaction reference"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPaymentDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  <Banknote className="h-4 w-4 mr-2" />
                  Process Payment
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}