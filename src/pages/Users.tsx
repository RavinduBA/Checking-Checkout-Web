import { Edit, Shield, Trash2, User, UserCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { UsersSkeleton } from "@/components/UsersSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionLoader } from "@/components/ui/loading-spinner";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { useLocationContext } from "@/context/LocationContext";
import { toast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";

interface UserPermissions {
	[key: string]: boolean;
}

interface User {
	id: string;
	name: string;
	email: string;
	is_tenant_admin: boolean;
	permissions: {
		[locationName: string]: UserPermissions;
	};
}

interface Location {
	id: string;
	name: string;
}

const permissionTypes = [
	{ key: "dashboard", label: "Dashboard Access" },
	{ key: "income", label: "Income Management" },
	{ key: "expenses", label: "Expense Management" },
	{ key: "reports", label: "Reports & Analytics" },
	{ key: "calendar", label: "Calendar Access" },
	{ key: "bookings", label: "Booking Management" },
	{ key: "rooms", label: "Room Management" },
	{ key: "master_files", label: "Master Files" },
	{ key: "accounts", label: "Account Management" },
	{ key: "users", label: "User Management" },
	{ key: "settings", label: "Settings Access" },
	{ key: "booking_channels", label: "Booking Channels" },
];

export default function Users() {
	const [users, setUsers] = useState<User[]>([]);
	const [showInviteDialog, setShowInviteDialog] = useState(false);
	const [loading, setLoading] = useState(true);
	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteLocationId, setInviteLocationId] = useState("");
	const [invitePermissions, setInvitePermissions] = useState({
		access_dashboard: true,
		access_income: false,
		access_expenses: false,
		access_reports: false,
		access_calendar: true,
		access_bookings: true,
		access_rooms: false,
		access_master_files: false,
		access_accounts: false,
		access_users: false,
		access_settings: false,
		access_booking_channels: false,
	});
	const [inviteLoading, setInviteLoading] = useState(false);
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [showEditUser, setShowEditUser] = useState(false);
	const { user: currentUser, tenant } = useAuth();
	const { hasPermission } = usePermissions();
	const { selectedLocation, getSelectedLocationData, locations } =
		useLocationContext();

	const fetchData = useCallback(async () => {
		if (!tenant?.id) {
			setLoading(false);
			return;
		}

		try {
			setLoading(true);

			// Fetch users with permissions for the current tenant
			const { data: tenantPermissions, error: permissionsError } =
				await supabase
					.from("user_permissions")
					.select(`
					user_id,
					location_id,
					access_dashboard,
					access_income,
					access_expenses,
					access_reports,
					access_calendar,
					access_bookings,
					access_rooms,
					access_master_files,
					access_accounts,
					access_users,
					access_settings,
					access_booking_channels,
					profiles!inner(id, name, email, tenant_id, is_tenant_admin, created_at),
					locations!inner(id, name, is_active)
				`)
					.eq("tenant_id", tenant.id)
					.eq("locations.is_active", true);

			if (permissionsError) throw permissionsError;

			// Group permissions by user and filter by selected location if needed
			const userPermissionsMap = new Map<string, any>();

			(tenantPermissions || []).forEach((perm: any) => {
				const userId = perm.user_id;
				const profile = perm.profiles;
				const location = perm.locations;

				// If a specific location is selected, only show users with access to that location
				if (selectedLocation !== "all" && location.id !== selectedLocation) {
					return;
				}

				if (!userPermissionsMap.has(userId)) {
					userPermissionsMap.set(userId, {
						...profile,
						permissions: {},
						is_tenant_admin: profile.is_tenant_admin || false,
					});
				}

				const userRecord = userPermissionsMap.get(userId);
				userRecord.permissions[location.name] = {
					dashboard: perm.access_dashboard || false,
					income: perm.access_income || false,
					expenses: perm.access_expenses || false,
					reports: perm.access_reports || false,
					calendar: perm.access_calendar || false,
					bookings: perm.access_bookings || false,
					rooms: perm.access_rooms || false,
					master_files: perm.access_master_files || false,
					accounts: perm.access_accounts || false,
					users: perm.access_users || false,
					settings: perm.access_settings || false,
					booking_channels: perm.access_booking_channels || false,
				};
			});

			const usersWithPermissions = Array.from(userPermissionsMap.values());
			setUsers(usersWithPermissions);
		} catch (error: any) {
			console.error("Error fetching data:", error);
			toast({
				title: "Error",
				description: error.message || "Failed to fetch data",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [tenant?.id, selectedLocation]);

	// Invitation handlers
	const handleInviteMember = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!tenant?.id || !inviteEmail.trim() || !currentUser?.id) return;

		if (!inviteLocationId) {
			toast({
				title: "Location Required",
				description: "Please select a location to invite the user to",
				variant: "destructive",
			});
			return;
		}

		const locationData = locations.find((loc) => loc.id === inviteLocationId);
		if (!locationData) {
			toast({
				title: "Invalid Location",
				description: "Selected location not found",
				variant: "destructive",
			});
			return;
		}

		try {
			setInviteLoading(true);

			const { data: result, error } = await supabase.rpc(
				"create_user_invitation",
				{
					p_email: inviteEmail.trim().toLowerCase(),
					p_tenant_id: tenant.id,
				},
			);

			if (error) throw error;

			console.log("Invitation result:", result);

			toast({
				title: "Invitation Sent",
				description: "Invitation sent and login credentials have been emailed",
			});

			// Reset form
			setInviteEmail("");
			setInviteLocationId("");
			setInvitePermissions({
				access_dashboard: true,
				access_income: false,
				access_expenses: false,
				access_reports: false,
				access_calendar: true,
				access_bookings: true,
				access_rooms: false,
				access_master_files: false,
				access_accounts: false,
				access_users: false,
				access_settings: false,
				access_booking_channels: false,
			});
			setShowInviteDialog(false);

			// Refresh data
			await fetchData();
		} catch (error: any) {
			console.error("Error inviting member:", error);

			let errorMessage = "Failed to send invitation";
			if (error.message) {
				if (error.message.includes("already has access")) {
					errorMessage = "User already has access to this location";
				} else if (error.message.includes("rate limit")) {
					errorMessage = "Too many invitations sent. Please try again later.";
				} else {
					errorMessage = error.message;
				}
			}

			toast({
				title: "Error",
				description: errorMessage,
				variant: "destructive",
			});
		} finally {
			setInviteLoading(false);
		}
	};

	const handleEditUser = (user: User) => {
		setEditingUser({ ...user });
		setShowEditUser(true);
	};

	const handleDeleteUser = async (userId: string) => {
		if (!tenant?.id) return;

		if (
			!confirm(
				"Are you sure you want to remove this user's access? This action cannot be undone.",
			)
		) {
			return;
		}

		try {
			const { error } = await supabase
				.from("user_permissions")
				.delete()
				.eq("user_id", userId)
				.eq("tenant_id", tenant.id);

			if (error) throw error;

			await fetchData();
			toast({
				title: "User Removed",
				description: "User access has been removed successfully.",
			});
		} catch (error: any) {
			console.error("Error removing user:", error);
			toast({
				title: "Error",
				description: error.message || "Failed to remove user",
				variant: "destructive",
			});
		}
	};

	const updateEditUserPermission = (
		locationName: string,
		permissionKey: string,
		value: boolean,
	) => {
		if (!editingUser) return;

		setEditingUser({
			...editingUser,
			permissions: {
				...editingUser.permissions,
				[locationName]: {
					...editingUser.permissions[locationName],
					[permissionKey]: value,
				},
			},
		});
	};

	const handleSaveEditUser = async () => {
		if (!editingUser || !tenant?.id) return;

		try {
			// Update user basic info if needed (name, etc.)
			const { error: profileError } = await supabase
				.from("profiles")
				.update({
					name: editingUser.name,
				})
				.eq("id", editingUser.id);

			if (profileError) throw profileError;

			// Update permissions for each location
			for (const [locationName, permissions] of Object.entries(
				editingUser.permissions,
			)) {
				const location = locations.find((loc) => loc.name === locationName);
				if (!location) continue;

				const { error: permissionError } = await supabase
					.from("user_permissions")
					.update({
						access_dashboard: permissions.dashboard || false,
						access_income: permissions.income || false,
						access_expenses: permissions.expenses || false,
						access_reports: permissions.reports || false,
						access_calendar: permissions.calendar || false,
						access_bookings: permissions.bookings || false,
						access_rooms: permissions.rooms || false,
						access_master_files: permissions.master_files || false,
						access_accounts: permissions.accounts || false,
						access_users: permissions.users || false,
						access_settings: permissions.settings || false,
						access_booking_channels: permissions.booking_channels || false,
					})
					.eq("user_id", editingUser.id)
					.eq("location_id", location.id)
					.eq("tenant_id", tenant.id);

				if (permissionError) throw permissionError;
			}

			setShowEditUser(false);
			setEditingUser(null);
			await fetchData();

			toast({
				title: "User Updated",
				description: `${editingUser.name}'s permissions have been updated.`,
			});
		} catch (error: any) {
			console.error("Error updating user:", error);
			toast({
				title: "Error",
				description: error.message || "Failed to update user",
				variant: "destructive",
			});
		}
	};

	// Load data on component mount and when dependencies change
	useEffect(() => {
		fetchData();
	}, [fetchData]);

	if (loading) {
		return <UsersSkeleton />;
	}

	return (
		<div className="w-full pb-20 sm:pb-8 px-4 sm:px-6 mx-auto space-y-6 animate-fade-in ">
			{/* Header */}
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">Users</h1>
				{hasPermission("access_users") && (
					<Button onClick={() => setShowInviteDialog(true)}>
						Invite Member
					</Button>
				)}
			</div>

			{/* Team Members Table */}
			<Card>
				<CardHeader>
					<CardTitle>Team Members</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>User</TableHead>
								<TableHead className="hidden sm:table-cell">Email</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="hidden md:table-cell">
									Last Active
								</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{users.map((user) => (
								<TableRow key={user.id}>
									<TableCell>
										<div className="flex items-center gap-3">
											<div className="p-2 bg-primary/10 rounded-full">
												<User className="size-4 text-primary" />
											</div>
											<div>
												<div className="font-medium">{user.name}</div>
												<div className="text-sm text-muted-foreground sm:hidden">
													{user.email}
												</div>
											</div>
										</div>
									</TableCell>
									<TableCell className="hidden sm:table-cell">
										{user.email}
									</TableCell>
									<TableCell>
										<Badge
											variant={user.is_tenant_admin ? "default" : "secondary"}
											className="flex items-center gap-1 w-fit"
										>
											{user.is_tenant_admin ? (
												<>
													<Shield className="h-3 w-3" />
													Administrator
												</>
											) : (
												<>
													<UserCheck className="h-3 w-3" />
													User
												</>
											)}
										</Badge>
									</TableCell>
									<TableCell>
										<Badge variant="outline" className="w-fit">
											Active
										</Badge>
									</TableCell>
									<TableCell className="text-sm text-muted-foreground hidden md:table-cell">
										Recently
									</TableCell>
									<TableCell>
										<div className="flex gap-1">
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleEditUser(user)}
											>
												<Edit className="size-4" />
											</Button>
											{user.id !== currentUser?.id && (
												<Button
													variant="ghost"
													size="sm"
													onClick={() => handleDeleteUser(user.id)}
												>
													<Trash2 className="size-4" />
												</Button>
											)}
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* Permission Matrix */}
			<Card>
				<CardHeader>
					<CardTitle>Permission Matrix</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{users.map((user) => (
							<div key={user.id} className="p-4 border rounded-lg">
								<div className="flex items-center gap-3 mb-3">
									<div className="p-1 bg-primary/10 rounded-full">
										<User className="size-4 text-primary" />
									</div>
									<div className="font-medium">{user.name}</div>
									<Badge
										variant={user.is_tenant_admin ? "default" : "secondary"}
										className="ml-auto"
									>
										{user.is_tenant_admin ? "Admin" : "User"}
									</Badge>
								</div>

								{Object.keys(user.permissions).length > 0 ? (
									Object.entries(user.permissions).map(([location, perms]) => (
										<div key={location} className="mb-4">
											<h5 className="font-medium text-sm text-primary mb-2">
												{location}
											</h5>
											<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
												{permissionTypes.map((permType) => (
													<div
														key={permType.key}
														className="flex items-center gap-2"
													>
														<Checkbox
															checked={!!perms[permType.key]}
															disabled
															className="h-4 w-4"
														/>
														<span className="text-sm">{permType.label}</span>
													</div>
												))}
											</div>
										</div>
									))
								) : (
									<div className="text-sm text-muted-foreground bg-muted p-3 rounded">
										No permissions configured for active locations.
										<Button
											variant="link"
											size="sm"
											className="p-0 ml-1 h-auto"
											onClick={() => handleEditUser(user)}
										>
											Click here to set up permissions.
										</Button>
									</div>
								)}
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card className="bg-card border">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Total Users</p>
								<p className="text-lg sm:text-2xl font-bold">{users.length}</p>
							</div>
							<User className="size-5 text-primary" />
						</div>
					</CardContent>
				</Card>

				<Card className="bg-card border">
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Administrators</p>
								<p className="text-lg sm:text-2xl font-bold">
									{users.filter((u) => u.is_tenant_admin).length}
								</p>
							</div>
							<Shield className="size-5 text-primary" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Invite Member Dialog */}
			<Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Invite Member</DialogTitle>
						<DialogDescription>
							Send an invitation to join your organization at a specific
							location.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleInviteMember} className="space-y-4">
						<div>
							<Label htmlFor="inviteEmail">Email Address</Label>
							<Input
								id="inviteEmail"
								type="email"
								placeholder="Enter email address"
								value={inviteEmail}
								onChange={(e) => setInviteEmail(e.target.value)}
								required
							/>
						</div>
						<div>
							<Label htmlFor="inviteLocation">Location</Label>
							<Select
								value={inviteLocationId}
								onValueChange={setInviteLocationId}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select location" />
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

						{/* Permissions Section */}
						<div className="space-y-3">
							<Label>Permissions</Label>
							<div className="grid grid-cols-2 gap-2 text-sm">
								<div className="flex items-center space-x-2">
									<Checkbox
										id="access_dashboard"
										checked={invitePermissions.access_dashboard}
										onCheckedChange={(checked) =>
											setInvitePermissions((prev) => ({
												...prev,
												access_dashboard: !!checked,
											}))
										}
									/>
									<Label
										htmlFor="access_dashboard"
										className="text-sm font-normal"
									>
										Dashboard
									</Label>
								</div>
								<div className="flex items-center space-x-2">
									<Checkbox
										id="access_income"
										checked={invitePermissions.access_income}
										onCheckedChange={(checked) =>
											setInvitePermissions((prev) => ({
												...prev,
												access_income: !!checked,
											}))
										}
									/>
									<Label
										htmlFor="access_income"
										className="text-sm font-normal"
									>
										Income
									</Label>
								</div>
								<div className="flex items-center space-x-2">
									<Checkbox
										id="access_expenses"
										checked={invitePermissions.access_expenses}
										onCheckedChange={(checked) =>
											setInvitePermissions((prev) => ({
												...prev,
												access_expenses: !!checked,
											}))
										}
									/>
									<Label
										htmlFor="access_expenses"
										className="text-sm font-normal"
									>
										Expenses
									</Label>
								</div>
								<div className="flex items-center space-x-2">
									<Checkbox
										id="access_reports"
										checked={invitePermissions.access_reports}
										onCheckedChange={(checked) =>
											setInvitePermissions((prev) => ({
												...prev,
												access_reports: !!checked,
											}))
										}
									/>
									<Label
										htmlFor="access_reports"
										className="text-sm font-normal"
									>
										Reports
									</Label>
								</div>
								<div className="flex items-center space-x-2">
									<Checkbox
										id="access_calendar"
										checked={invitePermissions.access_calendar}
										onCheckedChange={(checked) =>
											setInvitePermissions((prev) => ({
												...prev,
												access_calendar: !!checked,
											}))
										}
									/>
									<Label
										htmlFor="access_calendar"
										className="text-sm font-normal"
									>
										Calendar
									</Label>
								</div>
								<div className="flex items-center space-x-2">
									<Checkbox
										id="access_bookings"
										checked={invitePermissions.access_bookings}
										onCheckedChange={(checked) =>
											setInvitePermissions((prev) => ({
												...prev,
												access_bookings: !!checked,
											}))
										}
									/>
									<Label
										htmlFor="access_bookings"
										className="text-sm font-normal"
									>
										Bookings
									</Label>
								</div>
								<div className="flex items-center space-x-2">
									<Checkbox
										id="access_rooms"
										checked={invitePermissions.access_rooms}
										onCheckedChange={(checked) =>
											setInvitePermissions((prev) => ({
												...prev,
												access_rooms: !!checked,
											}))
										}
									/>
									<Label htmlFor="access_rooms" className="text-sm font-normal">
										Rooms
									</Label>
								</div>
								<div className="flex items-center space-x-2">
									<Checkbox
										id="access_master_files"
										checked={invitePermissions.access_master_files}
										onCheckedChange={(checked) =>
											setInvitePermissions((prev) => ({
												...prev,
												access_master_files: !!checked,
											}))
										}
									/>
									<Label
										htmlFor="access_master_files"
										className="text-sm font-normal"
									>
										Master Files
									</Label>
								</div>
								<div className="flex items-center space-x-2">
									<Checkbox
										id="access_accounts"
										checked={invitePermissions.access_accounts}
										onCheckedChange={(checked) =>
											setInvitePermissions((prev) => ({
												...prev,
												access_accounts: !!checked,
											}))
										}
									/>
									<Label
										htmlFor="access_accounts"
										className="text-sm font-normal"
									>
										Accounts
									</Label>
								</div>
								<div className="flex items-center space-x-2">
									<Checkbox
										id="access_users"
										checked={invitePermissions.access_users}
										onCheckedChange={(checked) =>
											setInvitePermissions((prev) => ({
												...prev,
												access_users: !!checked,
											}))
										}
									/>
									<Label htmlFor="access_users" className="text-sm font-normal">
										Users
									</Label>
								</div>
								<div className="flex items-center space-x-2">
									<Checkbox
										id="access_settings"
										checked={invitePermissions.access_settings}
										onCheckedChange={(checked) =>
											setInvitePermissions((prev) => ({
												...prev,
												access_settings: !!checked,
											}))
										}
									/>
									<Label
										htmlFor="access_settings"
										className="text-sm font-normal"
									>
										Settings
									</Label>
								</div>
							</div>
						</div>

						<Button
							type="submit"
							disabled={inviteLoading || !inviteLocationId}
							className={
								!inviteLocationId ? "opacity-50 cursor-not-allowed" : ""
							}
						>
							{inviteLoading
								? "Sending..."
								: !inviteLocationId
									? "Select Location First"
									: "Send Invitation"}
						</Button>
					</form>
				</DialogContent>
			</Dialog>

			{/* Edit User Dialog */}
			<Dialog open={showEditUser} onOpenChange={setShowEditUser}>
				<DialogContent className="max-w-[380px] sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit User Permissions</DialogTitle>
						<DialogDescription>
							Modify user details and configure their permissions for different
							locations and application features.
						</DialogDescription>
					</DialogHeader>
					{editingUser && (
						<div className="space-y-6">
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label>Full Name</Label>
									<Input
										placeholder="John Doe"
										value={editingUser.name}
										onChange={(e) =>
											setEditingUser({
												...editingUser,
												name: e.target.value,
											})
										}
									/>
								</div>

								<div className="space-y-2">
									<Label>Email Address</Label>
									<Input
										type="email"
										value={editingUser.email}
										disabled
										className="bg-muted"
									/>
								</div>
							</div>

							<div className="space-y-4">
								<Label className="text-base font-semibold">
									Location Permissions
								</Label>
								{locations.map((location) => (
									<Card key={location.id} className="p-4">
										<h3 className="font-semibold mb-3">{location.name}</h3>
										<div className="grid grid-cols-2 gap-3">
											{permissionTypes.map((permission) => (
												<div
													key={permission.key}
													className="flex items-center space-x-2"
												>
													<Checkbox
														id={`edit-${location.name}-${permission.key}`}
														checked={
															editingUser.permissions[location.name]?.[
																permission.key as keyof UserPermissions
															] || false
														}
														onCheckedChange={(checked) =>
															updateEditUserPermission(
																location.name,
																permission.key,
																checked as boolean,
															)
														}
													/>
													<Label
														htmlFor={`edit-${location.name}-${permission.key}`}
														className="text-sm font-normal"
													>
														{permission.label}
													</Label>
												</div>
											))}
										</div>
									</Card>
								))}
							</div>

							<div className="flex gap-2">
								<Button
									variant="outline"
									onClick={() => setShowEditUser(false)}
									className="flex-1"
								>
									Cancel
								</Button>
								<Button onClick={handleSaveEditUser} className="flex-1">
									Save Changes
								</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
