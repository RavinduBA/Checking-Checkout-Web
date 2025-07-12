import { useState } from "react";
import { ArrowLeft, Calendar as CalendarIcon, Eye, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";

const mockBookings = [
  {
    id: "1",
    guestName: "John Smith",
    checkIn: "2025-01-15T14:00:00",
    checkOut: "2025-01-17T11:00:00",
    source: "booking_com",
    status: "confirmed",
    location: "Asaliya Villa"
  },
  {
    id: "2", 
    guestName: "Sarah Johnson",
    checkIn: "2025-01-20T14:00:00",
    checkOut: "2025-01-23T11:00:00",
    source: "airbnb",
    status: "pending",
    location: "Rusty Bunk"
  }
];

const locations = ["All Locations", "Asaliya Villa", "Rusty Bunk", "Antiqua Serenity"];

export default function Calendar() {
  const [selectedLocation, setSelectedLocation] = useState("All Locations");

  const getSourceBadge = (source: string) => {
    const colors = {
      booking_com: "bg-blue-500",
      airbnb: "bg-rose-500", 
      direct: "bg-emerald-500"
    };
    return colors[source as keyof typeof colors] || "bg-slate-500";
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      confirmed: "bg-emerald-500",
      pending: "bg-amber-500",
      settled: "bg-blue-500"
    };
    return colors[status as keyof typeof colors] || "bg-slate-500";
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendar & Bookings</h1>
          <p className="text-muted-foreground">View upcoming bookings and availability</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-card border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              Sync Calendars
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid - Simplified for now */}
      <Card className="bg-gradient-card border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            January 2025
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="p-2 text-center font-semibold text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <div key={day} className="min-h-20 p-2 border border-border rounded-md">
                <div className="text-sm font-medium">{day}</div>
                {day === 15 && (
                  <div className="mt-1">
                    <div className="text-xs bg-blue-500 text-white px-1 rounded">
                      John S.
                    </div>
                  </div>
                )}
                {day === 20 && (
                  <div className="mt-1">
                    <div className="text-xs bg-rose-500 text-white px-1 rounded">
                      Sarah J.
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Bookings */}
      <Card className="bg-gradient-card border-0 shadow-elegant">
        <CardHeader>
          <CardTitle>Upcoming Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockBookings.map((booking) => (
              <div key={booking.id} className="p-4 border border-border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{booking.guestName}</h3>
                    <p className="text-sm text-muted-foreground">{booking.location}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={`text-white ${getSourceBadge(booking.source)}`}>
                      {booking.source.replace('_', '.')}
                    </Badge>
                    <Badge className={`text-white ${getStatusBadge(booking.status)}`}>
                      {booking.status}
                    </Badge>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Check-in: {new Date(booking.checkIn).toLocaleDateString()} 2:00 PM</span>
                  <span>Check-out: {new Date(booking.checkOut).toLocaleDateString()} 11:00 AM</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}