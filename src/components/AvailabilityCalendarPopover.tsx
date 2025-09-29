import { addDays, format, isBefore, parseISO } from "date-fns";
import { CalendarIcon, LogIn, LogOut } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useAvailability } from "@/hooks/useAvailability";
import { cn } from "@/lib/utils";

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

export const AvailabilityCalendarPopover: React.FC<
	AvailabilityCalendarPopoverProps
> = ({
	selectedRoomId,
	checkInDate,
	checkOutDate,
	onDateSelect,
	excludeReservationId,
	className,
}) => {
	const { checkRoomAvailability } = useAvailability();
	const [open, setOpen] = useState(false);
	const [activeCalendar, setActiveCalendar] = useState<"checkin" | "checkout">(
		"checkin",
	);
	const [availabilityCache, setAvailabilityCache] = useState<
		Map<string, DayAvailability>
	>(new Map());
	const [loadingMonth, setLoadingMonth] = useState<string | null>(null);
	const [isInitialLoad, setIsInitialLoad] = useState(true);

	const [checkIn, setCheckIn] = useState<Date | undefined>(
		checkInDate ? parseISO(checkInDate) : undefined,
	);
	const [checkOut, setCheckOut] = useState<Date | undefined>(
		checkOutDate ? parseISO(checkOutDate) : undefined,
	);

	// Update local state when props change
	useEffect(() => {
		setCheckIn(checkInDate ? parseISO(checkInDate) : undefined);
		setCheckOut(checkOutDate ? parseISO(checkOutDate) : undefined);
	}, [checkInDate, checkOutDate]);

	// Ultra-optimized availability checking with smart caching
	const loadMonthAvailability = useCallback(
		async (month: Date) => {
			if (!selectedRoomId) return;

			const monthKey = format(month, "yyyy-MM");
			if (loadingMonth === monthKey) return; // Prevent duplicate requests

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

				// Process in parallel batches for maximum speed
				const batchSize = 5;
				const newCache = new Map(availabilityCache);
				const batchPromises: Promise<any>[] = [];

				for (let i = 0; i < uncachedDays.length; i += batchSize) {
					const batch = uncachedDays.slice(i, i + batchSize);

					const batchPromise = Promise.all(
						batch.map(async (day) => {
							const dayKey = format(day, "yyyy-MM-dd");

							try {
								const nextDay = addDays(day, 1);
								const result = await checkRoomAvailability(
									selectedRoomId,
									dayKey,
									format(nextDay, "yyyy-MM-dd"),
									excludeReservationId,
								);

								return {
									dayKey,
									availability: {
										isAvailable: result.isAvailable,
										conflictCount: result.conflicts?.length || 0,
									},
								};
							} catch (error) {
								// Silent fail for better UX - assume available for failed requests
								return {
									dayKey,
									availability: {
										isAvailable: true,
										conflictCount: 0,
									},
								};
							}
						}),
					);

					batchPromises.push(batchPromise);
				}

				// Execute all batches in parallel
				const allBatchResults = await Promise.all(batchPromises);

				// Flatten and cache results
				allBatchResults.flat().forEach((result) => {
					if (result) {
						newCache.set(result.dayKey, result.availability);
					}
				});

				setAvailabilityCache(newCache);
				setIsInitialLoad(false);
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

	// Preload availability when popover opens
	useEffect(() => {
		if (open && selectedRoomId && isInitialLoad) {
			loadMonthAvailability(new Date());
		}
	}, [open, selectedRoomId, isInitialLoad, loadMonthAvailability]);

	// Memoized availability checker
	const isDayUnavailable = useCallback(
		(day: Date): boolean => {
			if (isBefore(day, new Date())) return true;

			const dayKey = format(day, "yyyy-MM-dd");
			const availability = availabilityCache.get(dayKey);
			return availability ? !availability.isAvailable : false;
		},
		[availabilityCache],
	);

	// Handle check-in date selection
	const handleCheckInSelect = (date: Date | undefined) => {
		setCheckIn(date);

		if (date) {
			// If checkout is before checkin, clear it
			if (checkOut && isBefore(checkOut, date)) {
				setCheckOut(undefined);
			}
			// Auto-switch to checkout calendar
			setActiveCalendar("checkout");
		}

		// Update parent component
		if (date && checkOut) {
			onDateSelect(format(date, "yyyy-MM-dd"), format(checkOut, "yyyy-MM-dd"));
		}
	};

	// Handle check-out date selection
	const handleCheckOutSelect = (date: Date | undefined) => {
		setCheckOut(date);

		// Update parent component and close popover
		if (checkIn && date) {
			onDateSelect(format(checkIn, "yyyy-MM-dd"), format(date, "yyyy-MM-dd"));
			setOpen(false);
		}
	};

	// Display text for the trigger button
	const displayText = useMemo(() => {
		if (checkIn && checkOut) {
			return `${format(checkIn, "MMM dd")} - ${format(checkOut, "MMM dd")}`;
		}
		if (checkIn) {
			return `${format(checkIn, "MMM dd")} - Select checkout`;
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
						className,
					)}
				>
					<CalendarIcon className="mr-2 h-4 w-4" />
					{displayText}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className="w-fit p-0 min-w-[680px]"
				align="start"
				sideOffset={4}
			>
				{selectedRoomId ? (
					<div className="p-6">
						{/* Header with Selected Dates */}
						<div className="mb-6 space-y-3">
							<div className="flex items-center justify-between">
								<h3 className="font-semibold text-lg">
									Select Reservation Dates
								</h3>
								{(loadingMonth || isInitialLoad) && (
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
										Loading availability...
									</div>
								)}
							</div>

							<div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
								<div className="text-center">
									<div className="text-sm text-muted-foreground mb-1">
										Check-in Date
									</div>
									<div
										className={cn(
											"text-base font-semibold",
											checkIn ? "text-foreground" : "text-muted-foreground",
										)}
									>
										{checkIn
											? format(checkIn, "EEE, MMM dd, yyyy")
											: "Select date"}
									</div>
								</div>
								<div className="text-center">
									<div className="text-sm text-muted-foreground mb-1">
										Check-out Date
									</div>
									<div
										className={cn(
											"text-base font-semibold",
											checkOut ? "text-foreground" : "text-muted-foreground",
										)}
									>
										{checkOut
											? format(checkOut, "EEE, MMM dd, yyyy")
											: "Select check-in first"}
									</div>
								</div>
							</div>

							{/* Availability Legend */}
							<div className="flex justify-center gap-4">
								<div className="flex items-center gap-2 text-xs">
									<div className="w-3 h-3 bg-green-500 rounded-full" />
									<span>Available</span>
								</div>
								<div className="flex items-center gap-2 text-xs">
									<div className="w-3 h-3 bg-red-500 rounded-full" />
									<span>Booked</span>
								</div>
								<div className="flex items-center gap-2 text-xs">
									<div className="w-3 h-3 bg-gray-300 rounded-full" />
									<span>Past Date</span>
								</div>
							</div>
						</div>

						{/* Dual Calendar Layout */}
						<div className="grid grid-cols-2 gap-6">
							{/* Check-in Calendar */}
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<LogIn className="h-4 w-4 text-blue-600" />
									<h4 className="font-medium">Check-in Date</h4>
								</div>
								<div className="border rounded-lg p-3 bg-white">
									<Calendar
										mode="single"
										selected={checkIn}
										onSelect={handleCheckInSelect}
										disabled={isDayUnavailable}
										onMonthChange={loadMonthAvailability}
										className="w-full"
										showOutsideDays={false}
										modifiers={{
											booked: (day) => {
												if (isBefore(day, new Date())) return false;
												const dayKey = format(day, "yyyy-MM-dd");
												const availability = availabilityCache.get(dayKey);
												return availability ? !availability.isAvailable : false;
											},
											available: (day) => {
												if (isBefore(day, new Date())) return false;
												const dayKey = format(day, "yyyy-MM-dd");
												const availability = availabilityCache.get(dayKey);
												return availability ? availability.isAvailable : false;
											},
										}}
										modifiersClassNames={{
											booked:
												"bg-red-100 text-red-800 line-through cursor-not-allowed hover:bg-red-100",
											available:
												"bg-green-50 text-green-800 hover:bg-green-100 cursor-pointer",
										}}
										classNames={{
											months: "flex w-full",
											month: "space-y-4 w-full",
											caption: "flex justify-center pt-1 relative items-center",
											caption_label: "text-sm font-medium",
											nav: "space-x-1 flex items-center",
											nav_button:
												"h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
											nav_button_previous: "absolute left-1",
											nav_button_next: "absolute right-1",
											table: "w-full border-collapse space-y-1",
											head_row: "flex w-full",
											head_cell:
												"text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] flex-1 text-center",
											row: "flex w-full mt-2",
											cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1",
											day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md mx-auto",
											day_selected:
												"bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
											day_today:
												"bg-accent text-accent-foreground font-semibold",
											day_outside: "text-muted-foreground opacity-50",
											day_disabled:
												"text-muted-foreground opacity-50 cursor-not-allowed",
											day_range_middle:
												"aria-selected:bg-accent aria-selected:text-accent-foreground",
											day_hidden: "invisible",
										}}
									/>
								</div>
							</div>

							{/* Check-out Calendar */}
							<div className="space-y-3">
								<div className="flex items-center gap-2">
									<LogOut className="h-4 w-4 text-orange-600" />
									<h4 className="font-medium">Check-out Date</h4>
									{!checkIn && (
										<span className="text-xs text-muted-foreground">
											(Select check-in first)
										</span>
									)}
								</div>
								<div
									className={cn(
										"border rounded-lg p-3",
										checkIn ? "bg-white" : "bg-gray-50",
									)}
								>
									{checkIn ? (
										<Calendar
											mode="single"
											selected={checkOut}
											onSelect={handleCheckOutSelect}
											disabled={(day) =>
												isBefore(day, minCheckOutDate!) || isDayUnavailable(day)
											}
											onMonthChange={loadMonthAvailability}
											fromDate={minCheckOutDate}
											className="w-full"
											showOutsideDays={false}
											modifiers={{
												booked: (day) => {
													if (isBefore(day, minCheckOutDate!)) return false;
													const dayKey = format(day, "yyyy-MM-dd");
													const availability = availabilityCache.get(dayKey);
													return availability
														? !availability.isAvailable
														: false;
												},
												available: (day) => {
													if (isBefore(day, minCheckOutDate!)) return false;
													const dayKey = format(day, "yyyy-MM-dd");
													const availability = availabilityCache.get(dayKey);
													return availability
														? availability.isAvailable
														: false;
												},
											}}
											modifiersClassNames={{
												booked:
													"bg-red-100 text-red-800 line-through cursor-not-allowed hover:bg-red-100",
												available:
													"bg-green-50 text-green-800 hover:bg-green-100 cursor-pointer",
											}}
											classNames={{
												months: "flex w-full",
												month: "space-y-4 w-full",
												caption:
													"flex justify-center pt-1 relative items-center",
												caption_label: "text-sm font-medium",
												nav: "space-x-1 flex items-center",
												nav_button:
													"h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
												nav_button_previous: "absolute left-1",
												nav_button_next: "absolute right-1",
												table: "w-full border-collapse space-y-1",
												head_row: "flex w-full",
												head_cell:
													"text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] flex-1 text-center",
												row: "flex w-full mt-2",
												cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 flex-1",
												day: "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md mx-auto",
												day_selected:
													"bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
												day_today:
													"bg-accent text-accent-foreground font-semibold",
												day_outside: "text-muted-foreground opacity-50",
												day_disabled:
													"text-muted-foreground opacity-50 cursor-not-allowed",
												day_range_middle:
													"aria-selected:bg-accent aria-selected:text-accent-foreground",
												day_hidden: "invisible",
											}}
										/>
									) : (
										<div className="h-[280px] flex items-center justify-center">
											<p className="text-sm text-muted-foreground text-center">
												Please select a check-in date first
											</p>
										</div>
									)}
								</div>
							</div>
						</div>

						{/* Action Buttons */}
						{checkIn && checkOut && (
							<div className="mt-6 flex justify-between items-center">
								<div className="text-sm text-muted-foreground">
									Duration:{" "}
									{Math.ceil(
										(checkOut.getTime() - checkIn.getTime()) /
											(1000 * 60 * 60 * 24),
									)}{" "}
									night(s)
								</div>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => {
											setCheckIn(undefined);
											setCheckOut(undefined);
										}}
									>
										Clear Dates
									</Button>
									<Button size="sm" onClick={() => setOpen(false)}>
										Confirm Selection
									</Button>
								</div>
							</div>
						)}
					</div>
				) : (
					<div className="p-6 text-center">
						<p className="text-sm text-muted-foreground">
							Please select a room first to view availability
						</p>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
};
