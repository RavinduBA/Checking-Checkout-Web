import { format } from "date-fns";
import {
	ArrowLeft,
	Calendar,
	CreditCard,
	MapPin,
	Plus,
	Save,
	User,
	UserCheck,
	Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { CurrencySelector } from "@/components/CurrencySelector";
import { DocumentUpload } from "@/components/DocumentUpload";
import { IDPhotoUpload } from "@/components/IDPhotoUpload";
import { PricingDisplay } from "@/components/PricingDisplay";
import { SignatureCapture } from "@/components/SignatureCapture";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionLoader } from "@/components/ui/loading-spinner";
import { PhoneInput } from "@/components/ui/phone-input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

export default function ReservationFormCompact() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { toast } = useToast();
	const { profile } = useProfile();
	const { tenant } = useTenant();
	const [searchParams] = useSearchParams();
	const { locations: availableLocations, loading: locationLoading } =
		useLocationContext();
	const isEdit = Boolean(id);

	const [rooms, setRooms] = useState<Room[]>([]);
	const [guides, setGuides] = useState<Guide[]>([]);
	const [agents, setAgents] = useState<Agent[]>([]);
	const [locations, setLocations] = useState<Location[]>([]);
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [showGuideDialog, setShowGuideDialog] = useState(false);
	const [showAgentDialog, setShowAgentDialog] = useState(false);
	const [idPhotos, setIdPhotos] = useState<
		Array<{
			filePath: string;
			name: string;
			uploadedAt: Date;
			type: "passport" | "national_id" | "drivers_license" | "other";
		}>
	>([]);
	const [documents, setDocuments] = useState<
		Array<{
			filePath: string;
			name: string;
			type: string;
			size: number;
			uploadedAt: Date;
		}>
	>([]);
	const [guestSignature, setGuestSignature] = useState("");

	// Removed availability checking components - using simple date picker instead

	const [formData, setFormData] = useState({
		location_id: searchParams.get("location") || "",
		room_id: searchParams.get("room") || "",
		guest_name: "",
		guest_email: "",
		guest_phone: "",
		guest_address: "",
		guest_nationality: "",
		adults: 1,
		children: 0,
		check_in_date:
			searchParams.get("checkIn") || searchParams.get("date") || "",
		check_out_date: "",
		room_rate: 0,
		nights: 1,
		total_amount: 0,
		special_requests: "",
		status: "tentative" as any,
		paid_amount: 0,
		balance_amount: 0,
		has_guide: false,
		has_agent: false,
		guide_id: "",
		agent_id: "",
		guide_commission: 0,
		agent_commission: 0,
		currency: "LKR" as any,
		booking_source: "direct" as any,
	});

	const [newGuide, setNewGuide] = useState({
		name: "",
		phone: "",
		email: "",
		commission_rate: 10,
	});

	const [newAgent, setNewAgent] = useState({
		name: "",
		phone: "",
		email: "",
		agency_name: "",
		commission_rate: 15,
	});

	const fetchInitialData = useCallback(async () => {
		try {
			const [roomsRes, guidesRes, agentsRes, locationsRes] = await Promise.all([
				supabase
					.from("rooms")
					.select("*")
					.eq("is_active", true)
					.order("room_number"),
				supabase.from("guides").select("*").eq("is_active", true).order("name"),
				supabase.from("agents").select("*").eq("is_active", true).order("name"),
				supabase
					.from("locations")
					.select("*")
					.eq("is_active", true)
					.order("name"),
			]);

			setRooms(roomsRes.data || []);
			setGuides(guidesRes.data || []);
			setAgents(agentsRes.data || []);
			setLocations(locationsRes.data || []);
		} catch (error) {
			console.error("Error fetching data:", error);
		}
	}, []);

	const fetchReservation = useCallback(async () => {
		setLoading(true);
		try {
			const { data, error } = await supabase
				.from("reservations")
				.select("*")
				.eq("id", id)
				.single();

			if (error) throw error;

			setFormData({
				location_id: data.location_id,
				room_id: data.room_id,
				guest_name: data.guest_name,
				guest_email: data.guest_email || "",
				guest_phone: data.guest_phone || "",
				guest_address: data.guest_address || "",
				guest_nationality: data.guest_nationality || "",
				adults: data.adults,
				children: data.children,
				check_in_date: data.check_in_date,
				check_out_date: data.check_out_date,
				room_rate: data.room_rate,
				nights: data.nights,
				total_amount: data.total_amount,
				special_requests: data.special_requests || "",
				status: data.status,
				paid_amount: data.paid_amount || 0,
				balance_amount: data.balance_amount || 0,
				has_guide: Boolean(data.guide_id),
				has_agent: Boolean(data.agent_id),
				guide_id: data.guide_id || "",
				agent_id: data.agent_id || "",
				guide_commission: data.guide_commission || 0,
				agent_commission: data.agent_commission || 0,
				currency: data.currency || "LKR",
				booking_source: "direct",
			});
		} catch (error) {
			console.error("Error fetching reservation:", error);
			toast({
				title: "Error",
				description: "Failed to load reservation details",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [id, toast]);

	const calculateNights = (checkIn: string, checkOut: string) => {
		if (!checkIn || !checkOut) return 1;

		// Parse dates as local dates to avoid timezone issues
		const parseLocalDate = (dateStr: string) => {
			const [year, month, day] = dateStr.split("-").map(Number);
			return new Date(year, month - 1, day);
		};

		const start = parseLocalDate(checkIn);
		const end = parseLocalDate(checkOut);
		const diffTime = Math.abs(end.getTime() - start.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return Math.max(1, diffDays);
	};

	const calculateTotal = useCallback(async () => {
		let roomRate = formData.room_rate;

		// Convert room rate if currencies don't match
		if (formData.room_id && formData.currency) {
			const selectedRoom = rooms.find((room) => room.id === formData.room_id);
			if (selectedRoom && selectedRoom.currency !== formData.currency) {
				try {
					roomRate = await convertCurrency(
						selectedRoom.base_price,
						selectedRoom.currency,
						formData.currency,
					);
				} catch (error) {
					console.error("Currency conversion failed:", error);
					roomRate = selectedRoom.base_price; // Fallback to original rate
				}
			}
		}

		const total = roomRate * formData.nights;
		const balanceAmount = total;

		setFormData((prev) => ({
			...prev,
			room_rate: roomRate,
			total_amount: total,
			balance_amount: balanceAmount,
			paid_amount: 0,
		}));
	}, [
		formData.room_rate,
		formData.nights,
		formData.currency,
		formData.room_id,
		rooms,
	]);

	useEffect(() => {
		if (!locationLoading) {
			fetchInitialData();
			if (isEdit && id) {
				fetchReservation();
			}
		}
	}, [isEdit, id, locationLoading, fetchInitialData, fetchReservation]);

	useEffect(() => {
		calculateTotal();
	}, [calculateTotal]);

	const handleInputChange = async (field: string, value: any) => {
		setFormData((prev) => {
			const updated = { ...prev, [field]: value };

			// Recalculate nights when dates change
			if (field === "check_in_date" || field === "check_out_date") {
				updated.nights = calculateNights(
					updated.check_in_date,
					updated.check_out_date,
				);
			}

			// Update room rate when room changes or currency changes
			if (field === "room_id" || field === "currency") {
				const selectedRoom = rooms.find((room) => room.id === updated.room_id);
				if (selectedRoom) {
					if (
						field === "currency" &&
						selectedRoom.currency !== updated.currency
					) {
						// Currency conversion will be handled by calculateTotal
						updated.room_rate = selectedRoom.base_price;
					} else {
						updated.room_rate = selectedRoom.base_price;
					}
				}
			}

			// Calculate commissions when guide or agent is selected
			if (field === "guide_id" && value) {
				const selectedGuide = guides.find((guide) => guide.id === value);
				if (selectedGuide) {
					updated.guide_commission =
						(updated.total_amount * selectedGuide.commission_rate) / 100;
				}
			}

			if (field === "agent_id" && value) {
				const selectedAgent = agents.find((agent) => agent.id === value);
				if (selectedAgent) {
					updated.agent_commission =
						(updated.total_amount * selectedAgent.commission_rate) / 100;
				}
			}

			// Reset related fields when checkboxes are unchecked
			if (field === "has_guide" && !value) {
				updated.guide_id = "";
				updated.guide_commission = 0;
			}

			if (field === "has_agent" && !value) {
				updated.agent_id = "";
				updated.agent_commission = 0;
			}

			return updated;
		});
	};

	const createGuide = async () => {
		try {
			const { data, error } = await supabase
				.from("guides")
				.insert([
					{
						name: newGuide.name,
						phone: newGuide.phone,
						email: newGuide.email,
						commission_rate: newGuide.commission_rate,
						is_active: true,
						tenant_id: tenant?.id,
					},
				])
				.select()
				.single();

			if (error) throw error;

			setGuides((prev) => [...prev, data]);
			handleInputChange("guide_id", data.id);
			setShowGuideDialog(false);
			setNewGuide({ name: "", phone: "", email: "", commission_rate: 10 });

			toast({
				title: "Success",
				description: "Guide created successfully",
			});
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to create guide",
				variant: "destructive",
			});
		}
	};

	const createAgent = async () => {
		try {
			const { data, error } = await supabase
				.from("agents")
				.insert([
					{
						name: newAgent.name,
						phone: newAgent.phone,
						email: newAgent.email,
						agency_name: newAgent.agency_name,
						commission_rate: newAgent.commission_rate,
						is_active: true,
						tenant_id: tenant?.id,
					},
				])
				.select()
				.single();

			if (error) throw error;

			setAgents((prev) => [...prev, data]);
			handleInputChange("agent_id", data.id);
			setShowAgentDialog(false);
			setNewAgent({
				name: "",
				phone: "",
				email: "",
				agency_name: "",
				commission_rate: 15,
			});

			toast({
				title: "Success",
				description: "Agent created successfully",
			});
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to create agent",
				variant: "destructive",
			});
		}
	};

	// Validate form and proceed with submission
	const checkAvailabilityAndProceed = async (forceBook: boolean = false) => {
		if (
			!formData.room_id ||
			!formData.check_in_date ||
			!formData.check_out_date
		) {
			toast({
				title: "Missing Information",
				description: "Please select a room and dates before proceeding",
				variant: "destructive",
			});
			return;
		}

		// Directly proceed with submission
		return handleSubmit(null, forceBook);
	};

	const handleSubmit = async (
		e: React.FormEvent | null,
		forceBook: boolean = false,
	) => {
		if (e) {
			e.preventDefault();
		}
		setSubmitting(true);

		try {
			const currentYear = new Date().getFullYear();

			// Calculate balance amount and prepare data
			const calculatedData: any = {
				location_id: formData.location_id,
				room_id: formData.room_id,
				guest_name: formData.guest_name,
				guest_email: formData.guest_email || null,
				guest_phone: formData.guest_phone || null,
				guest_address: formData.guest_address || null,
				guest_nationality: formData.guest_nationality || null,
				adults: formData.adults,
				children: formData.children,
				check_in_date: formData.check_in_date,
				check_out_date: formData.check_out_date,
				room_rate: formData.room_rate,
				nights: formData.nights,
				total_amount: formData.total_amount,
				special_requests: formData.special_requests || null,
				status: formData.status,
				paid_amount: 0,
				balance_amount: formData.total_amount,
				guide_id: formData.has_guide ? formData.guide_id : null,
				agent_id: formData.has_agent ? formData.agent_id : null,
				guide_commission: formData.has_guide ? formData.guide_commission : 0,
				agent_commission: formData.has_agent ? formData.agent_commission : 0,
				currency: formData.currency,
				booking_source: formData.booking_source,
				tenant_id: profile?.tenant_id,
			}; // Store document information (for future implementation - could be stored in a separate table)
			const documentData = {
				id_photos: idPhotos.map((photo) => ({
					filePath: photo.filePath,
					name: photo.name,
					type: photo.type,
					uploadedAt: photo.uploadedAt.toISOString(),
				})),
				documents: documents.map((doc) => ({
					filePath: doc.filePath,
					name: doc.name,
					type: doc.type,
					size: doc.size,
					uploadedAt: doc.uploadedAt.toISOString(),
				})),
				signature: guestSignature,
			};

			// For now, log the documents (in future, store in separate reservation_documents table)
			if (
				documentData.id_photos.length > 0 ||
				documentData.documents.length > 0
			) {
				console.log("Documents to be stored:", documentData);
			}

			if (isEdit) {
				const { error } = await supabase
					.from("reservations")
					.update(calculatedData)
					.eq("id", id);

				if (error) throw error;

				toast({
					title: "Success",
					description: "Reservation updated successfully",
				});
			} else {
				// Generate reservation number using database function
				const { data: reservationNumber, error: numberError } =
					await supabase.rpc("generate_reservation_number", {
						p_tenant_id: profile?.tenant_id,
					});

				if (numberError) throw numberError;

				const insertData: any = {
					...calculatedData,
					reservation_number: reservationNumber,
				};

				const { error } = await supabase
					.from("reservations")
					.insert(insertData);

				if (error) throw error;

				// Send SMS notification for reservation creation
				try {
					const locationData = locations.find(
						(l) => l.id === calculatedData.location_id,
					);
					const roomData = rooms.find((r) => r.id === calculatedData.room_id);

					await supabase.functions.invoke("send-sms-notification", {
						body: {
							type: "reservation",
							guestName: calculatedData.guest_name,
							reservationNumber: reservationNumber,
							roomNumber: roomData?.room_number || "N/A",
							checkIn: format(
								(() => {
									const [year, month, day] = calculatedData.check_in_date
										.split("-")
										.map(Number);
									return new Date(year, month - 1, day);
								})(),
								"MMM dd, yyyy",
							),
							checkOut: format(
								(() => {
									const [year, month, day] = calculatedData.check_out_date
										.split("-")
										.map(Number);
									return new Date(year, month - 1, day);
								})(),
								"MMM dd, yyyy",
							),
							amount: calculatedData.total_amount,
							currency: calculatedData.currency,
							status: calculatedData.status,
							location: locationData?.name || "N/A",
							locationId: calculatedData.location_id, // Added for location admin SMS
							locationPhone: locationData?.phone, // Primary SMS recipient
						},
					});
				} catch (smsError) {
					console.error("SMS notification failed:", smsError);
				}

				toast({
					title: "Success",
					description: "Reservation created successfully",
				});
			}

			navigate("/reservations");
		} catch (error: any) {
			console.error("Error saving reservation:", error);
			toast({
				title: "Error",
				description: error.message || "Failed to save reservation",
				variant: "destructive",
			});
		} finally {
			setSubmitting(false);
		}
	};

	const filteredRooms = rooms.filter(
		(room) =>
			!formData.location_id || room.location_id === formData.location_id,
	);

	if (loading || locationLoading) {
		return <SectionLoader className="min-h-64" />;
	}

	return (
		<div className="w-full mx-auto p-4 space-y-4">
			{/* Header */}
			<div className="flex items-center">
				<div className="flex-1"></div>
				<Button type="submit" form="reservation-form" disabled={submitting}>
					<Save className="size-4 mr-2" />
					{submitting ? "Saving..." : isEdit ? "Update" : "Save"}
				</Button>
			</div>

			<form
				id="reservation-form"
				onSubmit={(e) => {
					e.preventDefault();
					checkAvailabilityAndProceed();
				}}
				className="space-y-4"
			>
				<div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
					{/* Left Column - Guest & Booking Info */}
					<div className="xl:col-span-2 space-y-4">
						{/* Guest Information */}
						<Card className="bg-card">
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center gap-2 text-base">
									<User className="size-4" />
									Guest Information
								</CardTitle>
							</CardHeader>
							<CardContent className="grid grid-cols-2 gap-3">
								<div className="col-span-2">
									<Label htmlFor="guest_name" className="text-sm">
										Guest Name *
									</Label>
									<Input
										id="guest_name"
										value={formData.guest_name}
										onChange={(e) =>
											handleInputChange("guest_name", e.target.value)
										}
										required
										className="h-9"
									/>
								</div>

								<div>
									<Label htmlFor="guest_email" className="text-sm">
										Email
									</Label>
									<Input
										id="guest_email"
										type="email"
										value={formData.guest_email}
										onChange={(e) =>
											handleInputChange("guest_email", e.target.value)
										}
										className="h-9"
									/>
								</div>

								<div>
									<Label htmlFor="guest_phone" className="text-sm">
										Phone
									</Label>
									<PhoneInput
										id="guest_phone"
										defaultCountry="LK"
										international
										value={formData.guest_phone}
										onChange={(value) =>
											handleInputChange("guest_phone", value || "")
										}
										className="h-9"
									/>
								</div>

								<div>
									<Label htmlFor="guest_nationality" className="text-sm">
										Nationality
									</Label>
									<Input
										id="guest_nationality"
										value={formData.guest_nationality}
										onChange={(e) =>
											handleInputChange("guest_nationality", e.target.value)
										}
										className="h-9"
									/>
								</div>

								<div className="grid grid-cols-2 gap-2">
									<div>
										<Label htmlFor="adults" className="text-sm">
											Adults *
										</Label>
										<Input
											id="adults"
											type="number"
											min="1"
											value={formData.adults}
											onChange={(e) =>
												handleInputChange("adults", parseInt(e.target.value))
											}
											required
											className="h-9"
										/>
									</div>
									<div>
										<Label htmlFor="children" className="text-sm">
											Children
										</Label>
										<Input
											id="children"
											type="number"
											min="0"
											value={formData.children}
											onChange={(e) =>
												handleInputChange("children", parseInt(e.target.value))
											}
											className="h-9"
										/>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Booking Details */}
						<Card className="bg-card">
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center gap-2 text-base">
									<Calendar className="size-4" />
									Booking Details
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								{availableLocations.length > 1 && (
									<div>
										<Label className="text-sm">Location *</Label>
										<Select
											value={formData.location_id}
											onValueChange={(value) =>
												handleInputChange("location_id", value)
											}
										>
											<SelectTrigger className="h-9">
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
								)}

								<div className="grid grid-cols-2 gap-3">
									<div>
										<Label className="text-sm">Room *</Label>
										<Select
											value={formData.room_id}
											onValueChange={(value) =>
												handleInputChange("room_id", value)
											}
										>
											<SelectTrigger className="h-9">
												<SelectValue placeholder="Select room" />
											</SelectTrigger>
											<SelectContent>
												{filteredRooms.map((room) => (
													<SelectItem key={room.id} value={room.id}>
														{room.room_number} - {room.room_type}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div>
										<CurrencySelector
											currency={formData.currency}
											onCurrencyChange={(currency) =>
												handleInputChange("currency", currency)
											}
											label="Currency"
										/>
									</div>
								</div>

								<div className="grid grid-cols-2 gap-3">
									<div>
										<Label htmlFor="check_in_date">Check-in Date</Label>
										<DatePicker
											value={formData.check_in_date}
											onChange={(value) =>
												handleInputChange("check_in_date", value)
											}
											placeholder="Select check-in date"
											min={(() => {
												const today = new Date();
												const year = today.getFullYear();
												const month = String(today.getMonth() + 1).padStart(
													2,
													"0",
												);
												const day = String(today.getDate()).padStart(2, "0");
												return `${year}-${month}-${day}`;
											})()}
											className="h-9"
										/>
									</div>
									<div>
										<Label htmlFor="check_out_date">Check-out Date</Label>
										<DatePicker
											value={formData.check_out_date}
											onChange={(value) =>
												handleInputChange("check_out_date", value)
											}
											placeholder="Select check-out date"
											min={
												formData.check_in_date ||
												(() => {
													const today = new Date();
													const year = today.getFullYear();
													const month = String(today.getMonth() + 1).padStart(
														2,
														"0",
													);
													const day = String(today.getDate()).padStart(2, "0");
													return `${year}-${month}-${day}`;
												})()
											}
											className="h-9"
										/>
									</div>
								</div>

								{formData.check_in_date && formData.check_out_date && (
									<div className="flex items-center justify-center py-2 px-4 bg-muted/50 rounded-lg">
										<Calendar className="size-4 mr-2 text-muted-foreground" />
										<span className="text-sm font-medium">
											{formData.nights}{" "}
											{formData.nights === 1 ? "night" : "nights"}
										</span>
									</div>
								)}

								<div>
									<Label className="text-sm">Booking Source *</Label>
									<Select
										value={formData.booking_source}
										onValueChange={(value) =>
											handleInputChange("booking_source", value)
										}
									>
										<SelectTrigger className="h-9">
											<SelectValue placeholder="Select booking source" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="direct">Direct Booking</SelectItem>
											<SelectItem value="booking.com">Booking.com</SelectItem>
											<SelectItem value="airbnb">Airbnb</SelectItem>
											<SelectItem value="expedia">Expedia</SelectItem>
											<SelectItem value="agoda">Agoda</SelectItem>
											<SelectItem value="other">Other</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div>
									<Label htmlFor="special_requests" className="text-sm">
										Special Requests
									</Label>
									<Textarea
										id="special_requests"
										value={formData.special_requests}
										onChange={(e) =>
											handleInputChange("special_requests", e.target.value)
										}
										className="h-20 resize-none"
									/>
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Middle Column - Pricing & Services */}
					<div className="space-y-4">
						{/* Pricing Display */}
						<PricingDisplay
							roomRate={formData.room_rate}
							nights={formData.nights}
							currency={formData.currency}
							totalAmount={formData.total_amount}
						/>

						{/* Services */}
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center gap-2 text-base">
									<UserCheck className="size-4" />
									Services
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex items-center space-x-2">
									<Checkbox
										id="has_guide"
										checked={formData.has_guide}
										onCheckedChange={(checked) =>
											handleInputChange("has_guide", checked)
										}
									/>
									<Label htmlFor="has_guide" className="text-sm">
										Include Guide
									</Label>
								</div>

								{formData.has_guide && (
									<div className="flex gap-2">
										<Select
											value={formData.guide_id}
											onValueChange={(value) =>
												handleInputChange("guide_id", value)
											}
										>
											<SelectTrigger className="flex-1 h-9">
												<SelectValue placeholder="Select guide" />
											</SelectTrigger>
											<SelectContent>
												{guides.map((guide) => (
													<SelectItem key={guide.id} value={guide.id}>
														{guide.name} ({guide.commission_rate}%)
													</SelectItem>
												))}
											</SelectContent>
										</Select>

										<Dialog
											open={showGuideDialog}
											onOpenChange={setShowGuideDialog}
										>
											<DialogTrigger asChild>
												<Button
													type="button"
													variant="outline"
													size="icon"
													className="h-9 w-9"
												>
													<Plus className="size-4" />
												</Button>
											</DialogTrigger>
											<DialogContent>
												<DialogHeader>
													<DialogTitle>Add New Guide</DialogTitle>
													<DialogDescription>
														Create a new guide profile
													</DialogDescription>
												</DialogHeader>
												<div className="space-y-4">
													<div>
														<Label htmlFor="guide_name">Name</Label>
														<Input
															id="guide_name"
															value={newGuide.name}
															onChange={(e) =>
																setNewGuide((prev) => ({
																	...prev,
																	name: e.target.value,
																}))
															}
														/>
													</div>
													<div>
														<Label htmlFor="guide_phone">Phone</Label>
														<PhoneInput
															id="guide_phone"
															defaultCountry="LK"
															international
															value={newGuide.phone}
															onChange={(value) =>
																setNewGuide((prev) => ({
																	...prev,
																	phone: value || "",
																}))
															}
														/>
													</div>
													<div>
														<Label htmlFor="guide_email">Email</Label>
														<Input
															id="guide_email"
															type="email"
															value={newGuide.email}
															onChange={(e) =>
																setNewGuide((prev) => ({
																	...prev,
																	email: e.target.value,
																}))
															}
														/>
													</div>
													<div>
														<Label htmlFor="guide_commission">
															Commission Rate (%)
														</Label>
														<Input
															id="guide_commission"
															type="number"
															min="0"
															max="100"
															value={newGuide.commission_rate}
															onChange={(e) =>
																setNewGuide((prev) => ({
																	...prev,
																	commission_rate: parseFloat(e.target.value),
																}))
															}
														/>
													</div>
													<Button onClick={createGuide} className="w-full">
														Create Guide
													</Button>
												</div>
											</DialogContent>
										</Dialog>
									</div>
								)}

								<div className="flex items-center space-x-2">
									<Checkbox
										id="has_agent"
										checked={formData.has_agent}
										onCheckedChange={(checked) =>
											handleInputChange("has_agent", checked)
										}
									/>
									<Label htmlFor="has_agent" className="text-sm">
										Include Agent
									</Label>
								</div>

								{formData.has_agent && (
									<div className="flex gap-2">
										<Select
											value={formData.agent_id}
											onValueChange={(value) =>
												handleInputChange("agent_id", value)
											}
										>
											<SelectTrigger className="flex-1 h-9">
												<SelectValue placeholder="Select agent" />
											</SelectTrigger>
											<SelectContent>
												{agents.map((agent) => (
													<SelectItem key={agent.id} value={agent.id}>
														{agent.name} - {agent.agency_name} (
														{agent.commission_rate}%)
													</SelectItem>
												))}
											</SelectContent>
										</Select>

										<Dialog
											open={showAgentDialog}
											onOpenChange={setShowAgentDialog}
										>
											<DialogTrigger asChild>
												<Button
													type="button"
													variant="outline"
													size="icon"
													className="h-9 w-9"
												>
													<Plus className="size-4" />
												</Button>
											</DialogTrigger>
											<DialogContent>
												<DialogHeader>
													<DialogTitle>Add New Agent</DialogTitle>
													<DialogDescription>
														Create a new agent profile
													</DialogDescription>
												</DialogHeader>
												<div className="space-y-4">
													<div>
														<Label htmlFor="agent_name">Name</Label>
														<Input
															id="agent_name"
															value={newAgent.name}
															onChange={(e) =>
																setNewAgent((prev) => ({
																	...prev,
																	name: e.target.value,
																}))
															}
														/>
													</div>
													<div>
														<Label htmlFor="agent_agency">Agency Name</Label>
														<Input
															id="agent_agency"
															value={newAgent.agency_name}
															onChange={(e) =>
																setNewAgent((prev) => ({
																	...prev,
																	agency_name: e.target.value,
																}))
															}
														/>
													</div>
													<div>
														<Label htmlFor="agent_phone">Phone</Label>
														<PhoneInput
															id="agent_phone"
															defaultCountry="LK"
															international
															value={newAgent.phone}
															onChange={(value) =>
																setNewAgent((prev) => ({
																	...prev,
																	phone: value || "",
																}))
															}
														/>
													</div>
													<div>
														<Label htmlFor="agent_email">Email</Label>
														<Input
															id="agent_email"
															type="email"
															value={newAgent.email}
															onChange={(e) =>
																setNewAgent((prev) => ({
																	...prev,
																	email: e.target.value,
																}))
															}
														/>
													</div>
													<div>
														<Label htmlFor="agent_commission">
															Commission Rate (%)
														</Label>
														<Input
															id="agent_commission"
															type="number"
															min="0"
															max="100"
															value={newAgent.commission_rate}
															onChange={(e) =>
																setNewAgent((prev) => ({
																	...prev,
																	commission_rate: parseFloat(e.target.value),
																}))
															}
														/>
													</div>
													<Button onClick={createAgent} className="w-full">
														Create Agent
													</Button>
												</div>
											</DialogContent>
										</Dialog>
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Right Column - Documents & Signature */}
					<div className="space-y-4">
						<IDPhotoUpload
							photos={idPhotos}
							onPhotosChange={setIdPhotos}
							title="ID Documents"
							maxPhotos={3}
						/>

						<DocumentUpload
							files={documents}
							onFilesChange={setDocuments}
							title="Additional Documents"
							maxFiles={5}
							description="Upload contracts, agreements, or other relevant documents"
						/>

						<SignatureCapture
							signature={guestSignature}
							onSignatureChange={setGuestSignature}
							title="Guest Signature"
						/>
					</div>
				</div>
			</form>
		</div>
	);
}
