import {
	ArrowLeft,
	Calendar,
	CreditCard,
	Edit3,
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
import { PhotoAttachment } from "@/components/PhotoAttachment";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useLocationContext } from "@/context/LocationContext";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import { useTenant } from "@/hooks/useTenant";
import { useFormFieldPreferences } from "@/hooks/useFormFieldPreferences";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { convertCurrency } from "@/utils/currency";

type Location = Tables<"locations">;
type Room = Tables<"rooms">;
type Guide = Tables<"guides">;
type Agent = Tables<"agents">;

export default function ReservationForm() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { toast } = useToast();
	const { profile } = useProfile();
	const { tenant } = useTenant();
	const { preferences: fieldPreferences } = useFormFieldPreferences();
	const [searchParams] = useSearchParams();
	const { locations: availableLocations, loading: locationLoading } =
		useLocationContext();
	const isEdit = Boolean(id);

	const [rooms, setRooms] = useState<Room[]>([]);
	const [guides, setGuides] = useState<Guide[]>([]);
	const [agents, setAgents] = useState<Agent[]>([]);
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [showGuideDialog, setShowGuideDialog] = useState(false);
	const [showAgentDialog, setShowAgentDialog] = useState(false);
	const [idPhotos, setIdPhotos] = useState<string[]>([]);
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
		guest_passport_number: "",
		adults: 1,
		children: 0,
		check_in_date: searchParams.get("date") || "",
		check_out_date: "",
		room_rate: 0,
		nights: 1,
		total_amount: 0,
		advance_amount: 0,
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

	// State for manual total amount editing
	const [isManualTotal, setIsManualTotal] = useState(false);
	const [manualTotalAmount, setManualTotalAmount] = useState(0);

	useEffect(() => {
		// Only auto-calculate if not in manual mode
		if (!isManualTotal) {
			const total = formData.room_rate * formData.nights;
			const balanceAmount = total - formData.advance_amount;
			setFormData((prev) => ({
				...prev,
				total_amount: total,
				balance_amount: balanceAmount,
				paid_amount: formData.advance_amount,
			}));
			setManualTotalAmount(total);
		} else {
			// In manual mode, only update balance amount
			const balanceAmount = manualTotalAmount - formData.advance_amount;
			setFormData((prev) => ({
				...prev,
				total_amount: manualTotalAmount,
				balance_amount: balanceAmount,
				paid_amount: formData.advance_amount,
			}));
		}
	}, [formData.room_rate, formData.nights, formData.advance_amount, isManualTotal, manualTotalAmount]);

	const fetchInitialData = useCallback(async () => {
		try {
			const [roomsRes, guidesRes, agentsRes] = await Promise.all([
				supabase
					.from("rooms")
					.select("*")
					.eq("is_active", true)
					.order("room_number"),
				supabase.from("guides").select("*").eq("is_active", true).order("name"),
				supabase.from("agents").select("*").eq("is_active", true).order("name"),
			]);

			setRooms(roomsRes.data || []);
			setGuides(guidesRes.data || []);
			setAgents(agentsRes.data || []);
		} catch (error) {
			console.error("Error fetching data:", error);
		}
	}, []);

	const fetchReservation = useCallback(async () => {
		if (!id) return;
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
				guest_passport_number: data.guest_passport_number || "",
				adults: data.adults,
				children: data.children,
				check_in_date: data.check_in_date,
				check_out_date: data.check_out_date,
				room_rate: data.room_rate,
				nights: data.nights,
				total_amount: data.total_amount,
				advance_amount: data.advance_amount || 0,
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
			});
			
			// Initialize manual total amount with the loaded total
			setManualTotalAmount(data.total_amount);
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

	useEffect(() => {
		if (!locationLoading) {
			fetchInitialData();
			if (isEdit && id) {
				fetchReservation();
			}
		}
	}, [isEdit, id, locationLoading, fetchInitialData, fetchReservation]);

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

	const calculateTotal = () => {
		if (!isManualTotal) {
			const total = formData.room_rate * formData.nights;
			const balanceAmount = total - formData.advance_amount;
			setFormData((prev) => ({
				...prev,
				total_amount: total,
				balance_amount: balanceAmount,
				paid_amount: formData.advance_amount,
			}));
			setManualTotalAmount(total);
		}
	};

	const handleManualTotalToggle = () => {
		if (!isManualTotal) {
			// Switching to manual mode - initialize with current calculated total
			const calculatedTotal = formData.room_rate * formData.nights;
			setManualTotalAmount(calculatedTotal);
		}
		setIsManualTotal(!isManualTotal);
	};

	const handleManualTotalChange = (value: number) => {
		setManualTotalAmount(value);
		const balanceAmount = value - formData.advance_amount;
		setFormData((prev) => ({
			...prev,
			total_amount: value,
			balance_amount: balanceAmount,
		}));
	};

	const handleInputChange = (field: string, value: any) => {
		setFormData((prev) => {
			const updated = { ...prev, [field]: value };

			// Recalculate nights when dates change
			if (field === "check_in_date" || field === "check_out_date") {
				updated.nights = calculateNights(
					updated.check_in_date,
					updated.check_out_date,
				);
			}

			// Update room rate when room changes
			if (field === "room_id") {
				const selectedRoom = rooms.find((room) => room.id === value);
				if (selectedRoom) {
					// Convert room price from room's currency to reservation currency
					convertCurrency(
						selectedRoom.base_price,
						selectedRoom.currency,
						updated.currency,
					)
						.then((convertedPrice) => {
							updated.room_rate = convertedPrice;
							setFormData((prev) => ({ ...prev, room_rate: convertedPrice }));
						})
						.catch((error) => {
							console.error("Currency conversion failed:", error);
							// Fallback to original price
							updated.room_rate = selectedRoom.base_price;
						});
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

			// Convert room rate when currency changes
			if (field === "currency" && formData.room_id) {
				const selectedRoom = rooms.find((room) => room.id === formData.room_id);
				if (selectedRoom && selectedRoom.currency !== value) {
					convertCurrency(
						selectedRoom.base_price,
						selectedRoom.currency,
						value as string,
					)
						.then((convertedPrice) => {
							setFormData((prev) => ({
								...prev,
								room_rate: convertedPrice,
								total_amount: convertedPrice * prev.nights,
								advance_amount: 0,
								balance_amount: convertedPrice * prev.nights,
							}));
						})
						.catch((error) => {
							console.error("Currency conversion failed:", error);
							toast({
								title: "Currency Conversion Error",
								description:
									"Failed to convert room price. Please check the rate manually.",
								variant: "destructive",
							});
						});
				}
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
				advance_amount: formData.advance_amount,
				special_requests: formData.special_requests || null,
				status: formData.status,
				paid_amount: formData.advance_amount,
				balance_amount: formData.total_amount - formData.advance_amount,
				guide_id: formData.has_guide ? formData.guide_id : null,
				agent_id: formData.has_agent ? formData.agent_id : null,
				guide_commission: formData.has_guide ? formData.guide_commission : 0,
				agent_commission: formData.has_agent ? formData.agent_commission : 0,
				currency: formData.currency,
				tenant_id: profile?.tenant_id,
			};
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

				toast({
					title: "Success",
					description: "Reservation created successfully",
				});
			}

			navigate("/calendar");
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
		<div className="w-full mx-auto p-4 space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button asChild variant="ghost" size="icon">
					<Link to="/calendar">
						<ArrowLeft className="size-4" />
					</Link>
				</Button>
				<div className="flex-1">
					<h1 className="text-lg sm:text-2xl font-bold text-foreground">
						{isEdit ? "Edit Reservation" : "New Reservation"}
					</h1>
					<p className="text-muted-foreground">
						{isEdit ? "Update reservation details" : "Create a new reservation"}
					</p>
				</div>
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					// Always check availability before proceeding, never auto-create
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
					checkAvailabilityAndProceed();
				}}
				className="space-y-6"
			>
				<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
					{/* Left Column - Main Form */}
					<div className="xl:col-span-2 space-y-6">
						{/* Guest Information */}
						<Card className="bg-card">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<User className="size-5" />
									Guest Information
								</CardTitle>
							</CardHeader>
							<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="md:col-span-2">
									<Label htmlFor="guest_name">Guest Name *</Label>
									<Input
										id="guest_name"
										value={formData.guest_name}
										onChange={(e) =>
											handleInputChange("guest_name", e.target.value)
										}
										required
										className="h-11"
									/>
								</div>

								{fieldPreferences?.show_guest_email !== false && (
									<div>
										<Label htmlFor="guest_email">Email</Label>
										<Input
											id="guest_email"
											type="email"
											value={formData.guest_email}
											onChange={(e) =>
												handleInputChange("guest_email", e.target.value)
											}
											className="h-11"
										/>
									</div>
								)}

								{fieldPreferences?.show_guest_phone !== false && (
									<div>
										<Label htmlFor="guest_phone">Phone</Label>
										<PhoneInput
											id="guest_phone"
											defaultCountry="LK"
											international
											value={formData.guest_phone}
											onChange={(value) =>
												handleInputChange("guest_phone", value || "")
											}
										/>
									</div>
								)}

								{fieldPreferences?.show_guest_nationality !== false && (
									<div>
										<Label htmlFor="guest_nationality">Nationality</Label>
										<Input
											id="guest_nationality"
											value={formData.guest_nationality}
											onChange={(e) =>
												handleInputChange("guest_nationality", e.target.value)
											}
											className="h-11"
										/>
									</div>
								)}

								{fieldPreferences?.show_guest_passport_number !== false && (
									<div>
										<Label htmlFor="guest_passport_number">Passport Number</Label>
										<Input
											id="guest_passport_number"
											value={formData.guest_passport_number}
											onChange={(e) =>
												handleInputChange("guest_passport_number", e.target.value)
											}
											className="h-11"
										/>
									</div>
								)}

								<div className="grid grid-cols-2 gap-4">
									{fieldPreferences?.show_adults !== false && (
										<div>
											<Label htmlFor="adults">Adults *</Label>
											<Input
												id="adults"
												type="number"
												min="1"
												value={formData.adults}
												onChange={(e) =>
													handleInputChange("adults", parseInt(e.target.value))
												}
												required
												className="h-11"
											/>
										</div>
									)}
									{fieldPreferences?.show_children !== false && (
										<div>
											<Label htmlFor="children">Children</Label>
											<Input
												id="children"
												type="number"
												min="0"
												value={formData.children}
												onChange={(e) =>
													handleInputChange("children", parseInt(e.target.value))
												}
												className="h-11"
											/>
										</div>
									)}
								</div>

								{fieldPreferences?.show_guest_address !== false && (
									<div className="md:col-span-2">
										<Label htmlFor="guest_address">Address</Label>
										<Textarea
											id="guest_address"
											value={formData.guest_address}
											onChange={(e) =>
												handleInputChange("guest_address", e.target.value)
											}
											rows={3}
											className="resize-none"
										/>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Reservation Details */}
						<Card className="bg-card">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Calendar className="size-5" />
									Reservation Details
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-6">
								{/* Location & Room Selection */}
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<Label htmlFor="location_id">Location *</Label>
										<Select
											value={formData.location_id}
											onValueChange={(value) =>
												handleInputChange("location_id", value)
											}
										>
											<SelectTrigger className="h-11">
												<SelectValue placeholder="Select location" />
											</SelectTrigger>
											<SelectContent className="z-50 bg-background border">
												{availableLocations.map((location) => (
													<SelectItem key={location.id} value={location.id}>
														{location.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div>
										<Label htmlFor="room_id">Room *</Label>
										<Select
											value={formData.room_id}
											onValueChange={(value) =>
												handleInputChange("room_id", value)
											}
										>
											<SelectTrigger className="h-11">
												<SelectValue placeholder="Select room" />
											</SelectTrigger>
											<SelectContent className="z-50 bg-background border">
												{filteredRooms.map((room) => (
													<SelectItem key={room.id} value={room.id}>
														{room.room_number} - {room.room_type} (
														{room.currency} {room.base_price.toLocaleString()}
														/night)
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								</div>

								{/* Date Selection */}
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
											className="w-full"
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
											className="w-full"
										/>
									</div>
									<div>
										<Label>Nights</Label>
										<div className="h-11 px-3 py-2 border border-input bg-background rounded-md flex items-center">
											<span className="text-sm font-medium">
												{formData.nights}{" "}
												{formData.nights === 1 ? "night" : "nights"}
											</span>
										</div>
									</div>
								</div>

								{/* Currency & Pricing */}
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<CurrencySelector
										currency={formData.currency}
										onCurrencyChange={(currency) =>
											handleInputChange("currency", currency)
										}
									/>

									{fieldPreferences?.show_advance_amount !== false && (
										<div>
											<Label htmlFor="advance_amount">Advance Payment</Label>
											<Input
												id="advance_amount"
												type="number"
												min="0"
												step="0.01"
												value={formData.advance_amount}
												onChange={(e) =>
													handleInputChange(
														"advance_amount",
														parseFloat(e.target.value) || 0,
													)
												}
												className="h-11"
											/>
										</div>
									)}
								</div>

								{/* Status */}
								<div>
									<Label htmlFor="status">Status</Label>
									<Select
										value={formData.status}
										onValueChange={(value) =>
											handleInputChange("status", value)
										}
									>
										<SelectTrigger className="h-11">
											<SelectValue />
										</SelectTrigger>
										<SelectContent className="z-50 bg-background border">
											<SelectItem value="tentative">Tentative</SelectItem>
											<SelectItem value="confirmed">Confirmed</SelectItem>
											<SelectItem value="pending">Pending</SelectItem>
										</SelectContent>
									</Select>
								</div>

								{/* Special Requests */}
								{fieldPreferences?.show_special_requests !== false && (
									<div>
										<Label htmlFor="special_requests">Special Requests</Label>
										<Textarea
											id="special_requests"
											value={formData.special_requests}
											onChange={(e) =>
												handleInputChange("special_requests", e.target.value)
											}
											rows={3}
											placeholder="Any special requirements or notes..."
											className="resize-none"
										/>
									</div>
								)}
							</CardContent>
						</Card>
					</div>

					{/* Right Column - Pricing & Actions */}
					<div className="space-y-6">
						{/* Enhanced Pricing Display with Manual Edit */}
						<Card className="bg-primary/5 border-primary/20">
							<CardHeader className="pb-3">
								<CardTitle className="flex items-center justify-between text-base">
									<div className="flex items-center gap-2">
										<CreditCard className="size-5" />
										Pricing Breakdown
									</div>
									<Button
										type="button"
										variant={isManualTotal ? "default" : "outline"}
										size="sm"
										onClick={handleManualTotalToggle}
										className="flex items-center gap-1"
									>
										<Edit3 className="size-3" />
										{isManualTotal ? "Auto" : "Edit"}
									</Button>
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								{/* Room Rate Calculation */}
								{formData.room_rate > 0 && formData.nights > 0 && (
									<div className="flex justify-between items-center text-sm">
										<span>
											{formData.currency} {formData.room_rate.toLocaleString()} × {formData.nights}{" "}
											{formData.nights === 1 ? "night" : "nights"}
										</span>
										<span className="font-medium">
											{formData.currency} {(formData.room_rate * formData.nights).toLocaleString()}
										</span>
									</div>
								)}

								{/* Manual Total Input or Display */}
								<div className="space-y-2">
									<Label htmlFor="total_amount" className="text-sm font-medium">
										Total Amount
									</Label>
									{isManualTotal ? (
										<Input
											id="total_amount"
											type="number"
											value={manualTotalAmount}
											onChange={(e) => handleManualTotalChange(Number(e.target.value))}
											className="text-lg font-semibold"
											min="0"
											step="0.01"
										/>
									) : (
										<div className="text-lg font-semibold text-primary">
											{formData.currency} {formData.total_amount.toLocaleString()}
										</div>
									)}
								</div>

								{/* Advance Payment */}
								{formData.advance_amount > 0 && (
									<>
										<Separator />
										<div className="flex justify-between items-center text-sm">
											<span className="text-muted-foreground">Advance Payment</span>
											<span className="text-emerald-600 font-medium">
												-{formData.currency} {formData.advance_amount.toLocaleString()}
											</span>
										</div>
									</>
								)}

								{/* Balance Due */}
								{formData.advance_amount > 0 && (
									<div className="flex justify-between items-center text-sm">
										<span className="text-muted-foreground">Balance Due</span>
										<span className="font-medium text-orange-600">
											{formData.currency} {formData.balance_amount.toLocaleString()}
										</span>
									</div>
								)}

								<div className="text-xs text-muted-foreground text-center pt-2 border-t">
									{isManualTotal ? "Manual total amount" : "Auto-calculated from room rate × nights"}
								</div>
							</CardContent>
						</Card>

						{/* Photo Attachments */}
						{fieldPreferences?.show_id_photos !== false && (
							<PhotoAttachment
								photos={idPhotos}
								onPhotosChange={setIdPhotos}
								title="ID Photos & Documents"
								maxPhotos={5}
							/>
						)}

						{/* Guest Signature */}
						{fieldPreferences?.show_guest_signature !== false && (
							<SignatureCapture
								signature={guestSignature}
								onSignatureChange={setGuestSignature}
								title="Guest Signature"
							/>
						)}

						{/* Action Buttons */}
						<div className="sticky top-6 space-y-4">
							<Button
								type="submit"
								disabled={
									submitting ||
									!formData.guest_name ||
									!formData.room_id ||
									!formData.check_in_date ||
									!formData.check_out_date
								}
								className="w-full h-12 text-base"
							>
								{submitting ? (
									"Saving..."
								) : (
									<>
										<Save className="size-5 mr-2" />
										{isEdit ? "Update Reservation" : "Save Reservation"}
									</>
								)}
							</Button>{" "}
							<Button
								type="button"
								variant="outline"
								onClick={() => navigate("/calendar")}
								className="w-full h-12"
							>
								Cancel
							</Button>
						</div>
					</div>
				</div>

				{/* Additional Services */}
				<Card className="bg-card">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<UserCheck className="size-5" />
							Additional Services
						</CardTitle>
					</CardHeader>
					<CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Guide Services */}
						{fieldPreferences?.show_guide !== false && (
							<div className="space-y-4">
								<div className="flex items-center space-x-2">
									<Checkbox
										id="has_guide"
										checked={formData.has_guide}
										onCheckedChange={(checked) =>
											handleInputChange("has_guide", checked)
										}
									/>
									<Label htmlFor="has_guide" className="font-medium">
										Include Guide Services
									</Label>
								</div>

								{formData.has_guide && (
									<div className="space-y-4 pl-6 border-l-2 border-primary/20">
										<div className="flex gap-2">
											<Select
												value={formData.guide_id}
												onValueChange={(value) =>
													handleInputChange("guide_id", value)
												}
											>
												<SelectTrigger className="flex-1">
													<SelectValue placeholder="Select guide" />
												</SelectTrigger>
												<SelectContent className="z-50 bg-background border">
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
													<Button type="button" variant="outline" size="icon">
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

										{formData.guide_commission > 0 && (
											<div className="text-sm text-muted-foreground">
												Commission: {formData.currency}{" "}
												{formData.guide_commission.toLocaleString()}
											</div>
										)}
									</div>
								)}
							</div>
						)}

						{/* Agent Services */}
						{fieldPreferences?.show_agent !== false && (
							<div className="space-y-4">
								<div className="flex items-center space-x-2">
									<Checkbox
										id="has_agent"
										checked={formData.has_agent}
										onCheckedChange={(checked) =>
											handleInputChange("has_agent", checked)
										}
									/>
									<Label htmlFor="has_agent" className="font-medium">
										Include Agent Services
									</Label>
								</div>

								{formData.has_agent && (
									<div className="space-y-4 pl-6 border-l-2 border-primary/20">
										<div className="flex gap-2">
											<Select
												value={formData.agent_id}
												onValueChange={(value) =>
													handleInputChange("agent_id", value)
												}
											>
												<SelectTrigger className="flex-1">
													<SelectValue placeholder="Select agent" />
												</SelectTrigger>
												<SelectContent className="z-50 bg-background border">
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
													<Button type="button" variant="outline" size="icon">
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

										{formData.agent_commission > 0 && (
											<div className="text-sm text-muted-foreground">
												Commission: {formData.currency}{" "}
												{formData.agent_commission.toLocaleString()}
											</div>
										)}
									</div>
								)}
							</div>
						)}
					</CardContent>
				</Card>
			</form>
		</div>
	);
}
