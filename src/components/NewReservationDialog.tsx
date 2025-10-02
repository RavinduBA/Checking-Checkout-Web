import { format, addDays } from "date-fns";
import { Calendar, MapPin, User, Users, Save, X } from "lucide-react";
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
import { useLocationContext } from "@/context/LocationContext";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { convertCurrency } from "@/utils/currency";

type Location = Tables<"locations">;
type Room = Tables<"rooms">;
type Guide = Tables<"guides">;
type Agent = Tables<"agents">;

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
	const { locations: availableLocations } = useLocationContext();

	const [rooms, setRooms] = useState<Room[]>([]);
	const [guides, setGuides] = useState<Guide[]>([]);
	const [agents, setAgents] = useState<Agent[]>([]);
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const [formData, setFormData] = useState({
		location_id: "",
		room_id: "",
		guest_name: "",
		guest_email: "",
		guest_phone: "",
		guest_address: "",
		guest_id_number: "",
		guest_nationality: "",
		adults: 1,
		children: 0,
		check_in_date: new Date(),
		check_out_date: addDays(new Date(), 1),
		room_rate: 0,
		total_amount: 0,
		advance_amount: 0,
		currency: "LKR" as "LKR" | "USD" | "EUR" | "GBP",
		special_requests: "",
		arrival_time: "",
		guide_id: "",
		agent_id: "",
		guide_commission: 0,
		agent_commission: 0,
		booking_source: "direct",
	});

	// Calculate nights when dates change
	const nights = Math.ceil(
		(formData.check_out_date.getTime() - formData.check_in_date.getTime()) /
			(1000 * 60 * 60 * 24)
	);

	// Calculate total amount when room rate or nights change
	useEffect(() => {
		const total = formData.room_rate * nights;
		setFormData((prev) => ({ ...prev, total_amount: total }));
	}, [formData.room_rate, nights]);

	// Fetch rooms when location changes
	const fetchRooms = useCallback(async () => {
		if (!formData.location_id || !tenant?.id) return;

		try {
			const { data, error } = await supabase
				.from("rooms")
				.select("*")
				.eq("location_id", formData.location_id)
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
	}, [formData.location_id, tenant?.id, toast]);

	// Fetch guides and agents
	const fetchGuidesAndAgents = useCallback(async () => {
		if (!tenant?.id) return;

		try {
			const [guidesResponse, agentsResponse] = await Promise.all([
				supabase
					.from("guides")
					.select("*")
					.eq("tenant_id", tenant.id)
					.eq("is_active", true)
					.order("name"),
				supabase
					.from("agents")
					.select("*")
					.eq("tenant_id", tenant.id)
					.eq("is_active", true)
					.order("name"),
			]);

			if (guidesResponse.error) throw guidesResponse.error;
			if (agentsResponse.error) throw agentsResponse.error;

			setGuides(guidesResponse.data || []);
			setAgents(agentsResponse.data || []);
		} catch (error) {
			console.error("Error fetching guides and agents:", error);
		}
	}, [tenant?.id]);

	useEffect(() => {
		if (isOpen && tenant?.id) {
			fetchGuidesAndAgents();
		}
	}, [isOpen, tenant?.id, fetchGuidesAndAgents]);

	useEffect(() => {
		fetchRooms();
	}, [fetchRooms]);

	const handleInputChange = (field: string, value: any) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
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

		if (!formData.location_id || !formData.room_id || !formData.guest_name) {
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
				location_id: formData.location_id,
				room_id: formData.room_id,
				guest_name: formData.guest_name,
				guest_email: formData.guest_email || null,
				guest_phone: formData.guest_phone || null,
				guest_address: formData.guest_address || null,
				guest_id_number: formData.guest_id_number || null,
				guest_nationality: formData.guest_nationality || null,
				adults: formData.adults,
				children: formData.children,
				check_in_date: format(formData.check_in_date, "yyyy-MM-dd"),
				check_out_date: format(formData.check_out_date, "yyyy-MM-dd"),
				nights: nights,
				room_rate: formData.room_rate,
				total_amount: formData.total_amount,
				advance_amount: formData.advance_amount,
				paid_amount: formData.advance_amount,
				balance_amount: formData.total_amount - formData.advance_amount,
				currency: formData.currency,
				status: "tentative" as const,
				special_requests: formData.special_requests || null,
				arrival_time: formData.arrival_time || null,
				guide_id: formData.guide_id || null,
				agent_id: formData.agent_id || null,
				guide_commission: formData.guide_commission || 0,
				agent_commission: formData.agent_commission || 0,
				booking_source: formData.booking_source,
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
				location_id: "",
				room_id: "",
				guest_name: "",
				guest_email: "",
				guest_phone: "",
				guest_address: "",
				guest_id_number: "",
				guest_nationality: "",
				adults: 1,
				children: 0,
				check_in_date: new Date(),
				check_out_date: addDays(new Date(), 1),
				room_rate: 0,
				total_amount: 0,
				advance_amount: 0,
				currency: "LKR",
				special_requests: "",
				arrival_time: "",
				guide_id: "",
				agent_id: "",
				guide_commission: 0,
				agent_commission: 0,
				booking_source: "direct",
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
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Calendar className="h-5 w-5" />
						Create New Reservation
					</DialogTitle>
					<DialogDescription>
						Fill in the details to create a new reservation
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Location and Room Selection */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="location" className="flex items-center gap-2">
								<MapPin className="h-4 w-4" />
								Location *
							</Label>
							<Select
								value={formData.location_id}
								onValueChange={(value) => handleInputChange("location_id", value)}
								required
							>
								<SelectTrigger>
									<SelectValue placeholder="Select location" />
								</SelectTrigger>
								<SelectContent>
									{availableLocations.map((location) => (
										<SelectItem key={location.id} value={location.id}>
											{location.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="room">Room *</Label>
							<Select
								value={formData.room_id}
								onValueChange={(value) => handleInputChange("room_id", value)}
								required
								disabled={!formData.location_id}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select room" />
								</SelectTrigger>
								<SelectContent>
									{rooms.map((room) => (
										<SelectItem key={room.id} value={room.id}>
											{room.room_number} - {room.room_type}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Guest Information */}
					<div className="space-y-4">
						<div className="flex items-center gap-2">
							<User className="h-4 w-4" />
							<h3 className="text-lg font-semibold">Guest Information</h3>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="guest_name">Guest Name *</Label>
								<Input
									id="guest_name"
									value={formData.guest_name}
									onChange={(e) => handleInputChange("guest_name", e.target.value)}
									placeholder="Enter guest name"
									required
								/>
							</div>

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

							<div className="space-y-2">
								<Label htmlFor="guest_phone">Phone</Label>
								<PhoneInput
									value={formData.guest_phone}
									onChange={(value) => handleInputChange("guest_phone", value)}
									placeholder="Enter phone number"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="guest_nationality">Nationality</Label>
								<Input
									id="guest_nationality"
									value={formData.guest_nationality}
									onChange={(e) => handleInputChange("guest_nationality", e.target.value)}
									placeholder="Enter nationality"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="guest_id_number">ID Number</Label>
								<Input
									id="guest_id_number"
									value={formData.guest_id_number}
									onChange={(e) => handleInputChange("guest_id_number", e.target.value)}
									placeholder="Enter ID/Passport number"
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="guest_address">Address</Label>
								<Input
									id="guest_address"
									value={formData.guest_address}
									onChange={(e) => handleInputChange("guest_address", e.target.value)}
									placeholder="Enter address"
								/>
							</div>
						</div>
					</div>

					{/* Stay Details */}
					<div className="space-y-4">
						<div className="flex items-center gap-2">
							<Calendar className="h-4 w-4" />
							<h3 className="text-lg font-semibold">Stay Details</h3>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
							<div className="space-y-2">
								<Label htmlFor="adults" className="flex items-center gap-2">
									<Users className="h-4 w-4" />
									Adults
								</Label>
								<Input
									id="adults"
									type="number"
									min="1"
									value={formData.adults}
									onChange={(e) => handleInputChange("adults", Number(e.target.value))}
								/>
							</div>

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

							<div className="space-y-2">
								<Label>Check-in Date *</Label>
								<DatePicker
									value={format(formData.check_in_date, "yyyy-MM-dd")}
									onChange={(value) => handleInputChange("check_in_date", new Date(value))}
								/>
							</div>

							<div className="space-y-2">
								<Label>Check-out Date *</Label>
								<DatePicker
									value={format(formData.check_out_date, "yyyy-MM-dd")}
									onChange={(value) => handleInputChange("check_out_date", new Date(value))}
								/>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="arrival_time">Arrival Time</Label>
								<Input
									id="arrival_time"
									type="time"
									value={formData.arrival_time}
									onChange={(e) => handleInputChange("arrival_time", e.target.value)}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="special_requests">Special Requests</Label>
								<Textarea
									id="special_requests"
									value={formData.special_requests}
									onChange={(e) => handleInputChange("special_requests", e.target.value)}
									placeholder="Any special requests or notes"
								/>
							</div>
						</div>
					</div>

					{/* Pricing */}
					<div className="space-y-4">
						<h3 className="text-lg font-semibold">Pricing</h3>
						
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="currency">Currency</Label>
								<CurrencySelector
									currency={formData.currency}
									onCurrencyChange={(value) => handleInputChange("currency", value)}
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

					{/* Guide and Agent */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="guide">Tour Guide</Label>
							<Select
								value={formData.guide_id}
								onValueChange={(value) => handleInputChange("guide_id", value)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select guide (optional)" />
								</SelectTrigger>
								<SelectContent>
									{guides.map((guide) => (
										<SelectItem key={guide.id} value={guide.id}>
											{guide.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="agent">Travel Agent</Label>
							<Select
								value={formData.agent_id}
								onValueChange={(value) => handleInputChange("agent_id", value)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select agent (optional)" />
								</SelectTrigger>
								<SelectContent>
									{agents.map((agent) => (
										<SelectItem key={agent.id} value={agent.id}>
											{agent.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Action Buttons */}
					<div className="flex justify-end gap-3 pt-4 border-t">
						<Button type="button" variant="outline" onClick={onClose}>
							<X className="h-4 w-4 mr-2" />
							Cancel
						</Button>
						<Button type="submit" disabled={submitting}>
							<Save className="h-4 w-4 mr-2" />
							{submitting ? "Creating..." : "Create Reservation"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}