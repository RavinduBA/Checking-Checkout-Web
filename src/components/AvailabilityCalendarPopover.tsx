import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, LogIn, LogOut } from "lucide-react";
import { format, parseISO, isBefore, addDays, isAfter } from "date-fns";
import { cn } from "@/lib/utils";
import { useAvailability } from "@/hooks/useAvailability";

interface AvailabilityCalendarPopoverProps {
  selectedRoomId?: string;
  checkInDate?: string;
  checkOutDate?: string;
  onDateSelect: (checkIn: string, checkOut: string) => void;
  excludeReservationId?: string;
  className?: string;
}

interface DayAvailability {
  isAvailable: boolean;
  conflictCount: number;
}

export const AvailabilityCalendarPopover: React.FC<AvailabilityCalendarPopoverProps> = ({
  selectedRoomId,
  checkInDate,
  checkOutDate,
  onDateSelect,
  excludeReservationId,
  className,
}) => {
  const { checkRoomAvailability } = useAvailability();
  const [open, setOpen] = useState(false);
  const [activeCalendar, setActiveCalendar] = useState<'checkin' | 'checkout'>('checkin');
  const [availabilityCache, setAvailabilityCache] = useState<Map<string, DayAvailability>>(new Map());
  const [loadingMonth, setLoadingMonth] = useState<string | null>(null);
  
  const [checkIn, setCheckIn] = useState<Date | undefined>(
    checkInDate ? parseISO(checkInDate) : undefined
  );
  const [checkOut, setCheckOut] = useState<Date | undefined>(
    checkOutDate ? parseISO(checkOutDate) : undefined
  );

  // Update local state when props change
  useEffect(() => {
    setCheckIn(checkInDate ? parseISO(checkInDate) : undefined);
    setCheckOut(checkOutDate ? parseISO(checkOutDate) : undefined);
  }, [checkInDate, checkOutDate]);

  // Optimized availability checking with debounce and caching
  const loadMonthAvailability = useCallback(async (month: Date) => {
    if (!selectedRoomId) return;

    const monthKey = format(month, 'yyyy-MM');
    if (loadingMonth === monthKey) return; // Prevent duplicate requests

    setLoadingMonth(monthKey);
    
    try {
      const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
      const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      
      // Batch availability check for better performance
      const days: Date[] = [];
      for (let day = new Date(startOfMonth); day <= endOfMonth; day.setDate(day.getDate() + 1)) {
        days.push(new Date(day));
      }

      // Check availability in smaller batches to avoid overwhelming the API
      const batchSize = 7;
      const newCache = new Map(availabilityCache);

      for (let i = 0; i < days.length; i += batchSize) {
        const batch = days.slice(i, i + batchSize);
        const batchPromises = batch.map(async (day) => {
          const dayKey = format(day, 'yyyy-MM-dd');
          
          // Skip if already cached and recent
          if (newCache.has(dayKey)) return;

          try {
            const nextDay = addDays(day, 1);
            const result = await checkRoomAvailability(
              selectedRoomId,
              dayKey,
              format(nextDay, 'yyyy-MM-dd'),
              excludeReservationId
            );
            
            return {
              dayKey,
              availability: {
                isAvailable: result.isAvailable,
                conflictCount: result.conflicts?.length || 0,
              }
            };
          } catch (error) {
            console.warn('Error checking availability for', dayKey, error);
            return {
              dayKey,
              availability: {
                isAvailable: false,
                conflictCount: 0,
              }
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(result => {
          if (result) {
            newCache.set(result.dayKey, result.availability);
          }
        });
      }

      setAvailabilityCache(newCache);
    } finally {
      setLoadingMonth(null);
    }
  }, [selectedRoomId, checkRoomAvailability, excludeReservationId, availabilityCache, loadingMonth]);

  // Memoized availability checker
  const isDayUnavailable = useCallback((day: Date): boolean => {
    if (isBefore(day, new Date())) return true;
    
    const dayKey = format(day, 'yyyy-MM-dd');
    const availability = availabilityCache.get(dayKey);
    return availability ? !availability.isAvailable : false;
  }, [availabilityCache]);

  // Handle check-in date selection
  const handleCheckInSelect = (date: Date | undefined) => {
    setCheckIn(date);
    
    if (date) {
      // If checkout is before checkin, clear it
      if (checkOut && isBefore(checkOut, date)) {
        setCheckOut(undefined);
      }
      // Auto-switch to checkout calendar
      setActiveCalendar('checkout');
    }

    // Update parent component
    if (date && checkOut) {
      onDateSelect(format(date, 'yyyy-MM-dd'), format(checkOut, 'yyyy-MM-dd'));
    }
  };

  // Handle check-out date selection
  const handleCheckOutSelect = (date: Date | undefined) => {
    setCheckOut(date);
    
    // Update parent component and close popover
    if (checkIn && date) {
      onDateSelect(format(checkIn, 'yyyy-MM-dd'), format(date, 'yyyy-MM-dd'));
      setOpen(false);
    }
  };

  // Display text for the trigger button
  const displayText = useMemo(() => {
    if (checkIn && checkOut) {
      return `${format(checkIn, 'MMM dd')} - ${format(checkOut, 'MMM dd')}`;
    }
    if (checkIn) {
      return `${format(checkIn, 'MMM dd')} - Select checkout`;
    }
    return "Select dates";
  }, [checkIn, checkOut]);

  // Check-out date constraints
  const minCheckOutDate = checkIn ? addDays(checkIn, 1) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-11",
            !checkIn && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
        {selectedRoomId ? (
          <div className="p-4 space-y-4">
            {/* Calendar Selection Tabs */}
            <div className="flex rounded-lg bg-muted p-1">
              <Button
                variant={activeCalendar === 'checkin' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1 h-8"
                onClick={() => setActiveCalendar('checkin')}
              >
                <LogIn className="mr-1.5 h-3.5 w-3.5" />
                Check-in
              </Button>
              <Button
                variant={activeCalendar === 'checkout' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1 h-8"
                onClick={() => setActiveCalendar('checkout')}
                disabled={!checkIn}
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                Check-out
              </Button>
            </div>

            {/* Selected Dates Display */}
            {(checkIn || checkOut) && (
              <div className="flex gap-4 text-sm">
                <div className="flex-1">
                  <div className="text-muted-foreground">Check-in</div>
                  <div className="font-medium">
                    {checkIn ? format(checkIn, 'MMM dd, yyyy') : 'Not selected'}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-muted-foreground">Check-out</div>
                  <div className="font-medium">
                    {checkOut ? format(checkOut, 'MMM dd, yyyy') : 'Not selected'}
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Availability Legend */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs bg-green-50/60 border-green-200 text-green-700">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5" />
                Available
              </Badge>
              <Badge variant="outline" className="text-xs bg-red-50/60 border-red-200 text-red-600">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-1.5" />
                Booked
              </Badge>
            </div>

            {/* Check-in Calendar */}
            {activeCalendar === 'checkin' && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Select Check-in Date</h4>
                <Calendar
                  mode="single"
                  selected={checkIn}
                  onSelect={handleCheckInSelect}
                  disabled={isDayUnavailable}
                  onMonthChange={loadMonthAvailability}
                  className="rounded-md border-0"
                  modifiers={{
                    booked: (day) => {
                      const dayKey = format(day, 'yyyy-MM-dd');
                      const availability = availabilityCache.get(dayKey);
                      return availability ? !availability.isAvailable : false;
                    },
                    available: (day) => {
                      const dayKey = format(day, 'yyyy-MM-dd');
                      const availability = availabilityCache.get(dayKey);
                      return availability ? availability.isAvailable && !isBefore(day, new Date()) : false;
                    },
                  }}
                  modifiersClassNames={{
                    booked: "bg-red-50/80 text-red-600 line-through opacity-50 cursor-not-allowed",
                    available: "bg-green-50/60 text-green-700 hover:bg-green-100/80",
                  }}
                />
              </div>
            )}

            {/* Check-out Calendar */}
            {activeCalendar === 'checkout' && checkIn && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Select Check-out Date</h4>
                <Calendar
                  mode="single"
                  selected={checkOut}
                  onSelect={handleCheckOutSelect}
                  disabled={(day) => 
                    isBefore(day, minCheckOutDate!) || isDayUnavailable(day)
                  }
                  onMonthChange={loadMonthAvailability}
                  fromDate={minCheckOutDate}
                  className="rounded-md border-0"
                  modifiers={{
                    booked: (day) => {
                      if (isBefore(day, minCheckOutDate!)) return false;
                      const dayKey = format(day, 'yyyy-MM-dd');
                      const availability = availabilityCache.get(dayKey);
                      return availability ? !availability.isAvailable : false;
                    },
                    available: (day) => {
                      if (isBefore(day, minCheckOutDate!)) return false;
                      const dayKey = format(day, 'yyyy-MM-dd');
                      const availability = availabilityCache.get(dayKey);
                      return availability ? availability.isAvailable : false;
                    },
                  }}
                  modifiersClassNames={{
                    booked: "bg-red-50/80 text-red-600 line-through opacity-50 cursor-not-allowed",
                    available: "bg-green-50/60 text-green-700 hover:bg-green-100/80",
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Please select a room first to view availability
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};