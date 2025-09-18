import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Plus, Eye, Edit, CreditCard, Printer, AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import SignatureCanvas from 'react-signature-canvas';
import { usePermissions } from "@/hooks/usePermissions";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Database = any;

type Reservation = Database['public']['Tables']['reservations']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];
type Location = Database['public']['Tables']['locations']['Row'];
type Room = Database['public']['Tables']['rooms']['Row'];
type Account = Database['public']['Tables']['accounts']['Row'];

const Income = () => {
  const { toast } = useToast();
  const sigCanvas = useRef<SignatureCanvas | null>(null);
  const { hasAnyPermission, hasPermission } = usePermissions();
  
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isReservationDialogOpen, setIsReservationDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  
  const [reservationForm, setReservationForm] = useState({
    location_id: "",
    room_id: "",
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    guest_address: "",
    guest_nationality: "",
    adults: 1,
    children: 0,
    check_in_date: "",
    check_out_date: "",
    special_requests: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    payment_type: "room_payment",
    payment_method: "",
    amount: 0,
    account_id: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reservationsRes, locationsRes, roomsRes, accountsRes, paymentsRes] = await Promise.all([
        supabase
          .from("reservations")
          .select("*, rooms(room_number, room_type), locations(name)")
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
          .select("*"),
        supabase
          .from("payments")
          .select("*, reservations(guest_name, reservation_number)")
          .order("created_at", { ascending: false })
      ]);

      if (reservationsRes.error) throw reservationsRes.error;
      if (locationsRes.error) throw locationsRes.error;
      if (roomsRes.error) throw roomsRes.error;
      if (accountsRes.error) throw accountsRes.error;
      if (paymentsRes.error) throw paymentsRes.error;

      setReservations(reservationsRes.data || []);
      setLocations(locationsRes.data || []);
      setRooms(roomsRes.data || []);
      setAccounts(accountsRes.data || []);
      setPayments(paymentsRes.data || []);
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

      // Get count for reservation number
      const { data: existingReservations, error: countError } = await supabase
        .from('reservations')
        .select('id');
      
      if (countError) throw countError;
      
      const currentYear = new Date().getFullYear();
      const reservationNumber = `RES${currentYear}${String((existingReservations?.length || 0) + 1).padStart(4, '0')}`;

      const reservationData = {
        location_id: reservationForm.location_id,
        room_id: reservationForm.room_id,
        guest_name: reservationForm.guest_name,
        guest_email: reservationForm.guest_email || null,
        guest_phone: reservationForm.guest_phone || null,
        guest_address: reservationForm.guest_address || null,
        guest_nationality: reservationForm.guest_nationality || null,
        adults: reservationForm.adults,
        children: reservationForm.children,
        check_in_date: reservationForm.check_in_date,
        check_out_date: reservationForm.check_out_date,
        special_requests: reservationForm.special_requests || null,
        advance_amount: 0,
        nights,
        room_rate: selectedRoom.base_price,
        total_amount: totalAmount,
        paid_amount: 0,
        balance_amount: totalAmount,
        status: 'tentative' as const,
        reservation_number: reservationNumber,
      };

      const { error } = await supabase
        .from("reservations")
        .insert(reservationData);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reservation created successfully",
      });

      setIsReservationDialogOpen(false);
      resetReservationForm();
      fetchData();
    } catch (error) {
      console.error('Reservation creation error:', error);
      toast({
        title: "Error",
        description: "Failed to create reservation",
        variant: "destructive",
      });
    }
  };

  const resetReservationForm = () => {
    setReservationForm({
      location_id: "",
      room_id: "",
      guest_name: "",
      guest_email: "",
      guest_phone: "",
      guest_address: "",
      guest_nationality: "",
      adults: 1,
      children: 0,
      check_in_date: "",
      check_out_date: "",
      special_requests: "",
    });
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReservation) return;

    try {
      // Get count for payment number
      const { data: existingPayments, error: countError } = await supabase
        .from('payments')
        .select('id');
      
      if (countError) throw countError;
      
      const currentYear = new Date().getFullYear();
      const paymentNumber = `PAY${currentYear}${String((existingPayments?.length || 0) + 1).padStart(4, '0')}`;

      const paymentData = {
        reservation_id: selectedReservation.id,
        payment_type: paymentForm.payment_type,
        payment_method: paymentForm.payment_method,
        amount: paymentForm.amount,
        account_id: paymentForm.account_id,
        notes: paymentForm.notes || null,
        payment_number: paymentNumber,
      };

      const { error: paymentError } = await supabase
        .from("payments")
        .insert(paymentData);

      if (paymentError) throw paymentError;

      // Create income record
      const incomeData = {
        location_id: selectedReservation.location_id,
        account_id: paymentForm.account_id,
        type: 'booking' as const,
        amount: paymentForm.amount,
        payment_method: paymentForm.payment_method,
        booking_id: selectedReservation.id,
        booking_source: 'direct',
        check_in_date: selectedReservation.check_in_date,
        check_out_date: selectedReservation.check_out_date,
        note: paymentForm.notes || null,
        currency: 'LKR' as const,
      };

      const { error: incomeError } = await supabase
        .from("income")
        .insert(incomeData);

      if (incomeError) throw incomeError;

      // Update reservation paid amount
      const newPaidAmount = selectedReservation.paid_amount + paymentForm.amount;
      const newBalanceAmount = selectedReservation.total_amount - newPaidAmount;

      await supabase
        .from("reservations")
        .update({
          paid_amount: newPaidAmount,
          balance_amount: newBalanceAmount,
          status: newBalanceAmount <= 0 ? 'confirmed' : 'tentative'
        })
        .eq("id", selectedReservation.id);

      toast({
        title: "Success",
        description: "Payment processed successfully",
      });

      setIsPaymentDialogOpen(false);
      setSelectedReservation(null);
      resetPaymentForm();
      fetchData();
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive",
      });
    }
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      payment_type: "room_payment",
      payment_method: "",
      amount: 0,
      account_id: "",
      notes: "",
    });
  };

  const handlePrint = () => {
    const signature = sigCanvas.current?.toDataURL();
    const printWindow = window.open('', '_blank');
    if (printWindow && selectedReservation) {
      const room = rooms.find(r => r.id === selectedReservation.room_id);
      const location = locations.find(l => l.id === selectedReservation.location_id);
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Reservation Details - ${selectedReservation.reservation_number}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .details { margin: 20px 0; }
              .signature { margin-top: 50px; }
              .row { display: flex; justify-content: space-between; margin: 10px 0; }
              .label { font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Hotel Management System</h1>
              <h2>Reservation Details</h2>
            </div>
            
            <div class="details">
              <div class="row">
                <span class="label">Reservation Number:</span>
                <span>${selectedReservation.reservation_number}</span>
              </div>
              <div class="row">
                <span class="label">Guest Name:</span>
                <span>${selectedReservation.guest_name}</span>
              </div>
              <div class="row">
                <span class="label">Location:</span>
                <span>${location?.name || 'N/A'}</span>
              </div>
              <div class="row">
                <span class="label">Room:</span>
                <span>${room?.room_number} - ${room?.room_type}</span>
              </div>
              <div class="row">
                <span class="label">Check-in:</span>
                <span>${new Date(selectedReservation.check_in_date).toLocaleDateString()}</span>
              </div>
              <div class="row">
                <span class="label">Check-out:</span>
                <span>${new Date(selectedReservation.check_out_date).toLocaleDateString()}</span>
              </div>
              <div class="row">
                <span class="label">Nights:</span>
                <span>${selectedReservation.nights}</span>
              </div>
              <div class="row">
                <span class="label">Total Amount:</span>
                <span>LKR ${selectedReservation.total_amount.toLocaleString()}</span>
              </div>
              <div class="row">
                <span class="label">Paid Amount:</span>
                <span>LKR ${selectedReservation.paid_amount.toLocaleString()}</span>
              </div>
              <div class="row">
                <span class="label">Balance Amount:</span>
                <span>LKR ${selectedReservation.balance_amount.toLocaleString()}</span>
              </div>
              <div class="row">
                <span class="label">Status:</span>
                <span>${selectedReservation.status.toUpperCase()}</span>
              </div>
            </div>
            
            <div class="signature">
              <p><strong>Guest Signature:</strong></p>
              ${signature ? `<img src="${signature}" style="border: 1px solid #ccc; max-width: 300px; height: 100px;" />` : '<div style="border: 1px solid #ccc; width: 300px; height: 100px;"></div>'}
              <p>Date: ${new Date().toLocaleDateString()}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      tentative: "secondary",
      confirmed: "default",
      checked_in: "secondary",
      checked_out: "outline",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!hasAnyPermission("income")) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this page. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Reservations & Payments</h1>
        <Dialog open={isReservationDialogOpen} onOpenChange={setIsReservationDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Reservation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Reservation</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleReservationSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Select value={reservationForm.location_id} onValueChange={(value) => setReservationForm({...reservationForm, location_id: value})}>
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
                  <Label htmlFor="room">Room</Label>
                  <Select value={reservationForm.room_id} onValueChange={(value) => setReservationForm({...reservationForm, room_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.filter(room => room.location_id === reservationForm.location_id).map((room) => (
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
                  <Label htmlFor="guest_name">Guest Name*</Label>
                  <Input
                    id="guest_name"
                    value={reservationForm.guest_name}
                    onChange={(e) => setReservationForm({...reservationForm, guest_name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="guest_email">Guest Email</Label>
                  <Input
                    id="guest_email"
                    type="email"
                    value={reservationForm.guest_email}
                    onChange={(e) => setReservationForm({...reservationForm, guest_email: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="guest_phone">Phone Number</Label>
                  <Input
                    id="guest_phone"
                    value={reservationForm.guest_phone}
                    onChange={(e) => setReservationForm({...reservationForm, guest_phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="guest_nationality">Nationality</Label>
                  <Input
                    id="guest_nationality"
                    value={reservationForm.guest_nationality}
                    onChange={(e) => setReservationForm({...reservationForm, guest_nationality: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="guest_address">Address</Label>
                <Textarea
                  id="guest_address"
                  value={reservationForm.guest_address}
                  onChange={(e) => setReservationForm({...reservationForm, guest_address: e.target.value})}
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
                    onChange={(e) => setReservationForm({...reservationForm, adults: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="children">Children</Label>
                  <Input
                    id="children"
                    type="number"
                    min="0"
                    value={reservationForm.children}
                    onChange={(e) => setReservationForm({...reservationForm, children: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <Label htmlFor="check_in_date">Check-in Date</Label>
                  <Input
                    id="check_in_date"
                    type="date"
                    value={reservationForm.check_in_date}
                    onChange={(e) => setReservationForm({...reservationForm, check_in_date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="check_out_date">Check-out Date</Label>
                  <Input
                    id="check_out_date"
                    type="date"
                    value={reservationForm.check_out_date}
                    onChange={(e) => setReservationForm({...reservationForm, check_out_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="special_requests">Special Requests</Label>
                <Textarea
                  id="special_requests"
                  value={reservationForm.special_requests}
                  onChange={(e) => setReservationForm({...reservationForm, special_requests: e.target.value})}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsReservationDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Reservation</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="reservations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="reservations">
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
                  {reservations.map((reservation) => {
                    const room = rooms.find(r => r.id === reservation.room_id);
                    return (
                      <TableRow key={reservation.id}>
                        <TableCell className="font-medium">{reservation.reservation_number}</TableCell>
                        <TableCell>{reservation.guest_name}</TableCell>
                        <TableCell>{room?.room_number} - {room?.room_type}</TableCell>
                        <TableCell>{new Date(reservation.check_in_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(reservation.check_out_date).toLocaleDateString()}</TableCell>
                        <TableCell>LKR {reservation.total_amount.toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                        <TableCell className="space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedReservation(reservation);
                              setIsPrintDialogOpen(true);
                            }}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment #</TableHead>
                    <TableHead>Reservation</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.payment_number}</TableCell>
                      <TableCell>{payment.reservations?.guest_name} ({payment.reservations?.reservation_number})</TableCell>
                      <TableCell>LKR {payment.amount.toLocaleString()}</TableCell>
                      <TableCell>{payment.payment_method}</TableCell>
                      <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div>
              <Label>Reservation: {selectedReservation?.guest_name} ({selectedReservation?.reservation_number})</Label>
              <p className="text-sm text-muted-foreground">
                Balance Amount: LKR {selectedReservation?.balance_amount.toLocaleString()}
              </p>
            </div>
            
            <div>
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select value={paymentForm.payment_method} onValueChange={(value) => setPaymentForm({...paymentForm, payment_method: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="online">Online Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="account_id">Account</Label>
              <Select value={paymentForm.account_id} onValueChange={(value) => setPaymentForm({...paymentForm, account_id: value})}>
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
              <Label htmlFor="amount">Amount (LKR)</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({...paymentForm, amount: parseFloat(e.target.value)})}
                required
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Process Payment</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Print Dialog */}
      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Print Reservation Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Guest Signature</Label>
              <div className="border border-gray-300 rounded mt-2">
                <SignatureCanvas
                  ref={sigCanvas}
                  canvasProps={{
                    width: 400,
                    height: 200,
                    className: 'signature-canvas w-full'
                  }}
                />
              </div>
              <div className="flex space-x-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => sigCanvas.current?.clear()}
                >
                  Clear
                </Button>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsPrintDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Income;