import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAvailability } from "@/hooks/useAvailability";
import { AlertCircle, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvailabilityInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  min?: string;
  selectedRoomId?: string;
  checkInDate?: string;
  checkOutDate?: string;
  excludeReservationId?: string;
  showAvailability?: boolean;
}

export const AvailabilityInput: React.FC<AvailabilityInputProps> = ({
  id,
  label,
  value,
  onChange,
  required = false,
  className,
  min,
  selectedRoomId,
  checkInDate,
  checkOutDate,
  excludeReservationId,
  showAvailability = true,
}) => {
  const { checkRoomAvailability } = useAvailability();
  const [availability, setAvailability] = useState<{
    isAvailable: boolean;
    conflicts: any[];
    loading: boolean;
  }>({
    isAvailable: true,
    conflicts: [],
    loading: false,
  });

  // Check availability when dates change
  useEffect(() => {
    const checkAvailability = async () => {
      if (!showAvailability || !selectedRoomId || !checkInDate || !checkOutDate) {
        setAvailability({ isAvailable: true, conflicts: [], loading: false });
        return;
      }

      setAvailability(prev => ({ ...prev, loading: true }));

      try {
        const result = await checkRoomAvailability(
          selectedRoomId,
          checkInDate,
          checkOutDate,
          excludeReservationId
        );

        setAvailability({
          isAvailable: result.isAvailable,
          conflicts: result.conflicts,
          loading: false,
        });
      } catch (error) {
        console.error("Error checking availability:", error);
        setAvailability({
          isAvailable: true, // Default to available on error
          conflicts: [],
          loading: false,
        });
      }
    };

    checkAvailability();
  }, [selectedRoomId, checkInDate, checkOutDate, excludeReservationId, showAvailability, checkRoomAvailability]);

  const getAvailabilityBadge = () => {
    if (!showAvailability || !selectedRoomId || !checkInDate || !checkOutDate) {
      return null;
    }

    if (availability.loading) {
      return (
        <Badge variant="outline" className="ml-2">
          <Loader2 className="size-3 mr-1 animate-spin" />
          Checking...
        </Badge>
      );
    }

    if (availability.isAvailable) {
      return (
        <Badge variant="default" className="ml-2 bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="size-3 mr-1" />
          Available
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="ml-2">
          <XCircle className="size-3 mr-1" />
          {availability.conflicts.length} conflict(s)
        </Badge>
      );
    }
  };

  const inputClassName = cn(
    className,
    showAvailability && selectedRoomId && checkInDate && checkOutDate && !availability.isAvailable
      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
      : showAvailability && selectedRoomId && checkInDate && checkOutDate && availability.isAvailable
      ? "border-green-300 focus:border-green-500 focus:ring-green-500"
      : ""
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label htmlFor={id} className="text-sm">
          {label} {required && "*"}
        </Label>
        {getAvailabilityBadge()}
      </div>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={inputClassName}
        min={min}
      />
      {showAvailability && selectedRoomId && checkInDate && checkOutDate && !availability.isAvailable && availability.conflicts.length > 0 && (
        <div className="mt-1">
          <div className="text-xs text-red-600 flex items-center">
            <AlertCircle className="size-3 mr-1" />
            Conflicts with existing reservations
          </div>
        </div>
      )}
    </div>
  );
};