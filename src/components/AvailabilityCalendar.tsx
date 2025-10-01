"use client";

import { addDays, format, isAfter, isBefore, parseISO } from "date-fns";
import { CalendarIcon, ChevronDownIcon, LogIn, LogOut } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useAvailability } from "@/hooks/useAvailability";
import { cn } from "@/lib/utils";

interface AvailabilityCalendarProps {
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

export function AvailabilityCalendar({
	selectedRoomId,
	checkInDate,
	checkOutDate,
	onDateSelect,
	excludeReservationId,
	className,
}: AvailabilityCalendarProps) {
	const { checkRoomAvailability } = useAvailability();
	const [open, setOpen] = React.useState(false);
	const [activeCalendar, setActiveCalendar] = React.useState<
		"checkin" | "checkout"
	>("checkin");
	const [availabilityCache, setAvailabilityCache] = React.useState<
		Map<string, DayAvailability>
	>(new Map());
	const [loadingMonth, setLoadingMonth] = React.useState<string | null>(null);

	const [checkIn, setCheckIn] = React.useState<Date | undefined>(
		checkInDate ? parseISO(checkInDate) : undefined,
	);
	const [checkOut, setCheckOut] = React.useState<Date | undefined>(
		checkOutDate ? parseISO(checkOutDate) : undefined,
	);

	// Update local state when props change
	React.useEffect(() => {
		setCheckIn(checkInDate ? parseISO(checkInDate) : undefined);
		setCheckOut(checkOutDate ? parseISO(checkOutDate) : undefined);
	}, [checkInDate, checkOutDate]);

	// Minimum check-out date (day after check-in)
	const minCheckOutDate = React.useMemo(() => {
		return checkIn ? addDays(checkIn, 1) : undefined;
	}, [checkIn]);

	// Load availability for a month
	const loadMonthAvailability = React.useCallback(
		async (month: Date) => {
			if (!selectedRoomId) return;

			const monthKey = format(month, "yyyy-MM");
			if (loadingMonth === monthKey) return;

			// Check if we already have most of the month's data cached
			const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
			const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
			const totalDays = endOfMonth.getDate();
			let cachedDays = 0;

			for (let i = 1; i <= totalDays; i++) {
				const dayKey = format(
					new Date(month.getFullYear(), month.getMonth(), i),
					"yyyy-MM-dd",
				);
				if (availabilityCache.has(dayKey)) cachedDays++;
			}

			// If more than 80% is cached, skip loading
			if (cachedDays / totalDays > 0.8) return;

			setLoadingMonth(monthKey);

			try {
				// Only check days that aren't cached and are relevant (future dates only)
				const uncachedDays: Date[] = [];
				const today = new Date();

				for (
					let day = new Date(Math.max(startOfMonth.getTime(), today.getTime()));
					day <= endOfMonth;
					day.setDate(day.getDate() + 1)
				) {
					const dayKey = format(day, "yyyy-MM-dd");
					if (!availabilityCache.has(dayKey)) {
						uncachedDays.push(new Date(day));
					}
				}

				if (uncachedDays.length === 0) {
					setLoadingMonth(null);
					return;
				}

				// Check availability for uncached days in batches
				const batchSize = 7;
				const newCache = new Map(availabilityCache);

				for (let i = 0; i < uncachedDays.length; i += batchSize) {
					const batch = uncachedDays.slice(i, i + batchSize);
					const promises = batch.map(async (day) => {
						const dayKey = format(day, "yyyy-MM-dd");
						try {
							const result = await checkRoomAvailability(
								selectedRoomId,
								dayKey,
								dayKey,
								excludeReservationId,
							);
							return {
								dayKey,
								availability: {
									isAvailable: result.isAvailable,
									conflictCount: result.conflicts.length,
								},
							};
						} catch (error) {
							console.error(
								`Error checking availability for ${dayKey}:`,
								error,
							);
							return {
								dayKey,
								availability: {
									isAvailable: false,
									conflictCount: 1,
								},
							};
						}
					});

					const results = await Promise.all(promises);
					results.forEach(({ dayKey, availability }) => {
						newCache.set(dayKey, availability);
					});
				}

				setAvailabilityCache(newCache);
			} catch (error) {
				console.error("Error loading month availability:", error);
			} finally {
				setLoadingMonth(null);
			}
		},
		[
			selectedRoomId,
			checkRoomAvailability,
			excludeReservationId,
			availabilityCache,
			loadingMonth,
		],
	);

	// Check if a day is unavailable
	const isDayUnavailable = React.useCallback(
		(day: Date): boolean => {
			// Past dates are always unavailable
			if (isBefore(day, new Date())) return true;

			// If no room selected, allow selection
			if (!selectedRoomId) return false;

			const dayKey = format(day, "yyyy-MM-dd");
			const availability = availabilityCache.get(dayKey);

			// If we don't have data yet, assume available (will load on demand)
			return availability ? !availability.isAvailable : false;
		},
		[selectedRoomId, availabilityCache],
	);

	// Handle check-in date selection
	const handleCheckInSelect = React.useCallback(
		(date: Date | undefined) => {
			if (!date) return;

			setCheckIn(date);
			setActiveCalendar("checkout");

			// If check-out is before or same as new check-in, clear it
			if (checkOut && !isAfter(checkOut, date)) {
				setCheckOut(undefined);
			}
		},
		[checkOut],
	);

	// Handle check-out date selection
	const handleCheckOutSelect = React.useCallback(
		(date: Date | undefined) => {
			if (!date || !checkIn) return;

			setCheckOut(date);
			onDateSelect(format(checkIn, "yyyy-MM-dd"), format(date, "yyyy-MM-dd"));
			setOpen(false);
		},
		[checkIn, onDateSelect],
	);

	// Format display text
	const getDisplayText = () => {
		if (checkIn && checkOut) {
			const nights = Math.ceil(
				(checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
			);
			return `${format(checkIn, "MMM dd")} - ${format(checkOut, "MMM dd")} (${nights} ${nights === 1 ? "night" : "nights"})`;
		}
		if (checkIn) {
			return `Check-in: ${format(checkIn, "MMM dd, yyyy")} (Select check-out)`;
		}
		return "Select check-in and check-out dates";
	};

	// Load initial availability when component mounts or room changes
	React.useEffect(() => {
		if (selectedRoomId && open) {
			const today = new Date();
			loadMonthAvailability(today);
		}
	}, [selectedRoomId, open, loadMonthAvailability]);

	return (
		<div className={cn("flex flex-col gap-3", className)}>
			<Label htmlFor="dateRange" className="px-1">
				Check-in & Check-out Dates
			</Label>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						id="dateRange"
						className={cn(
							"w-full justify-between font-normal",
							!checkIn && !checkOut && "text-muted-foreground",
						)}
					>
						<div className="flex items-center gap-2">
							<CalendarIcon className="h-4 w-4" />
							{getDisplayText()}
						</div>
						<ChevronDownIcon className="h-4 w-4" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<div className="p-4 space-y-4">
						{/* Header */}
						<div className="flex items-center justify-between">
							<h4 className="font-semibold">Select Dates</h4>
							{selectedRoomId && (
								<div className="flex gap-2 text-xs">
									<Badge
										variant="outline"
										className="bg-green-50 text-green-700 border-green-200"
									>
										Available
									</Badge>
									<Badge
										variant="outline"
										className="bg-red-50 text-red-700 border-red-200"
									>
										Unavailable
									</Badge>
								</div>
							)}
						</div>

						{!selectedRoomId && (
							<div className="text-sm text-muted-foreground bg-amber-50 p-3 rounded-md border border-amber-200">
								Select a room first to see availability
							</div>
						)}

						<Separator />

						{/* Calendar Selection Tabs */}
						<div className="flex gap-2">
							<Button
								variant={activeCalendar === "checkin" ? "default" : "outline"}
								size="sm"
								onClick={() => setActiveCalendar("checkin")}
								className="flex-1"
							>
								<LogIn className="h-4 w-4 mr-2" />
								Check-in
								{checkIn && (
									<Badge variant="secondary" className="ml-2">
										{format(checkIn, "MMM dd")}
									</Badge>
								)}
							</Button>
							<Button
								variant={activeCalendar === "checkout" ? "default" : "outline"}
								size="sm"
								onClick={() => setActiveCalendar("checkout")}
								className="flex-1"
								disabled={!checkIn}
							>
								<LogOut className="h-4 w-4 mr-2" />
								Check-out
								{checkOut && (
									<Badge variant="secondary" className="ml-2">
										{format(checkOut, "MMM dd")}
									</Badge>
								)}
							</Button>
						</div>

						{/* Calendar */}
						<div className="border rounded-lg p-3">
							{activeCalendar === "checkin" ? (
								<Calendar
									mode="single"
									selected={checkIn}
									onSelect={handleCheckInSelect}
									captionLayout="dropdown"
									disabled={isDayUnavailable}
									onMonthChange={loadMonthAvailability}
									fromDate={new Date()}
									modifiers={{
										available: (day) => {
											if (isBefore(day, new Date()) || !selectedRoomId)
												return false;
											const dayKey = format(day, "yyyy-MM-dd");
											const availability = availabilityCache.get(dayKey);
											return availability ? availability.isAvailable : false;
										},
										unavailable: (day) => {
											if (isBefore(day, new Date()) || !selectedRoomId)
												return false;
											const dayKey = format(day, "yyyy-MM-dd");
											const availability = availabilityCache.get(dayKey);
											return availability ? !availability.isAvailable : false;
										},
									}}
									modifiersClassNames={{
										available: "bg-green-100 text-green-800 hover:bg-green-200",
										unavailable:
											"bg-red-100 text-red-800 line-through cursor-not-allowed hover:bg-red-100",
									}}
								/>
							) : (
								<Calendar
									mode="single"
									selected={checkOut}
									onSelect={handleCheckOutSelect}
									captionLayout="dropdown"
									disabled={(day) =>
										isBefore(day, minCheckOutDate!) || isDayUnavailable(day)
									}
									onMonthChange={loadMonthAvailability}
									fromDate={minCheckOutDate}
									modifiers={{
										available: (day) => {
											if (isBefore(day, minCheckOutDate!) || !selectedRoomId)
												return false;
											const dayKey = format(day, "yyyy-MM-dd");
											const availability = availabilityCache.get(dayKey);
											return availability ? availability.isAvailable : false;
										},
										unavailable: (day) => {
											if (isBefore(day, minCheckOutDate!) || !selectedRoomId)
												return false;
											const dayKey = format(day, "yyyy-MM-dd");
											const availability = availabilityCache.get(dayKey);
											return availability ? !availability.isAvailable : false;
										},
									}}
									modifiersClassNames={{
										available: "bg-green-100 text-green-800 hover:bg-green-200",
										unavailable:
											"bg-red-100 text-red-800 line-through cursor-not-allowed hover:bg-red-100",
									}}
								/>
							)}
						</div>

						{/* Summary */}
						{checkIn && checkOut && (
							<div className="bg-blue-50 p-3 rounded-md border border-blue-200">
								<div className="text-sm font-medium text-blue-800">
									Selected Dates:
								</div>
								<div className="text-sm text-blue-700">
									Check-in: {format(checkIn, "EEEE, MMMM dd, yyyy")}
								</div>
								<div className="text-sm text-blue-700">
									Check-out: {format(checkOut, "EEEE, MMMM dd, yyyy")}
								</div>
								<div className="text-sm font-medium text-blue-800 mt-1">
									Total nights:{" "}
									{Math.ceil(
										(checkOut.getTime() - checkIn.getTime()) /
											(1000 * 60 * 60 * 24),
									)}
								</div>
							</div>
						)}

						{/* Quick Actions */}
						{(checkIn || checkOut) && (
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										setCheckIn(undefined);
										setCheckOut(undefined);
										onDateSelect("", "");
										setActiveCalendar("checkin");
									}}
									className="flex-1"
								>
									Clear Dates
								</Button>
							</div>
						)}
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
