import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Save, Calendar, MapPin, User, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

type Location = Tables<"locations">;
type Room = Tables<"rooms">;

export default function ReservationForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);

  const [locations, setLocations] = useState<Location[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    location_id: searchParams.get('location') || '',
    room_id: searchParams.get('room') || '',
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    guest_address: '',
    guest_nationality: '',
    adults: 1,
    children: 0,
    check_in_date: searchParams.get('date') || '',
    check_out_date: '',
    room_rate: 0,
    nights: 1,
    total_amount: 0,
    advance_amount: 0,
    special_requests: '',
    status: 'tentative' as any,
    paid_amount: 0,
    balance_amount: 0
  });

  useEffect(() => {
    fetchInitialData();
    if (isEdit && id) {
      fetchReservation();
    }
  }, [isEdit, id]);

  useEffect(() => {
    calculateTotal();
  }, [formData.room_rate, formData.nights]);

  const fetchInitialData = async () => {
    try {
      const [locationsRes, roomsRes] = await Promise.all([
        supabase.from("locations").select("*").eq("is_active", true),
        supabase.from("rooms").select("*").eq("is_active", true).order("room_number")
      ]);

      setLocations(locationsRes.data || []);
      setRooms(roomsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchReservation = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setFormData({
        location_id: data.location_id,
        room_id: data.room_id,
        guest_name: data.guest_name,
        guest_email: data.guest_email || '',
        guest_phone: data.guest_phone || '',
        guest_address: data.guest_address || '',
        guest_nationality: data.guest_nationality || '',
        adults: data.adults,
        children: data.children,
        check_in_date: data.check_in_date,
        check_out_date: data.check_out_date,
        room_rate: data.room_rate,
        nights: data.nights,
        total_amount: data.total_amount,
        advance_amount: data.advance_amount || 0,
        special_requests: data.special_requests || '',
        status: data.status,
        paid_amount: data.paid_amount || 0,
        balance_amount: data.balance_amount || 0
      });
    } catch (error) {
      console.error("Error fetching reservation:", error);
      toast({
        title: "Error",
        description: "Failed to load reservation details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  };

  const calculateTotal = () => {
    const total = formData.room_rate * formData.nights;
    setFormData(prev => ({ ...prev, total_amount: total }));
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Recalculate nights when dates change
      if (field === 'check_in_date' || field === 'check_out_date') {
        updated.nights = calculateNights(updated.check_in_date, updated.check_out_date);
      }
      
      // Update room rate when room changes
      if (field === 'room_id') {
        const selectedRoom = rooms.find(room => room.id === value);
        if (selectedRoom) {
          updated.room_rate = selectedRoom.base_price;
        }
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const currentYear = new Date().getFullYear();
      
      // Calculate balance amount and remove extra fields
      const calculatedData: any = {
        location_id: formData.location_id,
        room_id: formData.room_id,
        guest_name: formData.guest_name,
        guest_email: formData.guest_email || null,
        guest_phone: formData.guest_phone || null,
        guest_address: formData.guest_address || null,
        guest_nationality: formData.guest_nationality || null,
        adults: formData.adults,
        children: formData.children,
        check_in_date: formData.check_in_date,
        check_out_date: formData.check_out_date,
        room_rate: formData.room_rate,
        nights: formData.nights,
        total_amount: formData.total_amount,
        advance_amount: formData.advance_amount,
        special_requests: formData.special_requests || null,
        status: formData.status,
        paid_amount: formData.advance_amount,
        balance_amount: formData.total_amount - formData.advance_amount
      };

      if (isEdit) {
        const { error } = await supabase
          .from("reservations")
          .update(calculatedData)
          .eq("id", id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Reservation updated successfully"
        });
      } else {
        // Generate reservation number for new reservations
        const { data: existingReservations } = await supabase
          .from('reservations')
          .select('id')
          .gte('created_at', `${currentYear}-01-01`)
          .lt('created_at', `${currentYear + 1}-01-01`);

        const reservationNumber = `RES${currentYear}${String((existingReservations?.length || 0) + 1).padStart(4, '0')}`;
        
        const insertData: any = {
          ...calculatedData,
          reservation_number: reservationNumber
        };

        const { error } = await supabase
          .from("reservations")
          .insert(insertData);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Reservation created successfully"
        });
      }

      navigate("/calendar");
    } catch (error: any) {
      console.error("Error saving reservation:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save reservation",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRooms = rooms.filter(room => 
    !formData.location_id || room.location_id === formData.location_id
  );

  if (loading) {
    return <div className="flex justify-center items-center min-h-64">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/calendar">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">
            {isEdit ? 'Edit Reservation' : 'New Reservation'}
          </h1>
          <p className="text-muted-foreground">
            {isEdit ? 'Update reservation details' : 'Create a new reservation'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Guest Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Guest Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="guest_name">Guest Name *</Label>
                <Input
                  id="guest_name"
                  value={formData.guest_name}
                  onChange={(e) => handleInputChange('guest_name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="guest_email">Email</Label>
                <Input
                  id="guest_email"
                  type="email"
                  value={formData.guest_email}
                  onChange={(e) => handleInputChange('guest_email', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="guest_phone">Phone</Label>
                <Input
                  id="guest_phone"
                  value={formData.guest_phone}
                  onChange={(e) => handleInputChange('guest_phone', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="guest_address">Address</Label>
                <Textarea
                  id="guest_address"
                  value={formData.guest_address}
                  onChange={(e) => handleInputChange('guest_address', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="guest_nationality">Nationality</Label>
                <Input
                  id="guest_nationality"
                  value={formData.guest_nationality}
                  onChange={(e) => handleInputChange('guest_nationality', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="adults">Adults *</Label>
                  <Input
                    id="adults"
                    type="number"
                    min="1"
                    value={formData.adults}
                    onChange={(e) => handleInputChange('adults', parseInt(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="children">Children</Label>
                  <Input
                    id="children"
                    type="number"
                    min="0"
                    value={formData.children}
                    onChange={(e) => handleInputChange('children', parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reservation Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Reservation Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="location_id">Location *</Label>
                <Select value={formData.location_id} onValueChange={(value) => handleInputChange('location_id', value)}>
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
                <Label htmlFor="room_id">Room *</Label>
                <Select value={formData.room_id} onValueChange={(value) => handleInputChange('room_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredRooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.room_number} - {room.room_type} (LKR {room.base_price})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="check_in_date">Check-in Date *</Label>
                  <Input
                    id="check_in_date"
                    type="date"
                    value={formData.check_in_date}
                    onChange={(e) => handleInputChange('check_in_date', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="check_out_date">Check-out Date *</Label>
                  <Input
                    id="check_out_date"
                    type="date"
                    value={formData.check_out_date}
                    onChange={(e) => handleInputChange('check_out_date', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tentative">Tentative</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="checked_in">Checked In</SelectItem>
                    <SelectItem value="checked_out">Checked Out</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Pricing Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="room_rate">Room Rate per Night</Label>
                <Input
                  id="room_rate"
                  type="number"
                  value={formData.room_rate}
                  onChange={(e) => handleInputChange('room_rate', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="nights">Number of Nights</Label>
                <Input
                  id="nights"
                  type="number"
                  value={formData.nights}
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="total_amount">Total Amount</Label>
                <Input
                  id="total_amount"
                  type="number"
                  value={formData.total_amount}
                  readOnly
                />
              </div>
              <div>
                <Label htmlFor="advance_amount">Advance Amount</Label>
                <Input
                  id="advance_amount"
                  type="number"
                  value={formData.advance_amount}
                  onChange={(e) => handleInputChange('advance_amount', parseFloat(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Special Requests */}
          <Card>
            <CardHeader>
              <CardTitle>Special Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.special_requests}
                onChange={(e) => handleInputChange('special_requests', e.target.value)}
                placeholder="Any special requests or notes..."
                rows={6}
              />
            </CardContent>
          </Card>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link to="/calendar">Cancel</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            <Save className="h-4 w-4 mr-2" />
            {submitting ? 'Saving...' : (isEdit ? 'Update Reservation' : 'Create Reservation')}
          </Button>
        </div>
      </form>
    </div>
  );
}