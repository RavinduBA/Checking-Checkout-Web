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
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/currency";
import { Bed, Plus, Edit, Trash2, DollarSign, Users, Building2 } from "lucide-react";

type Location = {
  id: string;
  name: string;
  is_active: boolean;
};

type Room = {
  id: string;
  location_id: string;
  room_number: string;
  room_type: string;
  bed_type: string;
  max_occupancy: number;
  base_price: number;
  description: string;
  amenities: string[];
  is_active: boolean;
  created_at: string;
  currency: string;
  locations?: Location;
};

const roomTypes = ["Standard", "Deluxe", "Suite", "Executive", "Presidential"];
const bedTypes = ["Single", "Double", "Queen", "King", "Twin", "Sofa Bed"];
const amenityOptions = [
  "Air Conditioning", "WiFi", "TV", "Mini Bar", "Safe", "Balcony",
  "Sea View", "Pool View", "Garden View", "Room Service", "Jacuzzi",
  "Kitchen", "Washing Machine", "Hair Dryer"
];

export default function RoomManagement() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [formData, setFormData] = useState({
    location_id: "",
    room_number: "",
    room_type: "",
    bed_type: "",
    max_occupancy: 2,
    base_price: 0,
    description: "",
    amenities: [] as string[],
    is_active: true,
    currency: "LKR",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [roomsResponse, locationsResponse] = await Promise.all([
        supabase
          .from("rooms")
          .select(`
            *,
            locations (
              id,
              name,
              is_active
            )
          `)
          .order("created_at", { ascending: false }),
        supabase
          .from("locations")
          .select("*")
          .eq("is_active", true)
          .order("name")
      ]);

      if (roomsResponse.error) throw roomsResponse.error;
      if (locationsResponse.error) throw locationsResponse.error;

      setRooms(roomsResponse.data || []);
      setLocations(locationsResponse.data || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingRoom) {
        const { error } = await supabase
          .from("rooms")
          .update({
            ...formData,
            currency: formData.currency as "LKR" | "USD" | "EUR" | "GBP"
          })
          .eq("id", editingRoom.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Room updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("rooms")
          .insert([{
            ...formData,
            currency: formData.currency as "LKR" | "USD" | "EUR" | "GBP"
          }]);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Room created successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingRoom(null);
      setFormData({
        location_id: "",
        room_number: "",
        room_type: "",
        bed_type: "",
        max_occupancy: 2,
        base_price: 0,
        description: "",
        amenities: [],
        is_active: true,
        currency: "LKR",
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save room",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      location_id: room.location_id,
      room_number: room.room_number,
      room_type: room.room_type,
      bed_type: room.bed_type,
      max_occupancy: room.max_occupancy,
      base_price: room.base_price,
      description: room.description,
      amenities: room.amenities || [],
      is_active: room.is_active,
      currency: room.currency || "LKR",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this room?")) return;

    try {
      const { error } = await supabase
        .from("rooms")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Room deleted successfully",
      });
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete room",
        variant: "destructive",
      });
    }
  };

  const handleAmenityChange = (amenity: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        amenities: [...prev.amenities, amenity]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        amenities: prev.amenities.filter(a => a !== amenity)
      }));
    }
  };

  const filteredRooms = selectedLocation === "all" 
    ? rooms 
    : rooms.filter(room => room.location_id === selectedLocation);

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
          <h1 className="text-3xl font-bold text-foreground">Room Management</h1>
          <p className="text-muted-foreground">Manage rooms and pricing for each location</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bed className="h-5 w-5" />
                  Hotel Rooms
                </CardTitle>
                <CardDescription>
                  Manage room details, pricing, and availability
                </CardDescription>
              </div>
              <div className="flex gap-4">
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by location" />
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
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingRoom(null);
                      setFormData({
                        location_id: "",
                        room_number: "",
                        room_type: "",
                        bed_type: "",
                        max_occupancy: 2,
                        base_price: 0,
                        description: "",
                        amenities: [],
                        is_active: true,
                        currency: "LKR",
                      });
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Room
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>
                        {editingRoom ? "Edit Room" : "Add New Room"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingRoom 
                          ? "Update the room details below." 
                          : "Enter the details for the new room."
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="location_id">Location</Label>
                          <Select
                            value={formData.location_id}
                            onValueChange={(value) => 
                              setFormData({ ...formData, location_id: value })
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
                          <Label htmlFor="room_number">Room Number</Label>
                          <Input
                            id="room_number"
                            value={formData.room_number}
                            onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                            placeholder="e.g., 101, A-201"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="room_type">Room Type</Label>
                          <Select
                            value={formData.room_type}
                            onValueChange={(value) => 
                              setFormData({ ...formData, room_type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select room type" />
                            </SelectTrigger>
                            <SelectContent>
                              {roomTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="bed_type">Bed Type</Label>
                          <Select
                            value={formData.bed_type}
                            onValueChange={(value) => 
                              setFormData({ ...formData, bed_type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select bed type" />
                            </SelectTrigger>
                            <SelectContent>
                              {bedTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="max_occupancy">Max Occupancy</Label>
                          <Input
                            id="max_occupancy"
                            type="number"
                            min="1"
                            max="10"
                            value={formData.max_occupancy}
                            onChange={(e) => setFormData({ ...formData, max_occupancy: parseInt(e.target.value) })}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="base_price">Base Price</Label>
                          <div className="flex gap-2">
                            <Input
                              id="base_price"
                              type="number"
                              min="0"
                              step="0.01"
                              value={formData.base_price}
                              onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) })}
                              required
                            />
                            <Select
                              value={formData.currency}
                              onValueChange={(value) => 
                                setFormData({ ...formData, currency: value })
                              }
                            >
                              <SelectTrigger className="w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="LKR">LKR</SelectItem>
                                <SelectItem value="USD">USD</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Room description..."
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label>Amenities</Label>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {amenityOptions.map((amenity) => (
                            <div key={amenity} className="flex items-center space-x-2">
                              <Checkbox
                                id={amenity}
                                checked={formData.amenities.includes(amenity)}
                                onCheckedChange={(checked) => 
                                  handleAmenityChange(amenity, checked as boolean)
                                }
                              />
                              <Label htmlFor={amenity} className="text-sm">
                                {amenity}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={formData.is_active ? "active" : "inactive"}
                          onValueChange={(value) => 
                            setFormData({ ...formData, is_active: value === "active" })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingRoom ? "Update" : "Create"} Room
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Bed</TableHead>
                  <TableHead>Base Price</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Bed className="h-4 w-4 text-muted-foreground" />
                        {room.room_number}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {room.locations?.name}
                      </div>
                    </TableCell>
                    <TableCell>{room.room_type}</TableCell>
                    <TableCell>{room.bed_type}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {room.max_occupancy}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        {formatCurrency(room.base_price, room.currency as any)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {room.currency}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={room.is_active ? "default" : "secondary"}>
                        {room.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(room)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(room.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}