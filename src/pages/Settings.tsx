import {
	ArrowLeft,
	DollarSign,
	Edit,
	ExternalLink,
	MapPin,
	Save,
	Trash2,
	User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { PhoneVerification } from "@/components/PhoneVerification";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocationContext } from "@/context/LocationContext";
import { useToast } from "@/hooks/use-toast";
import { useFormFieldPreferences } from "@/hooks/useFormFieldPreferences";
import { useProfile } from "@/hooks/useProfile";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import {
	addCustomCurrency,
	type CurrencyRate,
	getCurrencyConversionSearchUrl,
	getCurrencyDetails,
	removeCustomCurrency,
	updateCurrencyRate,
} from "@/utils/currency";

type ExpenseType = {
	id: string;
	main_type: string;
	sub_type: string;
	created_at: string;
};

type IncomeType = {
	id: string;
	type_name: string;
	created_at: string;
};

type Location = {
	id: string;
	name: string;
	is_active: boolean;
	address?: string;
	phone?: string;
	email?: string;
	tenant_id?: string;
};

export default function Settings() {
	const navigate = useNavigate();
	const { toast } = useToast();
	const { t } = useTranslation();
	const {
		profile,
		loading: profileLoading,
		refetch: refetchProfile,
	} = useProfile();
	const { tenant } = useTenant();
	const {
		preferences: formPreferences,
		updatePreferences: updateFormPreferences,
		loading: formPreferencesLoading,
	} = useFormFieldPreferences();
	const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
	const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>([]);
	const [locations, setLocations] = useState<Location[]>([]);
	const { selectedLocation: contextLocation } = useLocationContext();
	const [selectedLocationId, setSelectedLocationId] = useState<string>("");
	const [newMainType, setNewMainType] = useState("");
	const [newSubType, setNewSubType] = useState("");
	const [newIncomeType, setNewIncomeType] = useState("");
	const [currencyRates, setCurrencyRates] = useState<CurrencyRate[]>([]);

	// Custom currency form state
	const [newCurrencyCode, setNewCurrencyCode] = useState("");
	const [newCurrencyRate, setNewCurrencyRate] = useState<number>(1);
	const [isAddingCurrency, setIsAddingCurrency] = useState(false);

	// Profile editing state
	const [isEditingProfile, setIsEditingProfile] = useState(false);
	const [profileForm, setProfileForm] = useState({
		name: "",
		email: "",
		phone: "",
	});

	// Location editing state
	const [isEditingLocation, setIsEditingLocation] = useState(false);
	const [editingLocationId, setEditingLocationId] = useState<string | null>(
		null,
	);
	const [locationForm, setLocationForm] = useState({
		name: "",
		address: "",
		phone: "",
		email: "",
	});

	// Delete confirmation states
	const [deleteExpenseConfirmOpen, setDeleteExpenseConfirmOpen] =
		useState(false);
	const [expenseTypeToDelete, setExpenseTypeToDelete] = useState<string | null>(
		null,
	);
	const [deleteIncomeConfirmOpen, setDeleteIncomeConfirmOpen] = useState(false);
	const [incomeTypeToDelete, setIncomeTypeToDelete] = useState<string | null>(
		null,
	);
	const [clearBookingsConfirmOpen, setClearBookingsConfirmOpen] =
		useState(false);
	const [deleteCurrencyConfirmOpen, setDeleteCurrencyConfirmOpen] =
		useState(false);
	const [currencyToDelete, setCurrencyToDelete] = useState<string | null>(null);

	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => {
		fetchExpenseTypes();
		fetchIncomeTypes();
		fetchLocations();
		fetchCurrencyRates();
	}, []);

	// Set default location from context
	useEffect(() => {
		if (contextLocation && !selectedLocationId) {
			setSelectedLocationId(contextLocation);
		}
	}, [contextLocation, selectedLocationId]);

	const fetchCurrencyRates = async () => {
		try {
			const rates = await getCurrencyDetails();
			setCurrencyRates(rates);
		} catch (error) {
			console.error("Error fetching currency rates:", error);
		}
	};

	const addCurrency = async () => {
		if (!newCurrencyCode.trim() || newCurrencyRate <= 0) {
			toast({
				title: "Error",
				description: "Please enter a valid currency code and rate",
				variant: "destructive",
			});
			return;
		}

		setIsAddingCurrency(true);
		try {
			const result = await addCustomCurrency(
				newCurrencyCode.toUpperCase(),
				newCurrencyRate,
			);
			if (result.success) {
				toast({
					title: "Success",
					description: `${newCurrencyCode.toUpperCase()} currency added successfully`,
				});
				setNewCurrencyCode("");
				setNewCurrencyRate(1);
				await fetchCurrencyRates();
			} else {
				toast({
					title: "Error",
					description: result.error || "Failed to add currency",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error adding currency:", error);
			toast({
				title: "Error",
				description: "Failed to add currency",
				variant: "destructive",
			});
		} finally {
			setIsAddingCurrency(false);
		}
	};

	const updateCurrency = async (currencyCode: string, newRate: number) => {
		try {
			const result = await updateCurrencyRate(currencyCode, newRate);
			if (result.success) {
				toast({
					title: "Success",
					description: `${currencyCode} rate updated successfully`,
				});
				await fetchCurrencyRates();
			} else {
				toast({
					title: "Error",
					description: result.error || "Failed to update currency rate",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error updating currency:", error);
			toast({
				title: "Error",
				description: "Failed to update currency rate",
				variant: "destructive",
			});
		}
	};

	const deleteCurrency = (currencyCode: string) => {
		setCurrencyToDelete(currencyCode);
		setDeleteCurrencyConfirmOpen(true);
	};

	const confirmDeleteCurrency = async () => {
		if (!currencyToDelete) return;

		try {
			const result = await removeCustomCurrency(currencyToDelete);
			if (result.success) {
				toast({
					title: "Success",
					description: `${currencyToDelete} currency removed successfully`,
				});
				await fetchCurrencyRates();
			} else {
				toast({
					title: "Error",
					description: result.error || "Failed to remove currency",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error removing currency:", error);
			toast({
				title: "Error",
				description: "Failed to remove currency",
				variant: "destructive",
			});
		} finally {
			setDeleteCurrencyConfirmOpen(false);
			setCurrencyToDelete(null);
		}
	};

	const fetchExpenseTypes = async () => {
		const { data, error } = await supabase
			.from("expense_types")
			.select("*")
			.order("main_type", { ascending: true });

		if (error) {
			console.error("Error fetching expense types:", error);
			toast({
				title: "Error",
				description: "Failed to fetch expense types",
				variant: "destructive",
			});
		} else {
			setExpenseTypes(data || []);
		}
	};

	const fetchIncomeTypes = async () => {
		const { data, error } = await supabase
			.from("income_types")
			.select("*")
			.order("type_name", { ascending: true });

		if (error) {
			console.error("Error fetching income types:", error);
			toast({
				title: "Error",
				description: "Failed to fetch income types",
				variant: "destructive",
			});
		} else {
			setIncomeTypes(data || []);
		}
	};

	const fetchLocations = async () => {
		const { data, error } = await supabase
			.from("locations")
			.select("*")
			.eq("is_active", true)
			.order("name", { ascending: true });

		if (error) {
			console.error("Error fetching locations:", error);
			toast({
				title: "Error",
				description: "Failed to fetch locations",
				variant: "destructive",
			});
		} else {
			setLocations(data || []);
		}
	};

	const addExpenseType = async () => {
		if (!newMainType.trim() || !newSubType.trim()) {
			toast({
				title: "Error",
				description: "Please fill in both main type and sub type",
				variant: "destructive",
			});
			return;
		}

		const { error } = await supabase
			.from("expense_types")
			.insert([{ main_type: newMainType.trim(), sub_type: newSubType.trim() }]);

		if (error) {
			console.error("Error adding expense type:", error);
			toast({
				title: "Error",
				description: "Failed to add expense type",
				variant: "destructive",
			});
		} else {
			toast({
				title: "Success",
				description: "Expense type added successfully",
			});
			setNewMainType("");
			setNewSubType("");
			fetchExpenseTypes();
		}
	};

	const addIncomeType = async () => {
		if (!newIncomeType.trim()) {
			toast({
				title: "Error",
				description: "Please fill in the income type",
				variant: "destructive",
			});
			return;
		}

		const { error } = await supabase
			.from("income_types")
			.insert([{ type_name: newIncomeType.trim() }]);

		if (error) {
			console.error("Error adding income type:", error);
			toast({
				title: "Error",
				description: "Failed to add income type",
				variant: "destructive",
			});
		} else {
			toast({
				title: "Success",
				description: "Income type added successfully",
			});
			setNewIncomeType("");
			fetchIncomeTypes();
		}
	};

	const deleteExpenseType = (id: string) => {
		setExpenseTypeToDelete(id);
		setDeleteExpenseConfirmOpen(true);
	};

	const confirmDeleteExpenseType = async () => {
		if (!expenseTypeToDelete) return;

		try {
			const { error } = await supabase
				.from("expense_types")
				.delete()
				.eq("id", expenseTypeToDelete);
			if (error) throw error;
			toast({
				title: "Success",
				description: "Expense type deleted successfully",
			});
			fetchExpenseTypes();
		} catch (error) {
			console.error("Error deleting expense type:", error);
			toast({
				title: "Error",
				description: "Failed to delete expense type",
				variant: "destructive",
			});
		} finally {
			setDeleteExpenseConfirmOpen(false);
			setExpenseTypeToDelete(null);
		}
	};

	const deleteIncomeType = (id: string) => {
		setIncomeTypeToDelete(id);
		setDeleteIncomeConfirmOpen(true);
	};

	const confirmDeleteIncomeType = async () => {
		if (!incomeTypeToDelete) return;

		try {
			const { error } = await supabase
				.from("income_types")
				.delete()
				.eq("id", incomeTypeToDelete);
			if (error) throw error;
			toast({
				title: "Success",
				description: "Income type deleted successfully",
			});
			fetchIncomeTypes();
		} catch (error) {
			console.error("Error deleting income type:", error);
			toast({
				title: "Error",
				description: "Failed to delete income type",
				variant: "destructive",
			});
		} finally {
			setDeleteIncomeConfirmOpen(false);
			setIncomeTypeToDelete(null);
		}
	};

	const clearLocationBookings = () => {
		if (!selectedLocationId) {
			toast({
				title: "Error",
				description: "Please select a location first",
				variant: "destructive",
			});
			return;
		}

		setClearBookingsConfirmOpen(true);
	};

	const confirmClearBookings = async () => {
		if (!selectedLocationId) return;

		const selectedLocation = locations.find((l) => l.id === selectedLocationId);
		if (!selectedLocation) return;

		try {
			const { data, error } = await supabase.functions.invoke(
				"clear-bookings",
				{
					body: { locationId: selectedLocationId },
				},
			);

			if (error) throw error;

			toast({
				title: "Success",
				description: `Cleared ${data.deletedCount} bookings from ${selectedLocation.name}`,
			});
		} catch (error) {
			console.error("Error clearing bookings:", error);
			toast({
				title: "Error",
				description: "Failed to clear bookings",
				variant: "destructive",
			});
		} finally {
			setClearBookingsConfirmOpen(false);
		}
	};

	// Profile management functions
	useEffect(() => {
		if (profile) {
			setProfileForm({
				name: profile.name || "",
				email: profile.email || "",
				phone: profile.phone || "",
			});
		}
	}, [profile]);

	const handleProfileEdit = () => {
		setIsEditingProfile(true);
	};

	const handleProfileSave = async () => {
		try {
			const { error } = await supabase
				.from("profiles")
				.update({
					name: profileForm.name,
					phone: profileForm.phone,
				})
				.eq("id", profile?.id);

			if (error) throw error;

			toast({
				title: "Success",
				description: "Profile updated successfully",
			});

			setIsEditingProfile(false);
			refetchProfile();
		} catch (error) {
			console.error("Error updating profile:", error);
			toast({
				title: "Error",
				description: "Failed to update profile",
				variant: "destructive",
			});
		}
	};

	const handleProfileCancel = () => {
		if (profile) {
			setProfileForm({
				name: profile.name || "",
				email: profile.email || "",
				phone: profile.phone || "",
			});
		}
		setIsEditingProfile(false);
	};

	// Location management functions
	const handleLocationEdit = (location: Location) => {
		setEditingLocationId(location.id);
		setLocationForm({
			name: location.name,
			address: location.address || "",
			phone: location.phone || "",
			email: location.email || "",
		});
		setIsEditingLocation(true);
	};

	const handleLocationSave = async () => {
		try {
			const { error } = await supabase
				.from("locations")
				.update({
					name: locationForm.name,
					address: locationForm.address,
					phone: locationForm.phone,
					email: locationForm.email,
				})
				.eq("id", editingLocationId);

			if (error) throw error;

			toast({
				title: "Success",
				description: "Location updated successfully",
			});

			setIsEditingLocation(false);
			setEditingLocationId(null);
			fetchLocations();
		} catch (error) {
			console.error("Error updating location:", error);
			toast({
				title: "Error",
				description: "Failed to update location",
				variant: "destructive",
			});
		}
	};

	const handleLocationCancel = () => {
		setLocationForm({
			name: "",
			address: "",
			phone: "",
			email: "",
		});
		setIsEditingLocation(false);
		setEditingLocationId(null);
	};

	const handleAddNewLocation = async () => {
		try {
			const { error } = await supabase.from("locations").insert([
				{
					name: locationForm.name,
					address: locationForm.address,
					phone: locationForm.phone,
					email: locationForm.email,
					tenant_id: tenant?.id,
					is_active: true,
				},
			]);

			if (error) throw error;

			toast({
				title: "Success",
				description: "Location added successfully",
			});

			setLocationForm({
				name: "",
				address: "",
				phone: "",
				email: "",
			});
			fetchLocations();
		} catch (error) {
			console.error("Error adding location:", error);
			toast({
				title: "Error",
				description: "Failed to add location",
				variant: "destructive",
			});
		}
	};

	return (
		<div className="w-full pb-8 mx-auto p-6">
			<Tabs defaultValue="profile" className="w-full">
				<TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-1 h-auto p-1">
					<TabsTrigger value="profile" className="text-xs sm:text-sm px-2 py-2">
						{t('settings.profile')}
					</TabsTrigger>
					<TabsTrigger
						value="locations"
						className="text-xs sm:text-sm px-2 py-2"
					>
						{t('settings.locations')}
					</TabsTrigger>
					<TabsTrigger
						value="form-fields"
						className="text-xs sm:text-sm px-2 py-2"
					>
						{t('settings.formFields')}
					</TabsTrigger>
					<TabsTrigger
						value="expenses"
						className="text-xs sm:text-sm px-2 py-2"
					>
						{t('settings.expenses')}
					</TabsTrigger>
					<TabsTrigger value="income" className="text-xs sm:text-sm px-2 py-2">
						{t('settings.income')}
					</TabsTrigger>
					<TabsTrigger
						value="currency"
						className="text-xs sm:text-sm px-2 py-2"
					>
						{t('settings.currency')}
					</TabsTrigger>
					<TabsTrigger
						value="bookings"
						className="text-xs sm:text-sm px-2 py-2"
					>
						{t('settings.bookings')}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="profile">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<User className="h-5 w-5" />
								{t('settings.profileSettings')}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<Label htmlFor="profileName">Name</Label>
										<Input
											id="profileName"
											value={profileForm.name}
											onChange={(e) =>
												setProfileForm((prev) => ({
													...prev,
													name: e.target.value,
												}))
											}
											disabled={!isEditingProfile}
											placeholder="Enter your name"
										/>
									</div>
									<div>
										<Label htmlFor="profileEmail">Email</Label>
										<Input
											id="profileEmail"
											value={profileForm.email}
											disabled={true}
											placeholder="Email cannot be changed"
											className="bg-gray-50"
										/>
									</div>
									<div>
										<Label htmlFor="profilePhone">Phone</Label>
										<PhoneInput
											value={profileForm.phone}
											defaultCountry="LK"
											international
											onChange={(value) =>
												setProfileForm((prev) => ({ ...prev, phone: value }))
											}
											disabled={!isEditingProfile}
											placeholder="Enter your phone number"
										/>
									</div>
								</div>
								<div className="flex gap-2">
									{!isEditingProfile ? (
										<Button
											onClick={handleProfileEdit}
											className="flex items-center gap-2"
										>
											<Edit className="h-4 w-4" />
											Edit Profile
										</Button>
									) : (
										<>
											<Button
												onClick={handleProfileSave}
												className="flex items-center gap-2"
											>
												<Save className="h-4 w-4" />
												Save Changes
											</Button>
											<Button variant="outline" onClick={handleProfileCancel}>
												Cancel
											</Button>
										</>
									)}
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Phone Verification Section */}
					<div className="mt-4">
						<PhoneVerification
							phone={profile?.phone}
							isVerified={profile?.is_phone_verified || false}
							onVerificationSuccess={() => {
								refetchProfile();
								toast({
									title: "Phone verified",
									description:
										"Your phone number has been successfully verified",
								});
							}}
						/>
					</div>
				</TabsContent>

				<TabsContent value="form-fields">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Edit className="h-5 w-5" />
								Reservation Form Field Preferences
							</CardTitle>
						</CardHeader>
						<CardContent>
							{formPreferencesLoading ? (
								<div className="flex items-center justify-center py-8">
									<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
								</div>
							) : (
								<div className="space-y-6">
									<div className="text-sm text-muted-foreground mb-4">
										Select which fields to show in the reservation form.
										Unchecked fields will be hidden from the form.
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
										{/* Guest Information Fields */}
										<div className="space-y-4">
											<h3 className="font-medium text-sm text-gray-900">
												Guest Information
											</h3>
											<div className="space-y-3">
												<div className="flex items-center space-x-2">
													<input
														type="checkbox"
														id="show_guest_email"
														checked={formPreferences?.show_guest_email ?? true}
														onChange={(e) =>
															updateFormPreferences({
																show_guest_email: e.target.checked,
															})
														}
														className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
													/>
													<label htmlFor="show_guest_email" className="text-sm">
														Guest Email
													</label>
												</div>
												<div className="flex items-center space-x-2">
													<input
														type="checkbox"
														id="show_guest_phone"
														checked={formPreferences?.show_guest_phone ?? true}
														onChange={(e) =>
															updateFormPreferences({
																show_guest_phone: e.target.checked,
															})
														}
														className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
													/>
													<label htmlFor="show_guest_phone" className="text-sm">
														Guest Phone
													</label>
												</div>
												<div className="flex items-center space-x-2">
													<input
														type="checkbox"
														id="show_guest_address"
														checked={
															formPreferences?.show_guest_address ?? true
														}
														onChange={(e) =>
															updateFormPreferences({
																show_guest_address: e.target.checked,
															})
														}
														className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
													/>
													<label
														htmlFor="show_guest_address"
														className="text-sm"
													>
														Guest Address
													</label>
												</div>
												<div className="flex items-center space-x-2">
													<input
														type="checkbox"
														id="show_guest_nationality"
														checked={
															formPreferences?.show_guest_nationality ?? true
														}
														onChange={(e) =>
															updateFormPreferences({
																show_guest_nationality: e.target.checked,
															})
														}
														className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
													/>
													<label
														htmlFor="show_guest_nationality"
														className="text-sm"
													>
														Guest Nationality
													</label>
												</div>
												<div className="flex items-center space-x-2">
													<input
														type="checkbox"
														id="show_guest_passport_number"
														checked={
															formPreferences?.show_guest_passport_number ??
															true
														}
														onChange={(e) =>
															updateFormPreferences({
																show_guest_passport_number: e.target.checked,
															})
														}
														className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
													/>
													<label
														htmlFor="show_guest_passport_number"
														className="text-sm"
													>
														Passport Number
													</label>
												</div>
												<div className="flex items-center space-x-2">
													<input
														type="checkbox"
														id="show_guest_id_number"
														checked={
															formPreferences?.show_guest_id_number ?? false
														}
														onChange={(e) =>
															updateFormPreferences({
																show_guest_id_number: e.target.checked,
															})
														}
														className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
													/>
													<label
														htmlFor="show_guest_id_number"
														className="text-sm"
													>
														ID Number
													</label>
												</div>
											</div>
										</div>

										{/* Booking Details Fields */}
										<div className="space-y-4">
											<h3 className="font-medium text-sm text-gray-900">
												Booking Details
											</h3>
											<div className="space-y-3">
												<div className="flex items-center space-x-2">
													<input
														type="checkbox"
														id="show_adults"
														checked={formPreferences?.show_adults ?? true}
														onChange={(e) =>
															updateFormPreferences({
																show_adults: e.target.checked,
															})
														}
														className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
													/>
													<label htmlFor="show_adults" className="text-sm">
														Number of Adults
													</label>
												</div>
												<div className="flex items-center space-x-2">
													<input
														type="checkbox"
														id="show_children"
														checked={formPreferences?.show_children ?? true}
														onChange={(e) =>
															updateFormPreferences({
																show_children: e.target.checked,
															})
														}
														className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
													/>
													<label htmlFor="show_children" className="text-sm">
														Number of Children
													</label>
												</div>
												<div className="flex items-center space-x-2">
													<input
														type="checkbox"
														id="show_arrival_time"
														checked={
															formPreferences?.show_arrival_time ?? false
														}
														onChange={(e) =>
															updateFormPreferences({
																show_arrival_time: e.target.checked,
															})
														}
														className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
													/>
													<label
														htmlFor="show_arrival_time"
														className="text-sm"
													>
														Arrival Time
													</label>
												</div>
												<div className="flex items-center space-x-2">
													<input
														type="checkbox"
														id="show_special_requests"
														checked={
															formPreferences?.show_special_requests ?? true
														}
														onChange={(e) =>
															updateFormPreferences({
																show_special_requests: e.target.checked,
															})
														}
														className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
													/>
													<label
														htmlFor="show_special_requests"
														className="text-sm"
													>
														Special Requests
													</label>
												</div>
											</div>
										</div>

										{/* Financial & Commission Fields */}
										<div className="space-y-4">
											<h3 className="font-medium text-sm text-gray-900">
												Financial & Commission
											</h3>
											<div className="space-y-3">
												<div className="flex items-center space-x-2">
													<input
														type="checkbox"
														id="show_advance_amount"
														checked={
															formPreferences?.show_advance_amount ?? true
														}
														onChange={(e) =>
															updateFormPreferences({
																show_advance_amount: e.target.checked,
															})
														}
														className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
													/>
													<label
														htmlFor="show_advance_amount"
														className="text-sm"
													>
														Advance Amount
													</label>
												</div>
												<div className="flex items-center space-x-2">
													<input
														type="checkbox"
														id="show_paid_amount"
														checked={formPreferences?.show_paid_amount ?? true}
														onChange={(e) =>
															updateFormPreferences({
																show_paid_amount: e.target.checked,
															})
														}
														className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
													/>
													<label htmlFor="show_paid_amount" className="text-sm">
														Paid Amount
													</label>
												</div>
												<div className="flex items-center space-x-2">
													<input
														type="checkbox"
														id="show_guide"
														checked={formPreferences?.show_guide ?? true}
														onChange={(e) =>
															updateFormPreferences({
																show_guide: e.target.checked,
															})
														}
														className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
													/>
													<label htmlFor="show_guide" className="text-sm">
														Guide Selection
													</label>
												</div>
												<div className="flex items-center space-x-2">
													<input
														type="checkbox"
														id="show_agent"
														checked={formPreferences?.show_agent ?? true}
														onChange={(e) =>
															updateFormPreferences({
																show_agent: e.target.checked,
															})
														}
														className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
													/>
													<label htmlFor="show_agent" className="text-sm">
														Agent Selection
													</label>
												</div>
												<div className="flex items-center space-x-2">
													<input
														type="checkbox"
														id="show_booking_source"
														checked={
															formPreferences?.show_booking_source ?? false
														}
														onChange={(e) =>
															updateFormPreferences({
																show_booking_source: e.target.checked,
															})
														}
														className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
													/>
													<label
														htmlFor="show_booking_source"
														className="text-sm"
													>
														Booking Source
													</label>
												</div>
												<div className="flex items-center space-x-2">
													<input
														type="checkbox"
														id="show_id_photos"
														checked={formPreferences?.show_id_photos ?? false}
														onChange={(e) =>
															updateFormPreferences({
																show_id_photos: e.target.checked,
															})
														}
														className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
													/>
													<label htmlFor="show_id_photos" className="text-sm">
														ID Photo Upload
													</label>
												</div>
												<div className="flex items-center space-x-2">
													<input
														type="checkbox"
														id="show_guest_signature"
														checked={
															formPreferences?.show_guest_signature ?? false
														}
														onChange={(e) =>
															updateFormPreferences({
																show_guest_signature: e.target.checked,
															})
														}
														className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
													/>
													<label
														htmlFor="show_guest_signature"
														className="text-sm"
													>
														Guest Signature
													</label>
												</div>
											</div>
										</div>
									</div>

									<div className="mt-6 p-4 bg-blue-50 rounded-lg">
										<p className="text-sm text-blue-800">
											<strong>Note:</strong> Required fields like Guest Name,
											Room, Check-in/Check-out dates, and Room Rate are always
											visible and cannot be hidden.
										</p>
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="locations">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<MapPin className="h-5 w-5" />
								Location Management
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-6">
								{/* Add New Location Form */}
								{!isEditingLocation && (
									<div className="border rounded-lg p-4 bg-gray-50">
										<h3 className="font-medium mb-4">Add New Location</h3>
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div>
												<Label htmlFor="newLocationName">Location Name</Label>
												<Input
													id="newLocationName"
													value={locationForm.name}
													onChange={(e) =>
														setLocationForm((prev) => ({
															...prev,
															name: e.target.value,
														}))
													}
													placeholder="Enter location name"
												/>
											</div>
											<div>
												<Label htmlFor="newLocationAddress">Address</Label>
												<Input
													id="newLocationAddress"
													value={locationForm.address}
													onChange={(e) =>
														setLocationForm((prev) => ({
															...prev,
															address: e.target.value,
														}))
													}
													placeholder="Enter location address"
												/>
											</div>
											<div>
												<Label htmlFor="newLocationPhone">Phone</Label>
												<PhoneInput
													defaultCountry="LK"
													international
													value={locationForm.phone}
													onChange={(value) =>
														setLocationForm((prev) => ({
															...prev,
															phone: value,
														}))
													}
													placeholder="Enter location phone"
												/>
											</div>
											<div>
												<Label htmlFor="newLocationEmail">Email</Label>
												<Input
													id="newLocationEmail"
													type="email"
													value={locationForm.email}
													onChange={(e) =>
														setLocationForm((prev) => ({
															...prev,
															email: e.target.value,
														}))
													}
													placeholder="Enter location email"
												/>
											</div>
										</div>
										<Button
											onClick={handleAddNewLocation}
											className="mt-4"
											disabled={!locationForm.name.trim()}
										>
											Add Location
										</Button>
									</div>
								)}

								{/* Existing Locations */}
								<div>
									<h3 className="font-medium mb-4">Existing Locations</h3>
									<div className="space-y-4">
										{locations.map((location) => (
											<div key={location.id} className="border rounded-lg p-4">
												{editingLocationId === location.id &&
												isEditingLocation ? (
													<div className="space-y-4">
														<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
															<div>
																<Label htmlFor="editLocationName">
																	Location Name
																</Label>
																<Input
																	id="editLocationName"
																	value={locationForm.name}
																	onChange={(e) =>
																		setLocationForm((prev) => ({
																			...prev,
																			name: e.target.value,
																		}))
																	}
																	placeholder="Enter location name"
																/>
															</div>
															<div>
																<Label htmlFor="editLocationAddress">
																	Address
																</Label>
																<Input
																	id="editLocationAddress"
																	value={locationForm.address}
																	onChange={(e) =>
																		setLocationForm((prev) => ({
																			...prev,
																			address: e.target.value,
																		}))
																	}
																	placeholder="Enter location address"
																/>
															</div>
															<div>
																<Label htmlFor="editLocationPhone">Phone</Label>
																<PhoneInput
																	defaultCountry="LK"
																	international
																	value={locationForm.phone}
																	onChange={(value) =>
																		setLocationForm((prev) => ({
																			...prev,
																			phone: value,
																		}))
																	}
																	placeholder="Enter location phone"
																/>
															</div>
															<div>
																<Label htmlFor="editLocationEmail">Email</Label>
																<Input
																	id="editLocationEmail"
																	type="email"
																	value={locationForm.email}
																	onChange={(e) =>
																		setLocationForm((prev) => ({
																			...prev,
																			email: e.target.value,
																		}))
																	}
																	placeholder="Enter location email"
																/>
															</div>
														</div>
														<div className="flex gap-2">
															<Button
																onClick={handleLocationSave}
																className="flex items-center gap-2"
															>
																<Save className="h-4 w-4" />
																Save Changes
															</Button>
															<Button
																variant="outline"
																onClick={handleLocationCancel}
															>
																Cancel
															</Button>
														</div>
													</div>
												) : (
													<div className="flex items-center justify-between">
														<div>
															<h4 className="font-medium">{location.name}</h4>
															<p className="text-sm text-gray-500">
																{location.is_active ? "Active" : "Inactive"}
															</p>
														</div>
														<Button
															variant="outline"
															size="sm"
															onClick={() => handleLocationEdit(location)}
															className="flex items-center gap-2"
														>
															<Edit className="h-4 w-4" />
															Edit
														</Button>
													</div>
												)}
											</div>
										))}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="expenses">
					<Card>
						<CardHeader>
							<CardTitle>Expense Categories</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									<div>
										<Label htmlFor="mainType">Main Type</Label>
										<Input
											id="mainType"
											value={newMainType}
											onChange={(e) => setNewMainType(e.target.value)}
											placeholder="e.g., Utilities"
										/>
									</div>
									<div>
										<Label htmlFor="subType">Sub Type</Label>
										<Input
											id="subType"
											value={newSubType}
											onChange={(e) => setNewSubType(e.target.value)}
											placeholder="e.g., Electricity"
										/>
									</div>
									<div className="flex items-end">
										<Button onClick={addExpenseType} className="w-full">
											Add Expense Type
										</Button>
									</div>
								</div>

								<div className="space-y-2 max-h-96 overflow-y-auto">
									{expenseTypes.map((type) => (
										<div
											key={type.id}
											className="flex items-center justify-between p-3 border rounded-lg group hover:bg-gray-50"
										>
											<div className="flex-1">
												<div className="font-medium">{type.main_type}</div>
												<div className="text-sm text-muted-foreground">
													{type.sub_type}
												</div>
											</div>
											<Button
												variant="destructive"
												size="sm"
												onClick={() => deleteExpenseType(type.id)}
												className="opacity-0 group-hover:opacity-100 transition-opacity"
											>
												<Trash2 className="size-4" />
											</Button>
										</div>
									))}
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="income">
					<Card>
						<CardHeader>
							<CardTitle>Income Types</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<Label htmlFor="incomeType">Income Type</Label>
										<Input
											id="incomeType"
											value={newIncomeType}
											onChange={(e) => setNewIncomeType(e.target.value)}
											placeholder="e.g., Booking, Food, Laundry"
										/>
									</div>
									<div className="flex items-end">
										<Button onClick={addIncomeType} className="w-full">
											Add Income Type
										</Button>
									</div>
								</div>

								<div className="space-y-2 max-h-96 overflow-y-auto">
									{incomeTypes.map((type) => (
										<div
											key={type.id}
											className="flex items-center justify-between p-3 border rounded-lg group hover:bg-gray-50"
										>
											<div className="flex-1">
												<div className="font-medium">{type.type_name}</div>
											</div>
											<Button
												variant="destructive"
												size="sm"
												onClick={() => deleteIncomeType(type.id)}
												className="opacity-0 group-hover:opacity-100 transition-opacity"
											>
												<Trash2 className="size-4" />
											</Button>
										</div>
									))}
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="currency">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<DollarSign className="size-5 text-primary" />
								Currency Management
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-6">
								<div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
									<h3 className="font-medium text-blue-800 mb-2">
										USD-Based Currency System
									</h3>
									<p className="text-sm text-blue-700 mb-4">
										All currency conversions are based on USD exchange rates.
										Add custom currencies with their USD rates for automatic
										cross-currency conversions.
									</p>
								</div>

								{/* Add New Currency */}
								<Card>
									<CardHeader>
										<CardTitle className="text-lg">
											Add Custom Currency
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
											<div className="space-y-2">
												<Label htmlFor="newCurrencyCode">Currency Code</Label>
												<Input
													id="newCurrencyCode"
													value={newCurrencyCode}
													onChange={(e) =>
														setNewCurrencyCode(e.target.value.toUpperCase())
													}
													placeholder="e.g. LKR, EUR, GBP"
													maxLength={5}
													className="uppercase"
												/>
												<p className="text-xs text-muted-foreground">
													3-5 uppercase letters
												</p>
											</div>
											<div className="space-y-2">
												<Label htmlFor="newCurrencyRate">USD Rate</Label>
												<Input
													id="newCurrencyRate"
													type="number"
													step="0.001"
													min="0.001"
													value={newCurrencyRate}
													onChange={(e) =>
														setNewCurrencyRate(Number(e.target.value))
													}
													placeholder="e.g. 300.50"
												/>
												<p className="text-xs text-muted-foreground">
													1 USD = {newCurrencyRate} {newCurrencyCode || "XXX"}
												</p>
											</div>
											<div className="flex gap-2">
												<Button
													onClick={addCurrency}
													disabled={
														isAddingCurrency ||
														!newCurrencyCode.trim() ||
														newCurrencyRate <= 0
													}
													className="flex-1"
												>
													{isAddingCurrency ? "Adding..." : "Add Currency"}
												</Button>
												{newCurrencyCode && (
													<Button
														type="button"
														variant="outline"
														size="sm"
														onClick={() =>
															window.open(
																getCurrencyConversionSearchUrl(newCurrencyCode),
																"_blank",
															)
														}
														title={`Search USD to ${newCurrencyCode} conversion rate`}
													>
														Search Rate
													</Button>
												)}
											</div>
										</div>
									</CardContent>
								</Card>

								{/* Current Currencies */}
								<Card>
									<CardHeader>
										<CardTitle className="text-lg">
											Current Currencies
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="space-y-4">
											{currencyRates.length === 0 ? (
												<p className="text-muted-foreground text-center py-8">
													No currencies found. Add a custom currency to get
													started.
												</p>
											) : (
												currencyRates.map((currency) => (
													<div
														key={currency.currency_code}
														className="flex items-center justify-between p-4 border rounded-lg"
													>
														<div className="flex items-center gap-4">
															<div className="font-medium text-lg">
																{currency.currency_code}
															</div>
															<div className="text-sm text-muted-foreground">
																{currency.currency_code === "USD"
																	? "US Dollar (Base Currency)"
																	: currency.is_custom
																		? "Custom Currency"
																		: currency.currency_code}
															</div>
														</div>
														<div className="flex items-center gap-4">
															<div className="text-right">
																<div className="font-medium">
																	1 USD = {currency.usd_rate}
																</div>
																<div className="text-xs text-muted-foreground">
																	Last updated:{" "}
																	{new Date(
																		currency.updated_at,
																	).toLocaleDateString()}
																</div>
															</div>
															<div className="flex gap-2">
																{currency.currency_code !== "USD" && (
																	<>
																		<Button
																			variant="outline"
																			size="sm"
																			onClick={() => {
																				const newRate = prompt(
																					`Enter new USD rate for ${currency.currency_code}:`,
																					currency.usd_rate.toString(),
																				);
																				if (newRate && Number(newRate) > 0) {
																					updateCurrency(
																						currency.currency_code,
																						Number(newRate),
																					);
																				}
																			}}
																		>
																			<Edit className="size-4" />
																		</Button>
																		<Button
																			variant="outline"
																			size="sm"
																			onClick={() =>
																				window.open(
																					getCurrencyConversionSearchUrl(
																						currency.currency_code,
																					),
																					"_blank",
																				)
																			}
																			title={`Search USD to ${currency.currency_code} conversion rate`}
																		>
																			Search
																		</Button>
																		{currency.is_custom && (
																			<Button
																				variant="outline"
																				size="sm"
																				onClick={() => {
																					setCurrencyToDelete(
																						currency.currency_code,
																					);
																					setDeleteCurrencyConfirmOpen(true);
																				}}
																			>
																				<Trash2 className="size-4" />
																			</Button>
																		)}
																	</>
																)}
															</div>
														</div>
													</div>
												))
											)}
										</div>
									</CardContent>
								</Card>

								<div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
									<h4 className="font-medium text-amber-800 mb-2">
										Important Notes
									</h4>
									<ul className="text-sm text-amber-700 space-y-1">
										<li>
											• USD is the base currency and cannot be modified or
											deleted
										</li>
										<li>
											• All currency conversions are calculated via USD rates
										</li>
										<li>
											• Use the "Search Rate" button to find current exchange
											rates on Google
										</li>
										<li>
											• Custom currencies can be edited or deleted anytime
										</li>
										<li>
											• Changes apply to all reports and calculations
											immediately
										</li>
									</ul>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="bookings">
					<Card>
						<CardHeader>
							<CardTitle>Booking Management</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								<div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
									<h3 className="font-medium text-yellow-800 mb-2">
										Clear All Bookings
									</h3>
									<p className="text-sm text-yellow-700 mb-4">
										This will permanently delete all bookings for the selected
										location. Use this before re-syncing from iCal to avoid
										duplicates.
									</p>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<Label htmlFor="location">Select Location</Label>
											<Select
												value={selectedLocationId}
												onValueChange={setSelectedLocationId}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select location to clear" />
												</SelectTrigger>
												<SelectContent>
													{locations.map((location) => (
														<SelectItem key={location.id} value={location.id}>
															{location.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</div>
										<div className="flex items-end">
											<Button
												onClick={clearLocationBookings}
												variant="destructive"
												className="w-full"
												disabled={!selectedLocationId}
											>
												<Trash2 className="size-4 mr-2" />
												Clear All Bookings
											</Button>
										</div>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Delete Expense Type Confirmation */}
			<AlertDialog
				open={deleteExpenseConfirmOpen}
				onOpenChange={setDeleteExpenseConfirmOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Expense Type</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this expense type? This action
							cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDeleteExpenseType}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Delete Income Type Confirmation */}
			<AlertDialog
				open={deleteIncomeConfirmOpen}
				onOpenChange={setDeleteIncomeConfirmOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Income Type</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this income type? This action
							cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDeleteIncomeType}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Clear Bookings Confirmation */}
			<AlertDialog
				open={clearBookingsConfirmOpen}
				onOpenChange={setClearBookingsConfirmOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Clear All Bookings</AlertDialogTitle>
						<AlertDialogDescription>
							{selectedLocationId &&
								locations.find((l) => l.id === selectedLocationId) && (
									<>
										Are you sure you want to clear ALL bookings for{" "}
										<strong>
											{locations.find((l) => l.id === selectedLocationId)?.name}
										</strong>
										? This action cannot be undone.
									</>
								)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmClearBookings}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Clear All Bookings
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Delete Currency Confirmation */}
			<AlertDialog
				open={deleteCurrencyConfirmOpen}
				onOpenChange={setDeleteCurrencyConfirmOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Currency</AlertDialogTitle>
						<AlertDialogDescription>
							{currencyToDelete && (
								<>
									Are you sure you want to delete{" "}
									<strong>{currencyToDelete}</strong>? This action cannot be
									undone.
								</>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDeleteCurrency}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
