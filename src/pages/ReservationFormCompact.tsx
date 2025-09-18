import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Save, Calendar, MapPin, User, CreditCard, UserCheck, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useAutoLocation } from "@/hooks/useAutoLocation";
import { PhotoAttachment } from "@/components/PhotoAttachment";
import { SignatureCapture } from "@/components/SignatureCapture";
import { AirbnbDatePicker } from "@/components/AirbnbDatePicker";
import { CurrencySelector } from "@/components/CurrencySelector";
import { PricingDisplay } from "@/components/PricingDisplay";
import { convertCurrency } from "@/utils/currency";

type Location = Tables<"locations">;
type Room = Tables<"rooms">;
type Guide = Tables<"guides">;
type Agent = Tables<"agents">;

export default function ReservationFormCompact() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { autoSelectedLocation, shouldShowLocationSelect, availableLocations, loading: locationLoading } = useAutoLocation();
  const isEdit = Boolean(id);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showGuideDialog, setShowGuideDialog] = useState(false);
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [idPhotos, setIdPhotos] = useState<string[]>([]);
  const [guestSignature, setGuestSignature] = useState("");

  const [formData, setFormData] = useState({
    location_id: searchParams.get('location') || autoSelectedLocation || '',
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
    special_requests: '',
    status: 'tentative' as any,
    paid_amount: 0,
    balance_amount: 0,
    has_guide: false,
    has_agent: false,
    guide_id: '',
    agent_id: '',
    guide_commission: 0,
    agent_commission: 0,
    currency: 'LKR' as any,
    booking_source: 'direct' as any,
  });

  const [newGuide, setNewGuide] = useState({
    name: '',
    phone: '',
    email: '',
    commission_rate: 10
  });

  const [newAgent, setNewAgent] = useState({
    name: '',
    phone: '',
    email: '',
    agency_name: '',
    commission_rate: 15
  });

  useEffect(() => {
    if (!locationLoading) {
      fetchInitialData();
      if (isEdit && id) {
        fetchReservation();
      }
    }
  }, [isEdit, id, locationLoading]);

  useEffect(() => {
    // Auto-select location if user has access to only one
    if (autoSelectedLocation && !shouldShowLocationSelect && !formData.location_id) {
      setFormData(prev => ({ ...prev, location_id: autoSelectedLocation }));
    }
  }, [autoSelectedLocation, shouldShowLocationSelect]);

  useEffect(() => {
    calculateTotal();
  }, [formData.room_rate, formData.nights, formData.currency]);

  const fetchInitialData = async () => {
    try {
      const [roomsRes, guidesRes, agentsRes] = await Promise.all([
        supabase.from("rooms").select("*").eq("is_active", true).order("room_number"),
        supabase.from("guides").select("*").eq("is_active", true).order("name"),
        supabase.from("agents").select("*").eq("is_active", true).order("name")
      ]);

      setRooms(roomsRes.data || []);
      setGuides(guidesRes.data || []);
      setAgents(agentsRes.data || []);
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
        special_requests: data.special_requests || '',
        status: data.status,
        paid_amount: data.paid_amount || 0,
        balance_amount: data.balance_amount || 0,
        has_guide: Boolean(data.guide_id),
        has_agent: Boolean(data.agent_id),
        guide_id: data.guide_id || '',
        agent_id: data.agent_id || '',
        guide_commission: data.guide_commission || 0,
        agent_commission: data.agent_commission || 0,
        currency: data.currency || 'LKR',
        booking_source: 'direct',
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

  const calculateTotal = async () => {
    let roomRate = formData.room_rate;
    
    // Convert room rate if currencies don't match
    if (formData.room_id && formData.currency) {
      const selectedRoom = rooms.find(room => room.id === formData.room_id);
      if (selectedRoom && selectedRoom.currency !== formData.currency) {
        try {
          roomRate = await convertCurrency(selectedRoom.base_price, selectedRoom.currency, formData.currency);
        } catch (error) {
          console.error('Currency conversion failed:', error);
          roomRate = selectedRoom.base_price; // Fallback to original rate
        }
      }
    }
    
    const total = roomRate * formData.nights;
    const balanceAmount = total;
    
    setFormData(prev => ({ 
      ...prev, 
      room_rate: roomRate,
      total_amount: total,
      balance_amount: balanceAmount,
      paid_amount: 0
    }));
  };

  const handleInputChange = async (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Recalculate nights when dates change
      if (field === 'check_in_date' || field === 'check_out_date') {
        updated.nights = calculateNights(updated.check_in_date, updated.check_out_date);
      }
      
      // Update room rate when room changes or currency changes
      if (field === 'room_id' || field === 'currency') {
        const selectedRoom = rooms.find(room => room.id === updated.room_id);
        if (selectedRoom) {
          if (field === 'currency' && selectedRoom.currency !== updated.currency) {
            // Currency conversion will be handled by calculateTotal
            updated.room_rate = selectedRoom.base_price;
          } else {
            updated.room_rate = selectedRoom.base_price;
          }
        }
      }

      // Calculate commissions when guide or agent is selected
      if (field === 'guide_id' && value) {
        const selectedGuide = guides.find(guide => guide.id === value);
        if (selectedGuide) {
          updated.guide_commission = (updated.total_amount * selectedGuide.commission_rate) / 100;
        }
      }

      if (field === 'agent_id' && value) {
        const selectedAgent = agents.find(agent => agent.id === value);
        if (selectedAgent) {
          updated.agent_commission = (updated.total_amount * selectedAgent.commission_rate) / 100;
        }
      }

      // Reset related fields when checkboxes are unchecked
      if (field === 'has_guide' && !value) {
        updated.guide_id = '';
        updated.guide_commission = 0;
      }

      if (field === 'has_agent' && !value) {
        updated.agent_id = '';
        updated.agent_commission = 0;
      }
      
      return updated;
    });
  };

  const createGuide = async () => {
    try {
      const { data, error } = await supabase
        .from("guides")
        .insert([{
          name: newGuide.name,
          phone: newGuide.phone,
          email: newGuide.email,
          commission_rate: newGuide.commission_rate,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      setGuides(prev => [...prev, data]);
      handleInputChange('guide_id', data.id);
      setShowGuideDialog(false);
      setNewGuide({ name: '', phone: '', email: '', commission_rate: 10 });
      
      toast({
        title: "Success",
        description: "Guide created successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create guide",
        variant: "destructive"
      });
    }
  };

  const createAgent = async () => {
    try {
      const { data, error } = await supabase
        .from("agents")
        .insert([{
          name: newAgent.name,
          phone: newAgent.phone,
          email: newAgent.email,
          agency_name: newAgent.agency_name,
          commission_rate: newAgent.commission_rate,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      setAgents(prev => [...prev, data]);
      handleInputChange('agent_id', data.id);
      setShowAgentDialog(false);
      setNewAgent({ name: '', phone: '', email: '', agency_name: '', commission_rate: 15 });
      
      toast({
        title: "Success",
        description: "Agent created successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create agent",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const currentYear = new Date().getFullYear();
      
      // Calculate balance amount and prepare data
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
        special_requests: formData.special_requests || null,
        status: formData.status,
        paid_amount: 0,
        balance_amount: formData.total_amount,
        guide_id: formData.has_guide ? formData.guide_id : null,
        agent_id: formData.has_agent ? formData.agent_id : null,
        guide_commission: formData.has_guide ? formData.guide_commission : 0,
        agent_commission: formData.has_agent ? formData.agent_commission : 0,
        currency: formData.currency,
        booking_source: formData.booking_source
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

      navigate("/app/reservations");
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

  if (loading || locationLoading) {
    return <div className="flex justify-center items-center min-h-64">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/app/reservations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">
            {isEdit ? 'Edit Reservation' : 'New Reservation'}
          </h1>
        </div>
        <Button type="submit" form="reservation-form" disabled={submitting}>
          <Save className="h-4 w-4 mr-2" />
          {submitting ? 'Saving...' : isEdit ? 'Update' : 'Save'}
        </Button>
      </div>

      <form id="reservation-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Left Column - Guest & Booking Info */}
          <div className="xl:col-span-2 space-y-4">
            {/* Guest Information */}
            <Card className="bg-gradient-to-br from-card to-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Guest Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="guest_name" className="text-sm">Guest Name *</Label>
                  <Input
                    id="guest_name"
                    value={formData.guest_name}
                    onChange={(e) => handleInputChange('guest_name', e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
                
                <div>
                  <Label htmlFor="guest_email" className="text-sm">Email</Label>
                  <Input
                    id="guest_email"
                    type="email"
                    value={formData.guest_email}
                    onChange={(e) => handleInputChange('guest_email', e.target.value)}
                    className="h-9"
                  />
                </div>
                
                <div>
                  <Label htmlFor="guest_phone" className="text-sm">Phone</Label>
                  <Input
                    id="guest_phone"
                    value={formData.guest_phone}
                    onChange={(e) => handleInputChange('guest_phone', e.target.value)}
                    className="h-9"
                  />
                </div>
                
                <div>
                  <Label htmlFor="guest_nationality" className="text-sm">Nationality</Label>
                  <Input
                    id="guest_nationality"
                    value={formData.guest_nationality}
                    onChange={(e) => handleInputChange('guest_nationality', e.target.value)}
                    className="h-9"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="adults" className="text-sm">Adults *</Label>
                    <Input
                      id="adults"
                      type="number"
                      min="1"
                      value={formData.adults}
                      onChange={(e) => handleInputChange('adults', parseInt(e.target.value))}
                      required
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label htmlFor="children" className="text-sm">Children</Label>
                    <Input
                      id="children"
                      type="number"
                      min="0"
                      value={formData.children}
                      onChange={(e) => handleInputChange('children', parseInt(e.target.value))}
                      className="h-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Details */}
            <Card className="bg-gradient-to-br from-card to-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {shouldShowLocationSelect && (
                  <div>
                    <Label className="text-sm">Location *</Label>
                    <Select value={formData.location_id} onValueChange={(value) => handleInputChange('location_id', value)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableLocations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm">Room *</Label>
                    <Select value={formData.room_id} onValueChange={(value) => handleInputChange('room_id', value)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select room" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredRooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.room_number} - {room.room_type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <CurrencySelector
                      currency={formData.currency}
                      onCurrencyChange={(currency) => handleInputChange('currency', currency)}
                      label="Currency"
                    />
                  </div>
                </div>

                <AirbnbDatePicker
                  checkInDate={formData.check_in_date}
                  checkOutDate={formData.check_out_date}
                  onCheckInChange={(date) => handleInputChange('check_in_date', date)}
                  onCheckOutChange={(date) => handleInputChange('check_out_date', date)}
                  onNightsChange={(nights) => handleInputChange('nights', nights)}
                />

                <div>
                  <Label className="text-sm">Booking Source *</Label>
                  <Select value={formData.booking_source} onValueChange={(value) => handleInputChange('booking_source', value)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select booking source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct">Direct Booking</SelectItem>
                      <SelectItem value="booking.com">Booking.com</SelectItem>
                      <SelectItem value="airbnb">Airbnb</SelectItem>
                      <SelectItem value="expedia">Expedia</SelectItem>
                      <SelectItem value="agoda">Agoda</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>


                <div>
                  <Label htmlFor="special_requests" className="text-sm">Special Requests</Label>
                  <Textarea
                    id="special_requests"
                    value={formData.special_requests}
                    onChange={(e) => handleInputChange('special_requests', e.target.value)}
                    className="h-20 resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Pricing & Services */}
          <div className="space-y-4">
            {/* Pricing Display */}
            <PricingDisplay 
              roomRate={formData.room_rate}
              nights={formData.nights}
              currency={formData.currency}
              totalAmount={formData.total_amount}
            />

            {/* Services */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserCheck className="h-4 w-4" />
                  Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_guide"
                    checked={formData.has_guide}
                    onCheckedChange={(checked) => handleInputChange('has_guide', checked)}
                  />
                  <Label htmlFor="has_guide" className="text-sm">Include Guide</Label>
                </div>
                
                {formData.has_guide && (
                  <div className="flex gap-2">
                    <Select 
                      value={formData.guide_id} 
                      onValueChange={(value) => handleInputChange('guide_id', value)}
                    >
                      <SelectTrigger className="flex-1 h-9">
                        <SelectValue placeholder="Select guide" />
                      </SelectTrigger>
                      <SelectContent>
                        {guides.map((guide) => (
                          <SelectItem key={guide.id} value={guide.id}>
                            {guide.name} ({guide.commission_rate}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Dialog open={showGuideDialog} onOpenChange={setShowGuideDialog}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="icon" className="h-9 w-9">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Guide</DialogTitle>
                          <DialogDescription>Create a new guide profile</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="guide_name">Name</Label>
                            <Input
                              id="guide_name"
                              value={newGuide.name}
                              onChange={(e) => setNewGuide(prev => ({ ...prev, name: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="guide_phone">Phone</Label>
                            <Input
                              id="guide_phone"
                              value={newGuide.phone}
                              onChange={(e) => setNewGuide(prev => ({ ...prev, phone: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="guide_email">Email</Label>
                            <Input
                              id="guide_email"
                              type="email"
                              value={newGuide.email}
                              onChange={(e) => setNewGuide(prev => ({ ...prev, email: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="guide_commission">Commission Rate (%)</Label>
                            <Input
                              id="guide_commission"
                              type="number"
                              min="0"
                              max="100"
                              value={newGuide.commission_rate}
                              onChange={(e) => setNewGuide(prev => ({ ...prev, commission_rate: parseFloat(e.target.value) }))}
                            />
                          </div>
                          <Button onClick={createGuide} className="w-full">
                            Create Guide
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_agent"
                    checked={formData.has_agent}
                    onCheckedChange={(checked) => handleInputChange('has_agent', checked)}
                  />
                  <Label htmlFor="has_agent" className="text-sm">Include Agent</Label>
                </div>
                
                {formData.has_agent && (
                  <div className="flex gap-2">
                    <Select 
                      value={formData.agent_id} 
                      onValueChange={(value) => handleInputChange('agent_id', value)}
                    >
                      <SelectTrigger className="flex-1 h-9">
                        <SelectValue placeholder="Select agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {agents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name} - {agent.agency_name} ({agent.commission_rate}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Dialog open={showAgentDialog} onOpenChange={setShowAgentDialog}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="icon" className="h-9 w-9">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Agent</DialogTitle>
                          <DialogDescription>Create a new agent profile</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="agent_name">Name</Label>
                            <Input
                              id="agent_name"
                              value={newAgent.name}
                              onChange={(e) => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="agent_agency">Agency Name</Label>
                            <Input
                              id="agent_agency"
                              value={newAgent.agency_name}
                              onChange={(e) => setNewAgent(prev => ({ ...prev, agency_name: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="agent_phone">Phone</Label>
                            <Input
                              id="agent_phone"
                              value={newAgent.phone}
                              onChange={(e) => setNewAgent(prev => ({ ...prev, phone: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="agent_email">Email</Label>
                            <Input
                              id="agent_email"
                              type="email"
                              value={newAgent.email}
                              onChange={(e) => setNewAgent(prev => ({ ...prev, email: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="agent_commission">Commission Rate (%)</Label>
                            <Input
                              id="agent_commission"
                              type="number"
                              min="0"
                              max="100"
                              value={newAgent.commission_rate}
                              onChange={(e) => setNewAgent(prev => ({ ...prev, commission_rate: parseFloat(e.target.value) }))}
                            />
                          </div>
                          <Button onClick={createAgent} className="w-full">
                            Create Agent
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Documents & Signature */}
          <div className="space-y-4">
            <PhotoAttachment
              photos={idPhotos}
              onPhotosChange={setIdPhotos}
              title="ID Documents"
              maxPhotos={3}
            />

            <SignatureCapture
              signature={guestSignature}
              onSignatureChange={setGuestSignature}
              title="Guest Signature"
            />
          </div>
        </div>
      </form>
    </div>
  );
}