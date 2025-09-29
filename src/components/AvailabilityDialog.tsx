import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  CalendarX, 
  MapPin, 
  BedDouble, 
  Users, 
  Clock,
  Check,
  X
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Room = Tables<"rooms"> & {
  locations: Tables<"locations">;
};

type Reservation = Tables<"reservations">;

interface AlternativeOption {
  room: Room;
  isAvailable: boolean;
  conflicts?: Reservation[];
}

interface AvailabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkInDate: string;
  checkOutDate: string;
  originalRoom?: Room;
  conflicts: Reservation[];
  sameLocationAlternatives: AlternativeOption[];
  otherLocationAlternatives: AlternativeOption[];
  onSelectRoom: (room: Room) => void;
  onForceBook?: () => void;
  loading?: boolean;
}

export const AvailabilityDialog: React.FC<AvailabilityDialogProps> = ({
  open,
  onOpenChange,
  checkInDate,
  checkOutDate,
  originalRoom,
  conflicts,
  sameLocationAlternatives,
  otherLocationAlternatives,
  onSelectRoom,
  onForceBook,
  loading = false,
}) => {
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      confirmed: "bg-green-100 text-green-800 border-green-200",
      tentative: "bg-yellow-100 text-yellow-800 border-yellow-200",
      pending: "bg-blue-100 text-blue-800 border-blue-200",
      checked_in: "bg-purple-100 text-purple-800 border-purple-200",
      checked_out: "bg-gray-100 text-gray-800 border-gray-200",
      cancelled: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const RoomCard = ({ room, onSelect }: { room: Room; onSelect: () => void }) => (
    <Card className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-green-500">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BedDouble className="size-4 text-muted-foreground" />
            <span className="font-medium">{room.room_number}</span>
            <Badge variant="outline" className="text-xs">
              {room.room_type}
            </Badge>
          </div>
          <Check className="size-4 text-green-500" />
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-1">
            <MapPin className="size-3" />
            <span>{room.locations.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="size-3" />
            <span>Max {room.max_occupancy}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {room.currency} {room.base_price?.toLocaleString()}/night
          </span>
          <Button size="sm" onClick={onSelect} className="h-8">
            Select Room
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarX className="size-5 text-orange-500" />
            Room Availability Conflict
          </DialogTitle>
          <DialogDescription>
            The selected room is not available for the requested dates. 
            Here are your options:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Conflict Details */}
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="size-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <div className="font-medium mb-2">
                {originalRoom?.room_number} - {originalRoom?.room_type} is not available
              </div>
              <div className="text-sm">
                Requested dates: {formatDate(checkInDate)} - {formatDate(checkOutDate)}
              </div>
            </AlertDescription>
          </Alert>

          {/* Conflicting Reservations */}
          {conflicts.length > 0 && (
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Clock className="size-4" />
                Conflicting Reservations
              </h3>
              <div className="space-y-2">
                {conflicts.map((conflict) => (
                  <div
                    key={conflict.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{conflict.guest_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(conflict.check_in_date)} - {formatDate(conflict.check_out_date)}
                      </div>
                    </div>
                    <Badge className={cn("text-xs", getStatusColor(conflict.status))}>
                      {conflict.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Same Location Alternatives */}
          {sameLocationAlternatives.length > 0 && (
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <MapPin className="size-4 text-blue-500" />
                Available Rooms at {originalRoom?.locations?.name}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sameLocationAlternatives.map(({ room }) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onSelect={() => onSelectRoom(room)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other Location Alternatives */}
          {otherLocationAlternatives.length > 0 && (
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <MapPin className="size-4 text-green-500" />
                Available Rooms at Other Locations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {otherLocationAlternatives.map(({ room }) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onSelect={() => onSelectRoom(room)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No Alternatives Available */}
          {sameLocationAlternatives.length === 0 && otherLocationAlternatives.length === 0 && (
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertDescription>
                No alternative rooms are available for the selected dates. 
                You may need to choose different dates or contact the guest to modify their booking.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            
            {onForceBook && (
              <Button
                variant="destructive"
                onClick={onForceBook}
                className="flex items-center gap-2"
              >
                <X className="size-4" />
                Force Book (Override)
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};