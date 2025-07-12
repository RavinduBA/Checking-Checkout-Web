import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type Location = Tables<"locations">;
type Account = Tables<"accounts">;

export default function BookingForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const isEdit = Boolean(id);
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    guest_name: "",
    location_id: searchParams.get("location") || "",
    check_in: searchParams.get("date") || "",
    check_out: "",
    source: "direct" as "direct" | "airbnb" | "booking_com",
    total_amount: "",
    advance_amount: "",
    account_id: "",
    payment_method: "cash",
    note: ""
  });

  useEffect(() => {
    fetchData();
    if (isEdit && id) {
      fetchBooking(id);
    }
  }, [id, isEdit]);

  const fetchData = async () => {
    try {
      const [locationsData, accountsData] = await Promise.all([
        supabase.from("locations").select("*").eq("is_active", true),
        supabase.from("accounts").select("*")
      ]);

      setLocations(locationsData.data || []);
      setAccounts(accountsData.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchBooking = async (bookingId: string) => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          guest_name: data.guest_name,
          location_id: data.location_id,
          check_in: data.check_in.split('T')[0],
          check_out: data.check_out.split('T')[0],
          total_amount: data.total_amount.toString(),
          advance_amount: data.advance_amount.toString(),
          source: data.source,
          account_id: "",
          payment_method: "cash",
          note: ""
        });
      }
    } catch (error) {
      console.error("Error fetching booking:", error);
      toast({
        title: "Error",
        description: "Failed to load booking details",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const bookingData = {
        guest_name: formData.guest_name,
        location_id: formData.location_id,
        check_in: new Date(formData.check_in).toISOString(),
        check_out: new Date(formData.check_out).toISOString(),
        source: formData.source,
        total_amount: parseFloat(formData.total_amount) || 0,
        advance_amount: parseFloat(formData.advance_amount) || 0,
        paid_amount: parseFloat(formData.advance_amount) || 0,
        status: "confirmed" as any
      };

      let booking;
      if (isEdit && id) {
        const { data, error: bookingError } = await supabase
          .from("bookings")
          .update(bookingData)
          .eq("id", id)
          .select()
          .single();

        if (bookingError) throw bookingError;
        booking = data;
      } else {
        const { data, error: bookingError } = await supabase
          .from("bookings")
          .insert(bookingData)
          .select()
          .single();

        if (bookingError) throw bookingError;
        booking = data;

        // Create advance payment if amount > 0
        if (parseFloat(formData.advance_amount) > 0 && formData.account_id) {
          const { error: paymentError } = await supabase
            .from("booking_payments")
            .insert({
              booking_id: booking.id,
              account_id: formData.account_id,
              amount: parseFloat(formData.advance_amount),
              payment_method: formData.payment_method,
              is_advance: true,
              note: formData.note
            });

          if (paymentError) throw paymentError;

          // Create income record
          const { error: incomeError } = await supabase
            .from("income")
            .insert({
              booking_id: booking.id,
              location_id: formData.location_id,
              account_id: formData.account_id,
              amount: parseFloat(formData.advance_amount),
              type: "booking" as any,
              payment_method: formData.payment_method,
              is_advance: true,
              note: formData.note
            });

          if (incomeError) throw incomeError;
        }
      }

      toast({
        title: "Success",
        description: `Booking ${isEdit ? 'updated' : 'created'} successfully`
      });

      navigate("/calendar");
    } catch (error: any) {
      console.error("Error saving booking:", error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEdit ? 'update' : 'create'} booking`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/calendar">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEdit ? 'Edit Booking' : 'New Booking'}
          </h1>
          <p className="text-muted-foreground">
            {isEdit ? 'Update booking details' : 'Create a new booking reservation'}
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="bg-gradient-card border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-primary" />
            {isEdit ? 'Update Booking Details' : 'Booking Details'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guest_name">Guest Name *</Label>
                <Input
                  id="guest_name"
                  value={formData.guest_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, guest_name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location_id">Location *</Label>
                <Select 
                  value={formData.location_id} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, location_id: value }))}
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

              <div className="space-y-2">
                <Label htmlFor="check_in">Check-in Date *</Label>
                <Input
                  id="check_in"
                  type="date"
                  value={formData.check_in}
                  onChange={(e) => setFormData(prev => ({ ...prev, check_in: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="check_out">Check-out Date *</Label>
                <Input
                  id="check_out"
                  type="date"
                  value={formData.check_out}
                  onChange={(e) => setFormData(prev => ({ ...prev, check_out: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Select 
                  value={formData.source} 
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, source: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Direct</SelectItem>
                    <SelectItem value="airbnb">Airbnb</SelectItem>
                    <SelectItem value="booking_com">Booking.com</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_amount">Total Amount</Label>
                <Input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="advance_amount">Advance Payment</Label>
                <Input
                  id="advance_amount"
                  type="number"
                  step="0.01"
                  value={formData.advance_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, advance_amount: e.target.value }))}
                />
              </div>

              {parseFloat(formData.advance_amount) > 0 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="account_id">Payment Account *</Label>
                    <Select 
                      value={formData.account_id} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, account_id: value }))}
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

                  <div className="space-y-2">
                    <Label htmlFor="payment_method">Payment Method</Label>
                    <Select 
                      value={formData.payment_method} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">Notes</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {loading ? (isEdit ? "Updating..." : "Creating...") : (isEdit ? "Update Booking" : "Create Booking")}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/calendar")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}