import { format, addDays } from "date-fns";
import { Calendar, Save, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CurrencySelector } from "@/components/CurrencySelector";
import { PricingDisplay } from "@/components/PricingDisplay";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { ReservationDateSelector } from "@/components/reservation";
import { useLocationContext } from "@/context/LocationContext";
import { useToast } from "@/hooks/use-toast";
import { useFormFieldPreferences } from "@/hooks/useFormFieldPreferences";
import { useProfile } from "@/hooks/useProfile";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { convertCurrency } from "@/utils/currency";

type Room = Tables<"rooms">;

interface NewReservationDialogProps {
	isOpen: boolean;
	onClose: () => void;
	onReservationCreated: () => void;
}

export function NewReservationDialog({
	isOpen,
	onClose,
	onReservationCreated,
}: NewReservationDialogProps) {
	const { toast } = useToast();
	const { profile } = useProfile();
	const { tenant } = useTenant();
	const { selectedLocation } = useLocationContext();
	const { preferences: fieldPreferences } = useFormFieldPreferences();

	const [rooms, setRooms] = useState<Room[]>([]);
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const [formData, setFormData] = useState({
		room_id: "",
		guest_name: "",
		guest_email: "",
		guest_phone: "",
		guest_address: "",
		guest_nationality: "",
		guest_passport_number: "",
		guest_id_number: "",
		adults: 1,
		children: 0,
		check_in_date: format(new Date(), "yyyy-MM-dd"),
		check_out_date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
		room_rate: 0,
		total_amount: 0,
		advance_amount: 0,
		currency: "LKR" as string,
		arrival_time: "",
		special_requests: "",
	});

	// Calculate nights when dates change
	const nights = Math.max(1, Math.ceil(
		formData.check_in_date && formData.check_out_date
			? (new Date(formData.check_out_date).getTime() - new Date(formData.check_in_date).getTime()) /
				(1000 * 60 * 60 * 24)
			: 1
	));

	// Calculate total amount when room rate or nights change
	useEffect(() => {
		const total = formData.room_rate * nights;
		setFormData((prev) => ({ ...prev, total_amount: total }));
	}, [formData.room_rate, nights]);

	// Fetch rooms for selected location
	const fetchRooms = useCallback(async () => {
		if (!selectedLocation || !tenant?.id) return;

		try {
			const { data, error } = await supabase
				.from("rooms")
				.select("*")
				.eq("location_id", selectedLocation)
				.eq("tenant_id", tenant.id)
				.eq("is_active", true)
				.order("room_number");

			if (error) throw error;
			setRooms(data || []);
		} catch (error) {
			console.error("Error fetching rooms:", error);
			toast({
				title: "Error",
				description: "Failed to fetch rooms",
				variant: "destructive",
			});
		}
	}, [selectedLocation, tenant?.id, toast]);

	// Fetch rooms when dialog opens
	useEffect(() => {
		if (isOpen) {
			fetchRooms();
		}
	}, [isOpen, fetchRooms]);



	const handleInputChange = (field: string, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	// Handle currency change and recalculate room rate if room is selected
	const handleCurrencyChange = async (newCurrency: string) => {
		const selectedRoom = rooms.find((room) => room.id === formData.room_id);
		
		if (selectedRoom) {
			const roomCurrency = selectedRoom.currency || 'LKR';
			let newRoomRate = selectedRoom.base_price || 0;
			
			// Convert room price to new currency if they differ
			if (roomCurrency !== newCurrency) {
				try {
					newRoomRate = await convertCurrency(
						selectedRoom.base_price || 0,
						roomCurrency,
						newCurrency
					);
				} catch (error) {
					console.error("Error converting currency:", error);
					toast({
						title: "Currency Conversion Warning",
						description: `Could not convert from ${roomCurrency} to ${newCurrency}. Using original price.`,
						variant: "default",
					});
					newRoomRate = selectedRoom.base_price || 0;
				}
			}
			
			setFormData((prev) => ({
				...prev,
				currency: newCurrency,
				room_rate: Math.round(newRoomRate * 100) / 100,
			}));
		} else {
			// No room selected, just change currency
			setFormData((prev) => ({ ...prev, currency: newCurrency }));
		}
	};

	// Handle room selection and auto-populate room rate from base_price with currency conversion
	const handleRoomChange = async (roomId: string) => {
		const selectedRoom = rooms.find((room) => room.id === roomId);
		if (selectedRoom) {
			// Check if room currency differs from selected currency
			const roomCurrency = selectedRoom.currency || 'LKR';
			let roomRate = selectedRoom.base_price || 0;
			
			// Convert room price to selected currency if they differ
			if (roomCurrency !== formData.currency) {
				try {
					roomRate = await convertCurrency(
						selectedRoom.base_price || 0,
						roomCurrency,
						formData.currency
					);
				} catch (error) {
					console.error("Error converting currency:", error);
					toast({
						title: "Currency Conversion Warning",
						description: `Could not convert from ${roomCurrency} to ${formData.currency}. Using original price.`,
						variant: "default",
					});
					roomRate = selectedRoom.base_price || 0;
				}
			}
			
			setFormData((prev) => ({
				...prev,
				room_id: roomId,
				room_rate: Math.round(roomRate * 100) / 100, // Round to 2 decimal places
			}));
		} else {
			setFormData((prev) => ({ ...prev, room_id: roomId }));
		}
	};

	// Get currency symbol helper
	const getCurrencySymbol = (currency: string) => {
		switch (currency) {
			case "USD":
				return "$";
			case "EUR":
				return "€";
			case "GBP":
				return "£";
			case "LKR":
				return "Rs.";
			default:
				return "";
		}
	};

	const generateReservationNumber = async (): Promise<string> => {
		try {
			const { data, error } = await supabase.rpc("generate_reservation_number", {
				p_tenant_id: tenant?.id,
			});

			if (error) throw error;
			return data || `RES${Date.now()}`;
		} catch (error) {
			console.error("Error generating reservation number:", error);
			return `RES${Date.now()}`;
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		if (!tenant?.id || !profile?.id) {
			toast({
				title: "Error",
				description: "Missing tenant or profile information",
				variant: "destructive",
			});
			return;
		}

		if (!selectedLocation || !formData.room_id || !formData.guest_name) {
			toast({
				title: "Error",
				description: "Please fill in all required fields",
				variant: "destructive",
			});
			return;
		}

		setSubmitting(true);
		
		try {
			const reservationNumber = await generateReservationNumber();
			
			const reservationData = {
				reservation_number: reservationNumber,
				location_id: selectedLocation,
				room_id: formData.room_id,
				guest_name: formData.guest_name,
				guest_email: formData.guest_email || null,
				guest_phone: formData.guest_phone || null,
				guest_address: formData.guest_address || null,
				guest_nationality: formData.guest_nationality || null,
				guest_passport_number: formData.guest_passport_number || null,
				guest_id_number: formData.guest_id_number || null,
				adults: formData.adults,
				children: formData.children,
				check_in_date: formData.check_in_date,
				check_out_date: formData.check_out_date,
				nights: nights,
				room_rate: formData.room_rate,
				total_amount: formData.total_amount,
				advance_amount: formData.advance_amount,
				paid_amount: formData.advance_amount,
				balance_amount: formData.total_amount - formData.advance_amount,
				currency: formData.currency as any, // Allow dynamic currency from DB
				status: "tentative" as const,
				arrival_time: formData.arrival_time || null,
				special_requests: formData.special_requests || null,
				booking_source: "direct",
				created_by: profile.id,
				tenant_id: tenant.id,
			};

			const { error } = await supabase
				.from("reservations")
				.insert([reservationData]);

			if (error) throw error;

			toast({
				title: "Success",
				description: `Reservation ${reservationNumber} created successfully`,
			});

			// Reset form and close dialog
			setFormData({
				room_id: "",
				guest_name: "",
				guest_email: "",
				guest_phone: "",
				guest_address: "",
				guest_nationality: "",
				guest_passport_number: "",
				guest_id_number: "",
				adults: 1,
				children: 0,
				check_in_date: format(new Date(), "yyyy-MM-dd"),
				check_out_date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
				room_rate: 0,
				total_amount: 0,
				advance_amount: 0,
				currency: "LKR",
				arrival_time: "",
				special_requests: "",
			});

			onReservationCreated();
			onClose();

		} catch (error) {
			console.error("Error creating reservation:", error);
			toast({
				title: "Error",
				description: "Failed to create reservation",
				variant: "destructive",
			});
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-4xl sm:max-w-6xl md:max-w-8xl max-h-[90vh] sm:min-h-[95vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Calendar className="h-5 w-5" />
						Create New Reservation
					</DialogTitle>
					<DialogDescription>
						Fill in the details to create a new reservation
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto">
				{/* Room Selection */}
				<div className="space-y-2">
					<Label htmlFor="room">Room *</Label>
					<Select
						value={formData.room_id}
						onValueChange={handleRoomChange}
						required
					>
						<SelectTrigger>
							<SelectValue placeholder="Select room" />
						</SelectTrigger>
						<SelectContent>
							{rooms.map((room) => (
								<SelectItem key={room.id} value={room.id}>
									{room.room_number} - {room.room_type} ({getCurrencySymbol(room.currency || "LKR")}{room.base_price})
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>					{/* Guest Information */}
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="md:col-span-2 space-y-2">
								<Label htmlFor="guest_name">Guest Name *</Label>
								<Input
									id="guest_name"
									value={formData.guest_name}
									onChange={(e) => handleInputChange("guest_name", e.target.value)}
									placeholder="Enter guest name"
									required
								/>
							</div>

							{fieldPreferences?.show_guest_email !== false && (
								<div className="space-y-2">
									<Label htmlFor="guest_email">Email</Label>
									<Input
										id="guest_email"
										type="email"
										value={formData.guest_email}
										onChange={(e) => handleInputChange("guest_email", e.target.value)}
										placeholder="Enter email address"
									/>
								</div>
							)}

							{fieldPreferences?.show_guest_phone !== false && (
								<div className="space-y-2">
									<Label htmlFor="guest_phone">Phone</Label>
									<PhoneInput
										defaultCountry="LK"
										international
										value={formData.guest_phone}
										onChange={(value) => handleInputChange("guest_phone", value || "")}
										placeholder="Enter phone number"
									/>
								</div>
							)}

							{fieldPreferences?.show_guest_nationality !== false && (
								<div className="space-y-2">
									<Label htmlFor="guest_nationality">Nationality</Label>
									<Input
										id="guest_nationality"
										value={formData.guest_nationality}
										onChange={(e) => handleInputChange("guest_nationality", e.target.value)}
										placeholder="Enter nationality"
									/>
								</div>
							)}

							{fieldPreferences?.show_guest_passport_number !== false && (
								<div className="space-y-2">
									<Label htmlFor="guest_passport_number">Passport Number</Label>
									<Input
										id="guest_passport_number"
										value={formData.guest_passport_number}
										onChange={(e) => handleInputChange("guest_passport_number", e.target.value)}
										placeholder="Enter passport number"
									/>
								</div>
							)}

							{fieldPreferences?.show_guest_id_number === true && (
								<div className="space-y-2">
									<Label htmlFor="guest_id_number">ID Number</Label>
									<Input
										id="guest_id_number"
										value={formData.guest_id_number}
										onChange={(e) => handleInputChange("guest_id_number", e.target.value)}
										placeholder="Enter ID number"
									/>
								</div>
							)}

							<div className="grid grid-cols-2 gap-4">
								{fieldPreferences?.show_adults !== false && (
									<div className="space-y-2">
										<Label htmlFor="adults">Adults *</Label>
										<Input
											id="adults"
											type="number"
											min="1"
											value={formData.adults}
											onChange={(e) => handleInputChange("adults", Number(e.target.value))}
											required
										/>
									</div>
								)}
								{fieldPreferences?.show_children !== false && (
									<div className="space-y-2">
										<Label htmlFor="children">Children</Label>
										<Input
											id="children"
											type="number"
											min="0"
											value={formData.children}
											onChange={(e) => handleInputChange("children", Number(e.target.value))}
										/>
									</div>
								)}
							</div>

							{fieldPreferences?.show_guest_address !== false && (
								<div className="md:col-span-2 space-y-2">
									<Label htmlFor="guest_address">Address</Label>
									<Textarea
										id="guest_address"
										value={formData.guest_address}
										onChange={(e) => handleInputChange("guest_address", e.target.value)}
										placeholder="Enter address"
										rows={3}
									/>
								</div>
							)}
						</div>
					</div>

					{/* Stay Details */}
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<h3 className="text-sm font-semibold">Stay Details</h3>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{fieldPreferences?.show_arrival_time !== false && (
								<div className="space-y-2">
									<Label htmlFor="arrival_time">Arrival Time</Label>
									<Input
										id="arrival_time"
										type="time"
										value={formData.arrival_time}
										onChange={(e) => handleInputChange("arrival_time", e.target.value)}
									/>
								</div>
							)}
						</div>

						{/* Date Selection using ReservationDateSelector */}
						<ReservationDateSelector
							checkInDate={formData.check_in_date}
							checkOutDate={formData.check_out_date}
							onDatesChange={(checkIn, checkOut) => {
								handleInputChange("check_in_date", checkIn);
								handleInputChange("check_out_date", checkOut);
							}}
							minDate={new Date()}
							showNights={true}
							roomId={formData.room_id || undefined}
						/>

						{fieldPreferences?.show_special_requests !== false && (
							<div className="space-y-2">
								<Label htmlFor="special_requests">Special Requests</Label>
								<Textarea
									id="special_requests"
									value={formData.special_requests}
									onChange={(e) => handleInputChange("special_requests", e.target.value)}
									placeholder="Any special requests or notes"
								/>
							</div>
						)}
					</div>

					{/* Pricing */}
					<div className="space-y-4">
						<h3 className="text-lg font-semibold">Pricing</h3>
						
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="currency">Currency</Label>
								<CurrencySelector
									currency={formData.currency}
									onCurrencyChange={handleCurrencyChange}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="room_rate">Room Rate per Night</Label>
								<Input
									id="room_rate"
									type="number"
									step="0.01"
									value={formData.room_rate}
									onChange={(e) => handleInputChange("room_rate", Number(e.target.value))}
									placeholder="Enter room rate"
								/>
							</div>

							{fieldPreferences?.show_advance_amount !== false && (
								<div className="space-y-2">
									<Label htmlFor="advance_amount">Advance Amount</Label>
									<Input
										id="advance_amount"
										type="number"
										step="0.01"
										value={formData.advance_amount}
										onChange={(e) => handleInputChange("advance_amount", Number(e.target.value))}
										placeholder="Enter advance amount"
									/>
								</div>
							)}
						</div>

						{formData.room_rate > 0 && (
							<PricingDisplay
								roomRate={formData.room_rate}
								nights={nights}
								currency={formData.currency}
								totalAmount={formData.total_amount}
								advanceAmount={formData.advance_amount}
							/>
						)}
					</div>



					{/* Action Buttons */}
					<div className="flex w-full items-center justify-end gap-3 py-4 border-t">
						<Button type="button" variant="outline" onClick={onClose}>
							<X className="h-4 w-4 mr-2" />
							Cancel
						</Button>
						<Button className="border" type="submit" disabled={submitting}>
							<Save className="h-4 w-4 mr-2" />
							{submitting ? "Creating..." : "Create Reservation"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}