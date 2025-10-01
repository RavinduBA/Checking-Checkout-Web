import { Calendar, Eye } from "lucide-react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";

type Booking = Tables<"bookings"> & {
	locations: Tables<"locations">;
};

interface UpcomingBookingsProps {
	upcomingBookings: Booking[];
	hasCalendarPermission: boolean;
}

export function UpcomingBookings({ upcomingBookings, hasCalendarPermission }: UpcomingBookingsProps) {
	return (
		<Card className="bg-card border">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="flex items-center gap-2">
					<Calendar className="size-5 text-primary" />
					Upcoming Bookings
				</CardTitle>
				{hasCalendarPermission && (
					<Button asChild variant="outline" size="sm">
						<Link to="/calendar">
							<Eye className="size-4" />
							View All
						</Link>
					</Button>
				)}
			</CardHeader>
			<CardContent className="space-y-3 lg:space-y-4">
				{upcomingBookings.length > 0 ? (
					upcomingBookings.map((booking) => (
						<div
							key={booking.id}
							className="p-3 lg:p-4 rounded-lg bg-background/50 border border-border/50"
						>
							<div className="flex flex-col space-y-2">
								<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
									<div className="min-w-0 flex-1">
										<p className="font-medium text-foreground truncate">
											{booking.guest_name}
										</p>
										<p className="text-sm text-muted-foreground">
											{new Date(booking.check_in).toLocaleDateString()} to{" "}
											{new Date(booking.check_out).toLocaleDateString()}
										</p>
										<p className="text-xs text-muted-foreground">
											{booking.locations?.name}
										</p>
									</div>
									<div className="flex flex-wrap items-center gap-2">
										<Badge
											variant={
												booking.status === "confirmed"
													? "default"
													: "secondary"
											}
											className="capitalize text-xs"
										>
											{booking.status}
										</Badge>
										<Badge variant="outline" className="text-xs">
											{booking.source.replace("_", ".")}
										</Badge>
									</div>
								</div>
								<div className="flex justify-end">
									<span className="font-bold text-success">
										Rs. {booking.total_amount.toLocaleString()}
									</span>
								</div>
							</div>
						</div>
					))
				) : (
					<div className="text-center py-6 lg:py-8">
						<p className="text-muted-foreground">No upcoming bookings</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}