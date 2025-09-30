import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AvailabilityCalendar } from "./AvailabilityCalendar";
import { OTPVerification } from "./OTPVerification";

interface Reservation {
	id: string;
	reservation_number: string;
	guest_name: string;
	guest_email?: string;
	guest_phone?: string;
	guest_address?: string;
	guest_id_number?: string;
	guest_nationality?: string;
	adults: number;
	children: number;
	check_in_date: string;
	check_out_date: string;
	nights: number;
	room_rate: number;
	total_amount: number;
	advance_amount?: number;
	paid_amount?: number;
	balance_amount?: number;
	currency: "USD" | "LKR" | "EUR" | "GBP";
	status:
		| "pending"
		| "confirmed"
		| "checked_in"
		| "checked_out"
		| "cancelled"
		| "tentative";
	special_requests?: string;
	arrival_time?: string;
	room_id: string;
	location_id: string;
	agent_id?: string;
	guide_id?: string;
	agent_commission?: number;
	guide_commission?: number;
}

interface ReservationEditDialogProps {
	reservation: Reservation | null;
	isOpen: boolean;
	onClose: () => void;
	onUpdate: () => void;
}

export function ReservationEditDialog({
	reservation,
	isOpen,
	onClose,
	onUpdate,
}: ReservationEditDialogProps) {
	const { toast } = useToast();
	const [isOTPVerified, setIsOTPVerified] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [formData, setFormData] = useState<Partial<Reservation>>({});
	const [rooms, setRooms] = useState<any[]>([]);
	const [agents, setAgents] = useState<any[]>([]);
	const [guides, setGuides] = useState<any[]>([]);
	const [location, setLocation] = useState<any>(null);

	useEffect(() => {
		const fetchRooms = async () => {
			const { data } = await supabase
				.from("rooms")
				.select("id, room_number, room_type, location_id, base_price")
				.eq("is_active", true);
			setRooms(data || []);
		};

		const fetchAgents = async () => {
			const { data } = await supabase
				.from("agents")
				.select("id, name, commission_rate")
				.eq("is_active", true);
			setAgents(data || []);
		};

		const fetchGuides = async () => {
			const { data } = await supabase
				.from("guides")
				.select("id, name, commission_rate")
				.eq("is_active", true);
			setGuides(data || []);
		};

		const fetchLocation = async () => {
			if (!reservation?.location_id) return;
			
			const { data } = await supabase
				.from("locations")
				.select("id, name, phone, email")
				.eq("id", reservation.location_id)
				.single();
				
			setLocation(data);
		};

		if (reservation && isOpen) {
			setFormData({ ...reservation });
			fetchRooms();
			fetchAgents();
			fetchGuides();
			fetchLocation();
		}
	}, [reservation, isOpen]);

	const handleOTPVerified = () => {
		setIsOTPVerified(true);
	};

	const handleSubmit = async () => {
		if (!isOTPVerified) {
			toast({
				title: "Verification Required",
				description: "Please verify OTP before saving changes.",
				variant: "destructive",
			});
			return;
		}

		setIsSubmitting(true);
		try {
			const { error } = await supabase
				.from("reservations")
				.update(formData)
				.eq("id", reservation?.id);

			if (error) throw error;

			toast({
				title: "Success",
				description: "Reservation updated successfully",
			});

			onUpdate();
			onClose();
			setIsOTPVerified(false);
		} catch (error: any) {
			console.error("Error updating reservation:", error);
			toast({
				title: "Error",
				description: error.message || "Failed to update reservation",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClose = () => {
		setIsOTPVerified(false);
		onClose();
	};

	if (!reservation) return null;

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						Edit Reservation - {reservation.reservation_number}
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-6">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Guest Name</Label>
							<Input
								value={formData.guest_name || ""}
								onChange={(e) =>
									setFormData({ ...formData, guest_name: e.target.value })
								}
							/>
						</div>
						<div>
							<Label>Guest Email</Label>
							<Input
								type="email"
								value={formData.guest_email || ""}
								onChange={(e) =>
									setFormData({ ...formData, guest_email: e.target.value })
								}
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Guest Phone</Label>
							<PhoneInput
								defaultCountry="LK"
								international
								value={formData.guest_phone || ""}
								onChange={(value) =>
									setFormData({ ...formData, guest_phone: value || "" })
								}
							/>
						</div>
						<div>
							<Label>Guest Nationality</Label>
							<Input
								value={formData.guest_nationality || ""}
								onChange={(e) =>
									setFormData({
										...formData,
										guest_nationality: e.target.value,
									})
								}
							/>
						</div>
					</div>

					<div>
						<Label>Guest Address</Label>
						<Textarea
							value={formData.guest_address || ""}
							onChange={(e) =>
								setFormData({ ...formData, guest_address: e.target.value })
							}
						/>
					</div>

					<div className="grid grid-cols-3 gap-4">
						<div>
							<Label>Adults</Label>
							<Input
								type="number"
								min="1"
								value={formData.adults || 1}
								onChange={(e) =>
									setFormData({ ...formData, adults: parseInt(e.target.value) })
								}
							/>
						</div>
						<div>
							<Label>Children</Label>
							<Input
								type="number"
								min="0"
								value={formData.children || 0}
								onChange={(e) =>
									setFormData({
										...formData,
										children: parseInt(e.target.value),
									})
								}
							/>
						</div>
						<div>
							<Label>Arrival Time</Label>
							<Input
								type="time"
								value={formData.arrival_time || ""}
								onChange={(e) =>
									setFormData({ ...formData, arrival_time: e.target.value })
								}
							/>
						</div>
					</div>

					<div>
						<AvailabilityCalendar
							selectedRoomId={formData.room_id}
							checkInDate={formData.check_in_date || ""}
							checkOutDate={formData.check_out_date || ""}
							onDateSelect={(checkIn, checkOut) => {
								const checkInDate = new Date(checkIn);
								const checkOutDate = new Date(checkOut);
								const nights = Math.ceil(
									(checkOutDate.getTime() - checkInDate.getTime()) /
										(1000 * 60 * 60 * 24),
								);
								setFormData({
									...formData,
									check_in_date: checkIn,
									check_out_date: checkOut,
									nights,
									total_amount: (formData.room_rate || 0) * nights,
								});
							}}
							excludeReservationId={reservation?.id}
							className="w-full"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Room</Label>
							<Select
								value={formData.room_id || ""}
								onValueChange={(value) => {
									const selectedRoom = rooms.find((r) => r.id === value);
									setFormData({
										...formData,
										room_id: value,
										room_rate: selectedRoom?.base_price || formData.room_rate,
										total_amount:
											(selectedRoom?.base_price || formData.room_rate || 0) *
											(formData.nights || 1),
									});
								}}
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
						<div>
							<Label>Room Rate</Label>
							<Input
								type="number"
								step="0.01"
								value={formData.room_rate || 0}
								onChange={(e) => {
									const rate = parseFloat(e.target.value);
									setFormData({
										...formData,
										room_rate: rate,
										total_amount: rate * (formData.nights || 1),
									});
								}}
							/>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label>Agent</Label>
							<Select
								value={formData.agent_id || ""}
								onValueChange={(value) => {
									const selectedAgent = agents.find((a) => a.id === value);
									setFormData({
										...formData,
										agent_id: value,
										agent_commission: selectedAgent?.commission_rate || 0,
									});
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select agent (optional)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="">No Agent</SelectItem>
									{agents.map((agent) => (
										<SelectItem key={agent.id} value={agent.id}>
											{agent.name} ({agent.commission_rate}%)
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label>Guide</Label>
							<Select
								value={formData.guide_id || ""}
								onValueChange={(value) => {
									const selectedGuide = guides.find((g) => g.id === value);
									setFormData({
										...formData,
										guide_id: value,
										guide_commission: selectedGuide?.commission_rate || 0,
									});
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select guide (optional)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="">No Guide</SelectItem>
									{guides.map((guide) => (
										<SelectItem key={guide.id} value={guide.id}>
											{guide.name} ({guide.commission_rate}%)
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div>
						<Label>Special Requests</Label>
						<Textarea
							value={formData.special_requests || ""}
							onChange={(e) =>
								setFormData({ ...formData, special_requests: e.target.value })
							}
							placeholder="Any special requests or notes..."
						/>
					</div>

					<div className="bg-muted p-4 rounded-lg">
						<div className="grid grid-cols-3 gap-4 text-sm">
							<div>
								<span className="font-medium">Total Amount:</span>
								<div className="text-lg">
									{formData.currency} {formData.total_amount}
								</div>
							</div>
							<div>
								<span className="font-medium">Paid Amount:</span>
								<div className="text-lg">
									{formData.currency} {formData.paid_amount || 0}
								</div>
							</div>
							<div>
								<span className="font-medium">Balance:</span>
								<div className="text-lg">
									{formData.currency}{" "}
									{(formData.total_amount || 0) - (formData.paid_amount || 0)}
								</div>
							</div>
						</div>
					</div>

					<div className="flex justify-between pt-4">
						<Button variant="outline" onClick={handleClose}>
							Cancel
						</Button>

						<div className="flex gap-2">
							{!isOTPVerified ? (
								<OTPVerification
									onVerified={handleOTPVerified}
									phoneNumber={location?.phone || "94719528589"}
									locationId={reservation?.location_id}
									triggerComponent={
										<Button variant="default">Verify & Enable Editing</Button>
									}
								/>
							) : (
								<Button onClick={handleSubmit} disabled={isSubmitting}>
									{isSubmitting ? "Saving..." : "Save Changes"}
								</Button>
							)}
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
