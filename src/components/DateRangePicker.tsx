import { useState } from "react";
import { Calendar, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, differenceInDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  checkInDate: string;
  checkOutDate: string;
  onCheckInChange: (date: string) => void;
  onCheckOutChange: (date: string) => void;
  onNightsChange: (nights: number) => void;
}

export const DateRangePicker = ({
  checkInDate,
  checkOutDate,
  onCheckInChange,
  onCheckOutChange,
  onNightsChange,
}: DateRangePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectingCheckIn, setSelectingCheckIn] = useState(true);

  const checkIn = checkInDate ? new Date(checkInDate) : undefined;
  const checkOut = checkOutDate ? new Date(checkOutDate) : undefined;
  
  const nights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0;

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    if (selectingCheckIn) {
      const newCheckIn = format(date, 'yyyy-MM-dd');
      onCheckInChange(newCheckIn);
      
      // If check-out is before or same as new check-in, set check-out to next day
      if (!checkOut || date >= checkOut) {
        const nextDay = format(addDays(date, 1), 'yyyy-MM-dd');
        onCheckOutChange(nextDay);
        onNightsChange(1);
      } else {
        onNightsChange(differenceInDays(checkOut, date));
      }
      
      setSelectingCheckIn(false);
    } else {
      // Selecting check-out
      if (checkIn && date > checkIn) {
        const newCheckOut = format(date, 'yyyy-MM-dd');
        onCheckOutChange(newCheckOut);
        onNightsChange(differenceInDays(date, checkIn));
        setIsOpen(false);
        setSelectingCheckIn(true);
      }
    }
  };

  const handleCheckInClick = () => {
    setSelectingCheckIn(true);
    setIsOpen(true);
  };

  const handleCheckOutClick = () => {
    setSelectingCheckIn(false);
    setIsOpen(true);
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) return true;
    
    if (!selectingCheckIn && checkIn) {
      return date <= checkIn;
    }
    
    return false;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Check-in Date */}
        <Popover open={isOpen && selectingCheckIn} onOpenChange={(open) => {
          if (!open) setIsOpen(false);
        }}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              onClick={handleCheckInClick}
              className={cn(
                "w-full justify-start text-left font-normal h-12",
                !checkInDate && "text-muted-foreground",
                selectingCheckIn && isOpen && "ring-2 ring-primary"
              )}
            >
              <CalendarIcon className="mr-3 h-4 w-4" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Check-in</span>
                <span className="text-sm">
                  {checkIn ? format(checkIn, "MMM dd, yyyy") : "Add date"}
                </span>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-0">
                <CalendarComponent
                  mode="single"
                  selected={checkIn}
                  onSelect={handleDateSelect}
                  disabled={isDateDisabled}
                  initialFocus
                  className="pointer-events-auto"
                />
              </CardContent>
            </Card>
          </PopoverContent>
        </Popover>

        {/* Check-out Date */}
        <Popover open={isOpen && !selectingCheckIn} onOpenChange={(open) => {
          if (!open) setIsOpen(false);
        }}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              onClick={handleCheckOutClick}
              className={cn(
                "w-full justify-start text-left font-normal h-12",
                !checkOutDate && "text-muted-foreground",
                !selectingCheckIn && isOpen && "ring-2 ring-primary"
              )}
            >
              <CalendarIcon className="mr-3 h-4 w-4" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Check-out</span>
                <span className="text-sm">
                  {checkOut ? format(checkOut, "MMM dd, yyyy") : "Add date"}
                </span>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-0">
                <CalendarComponent
                  mode="single"
                  selected={checkOut}
                  onSelect={handleDateSelect}
                  disabled={isDateDisabled}
                  initialFocus
                  className="pointer-events-auto"
                />
              </CardContent>
            </Card>
          </PopoverContent>
        </Popover>
      </div>

      {/* Nights Display */}
      {nights > 0 && (
        <div className="flex items-center justify-center py-2 px-4 bg-muted/50 rounded-lg">
          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
          <span className="text-sm font-medium">
            {nights} {nights === 1 ? 'night' : 'nights'}
          </span>
        </div>
      )}
    </div>
  );
};