import {
	Edit,
	Settings,
	Shield,
	Trash2,
	User,
	UserCheck,
	X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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
	DialogTrigger,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
	createInvitation,
	getInvitations,
	resendInvitation,
	revokeInvitation,
} from "@/lib/invitations";

interface UserPermissions {
	dashboard: boolean;
	income: boolean;
	expenses: boolean;
	reports: boolean;
	calendar: boolean;
	bookings: boolean;
	rooms: boolean;
	master_files: boolean;
	accounts: boolean;
	users: boolean;
	settings: boolean;
	booking_channels: boolean;
	is_admin?: boolean;
}

interface User {
	id: string;
	name: string;
	email: string;
	permissions: Record<string, UserPermissions>;
	tenant_role:
		| "tenant_admin"
		| "tenant_billing"
		| "tenant_manager"
		| "tenant_staff";
	is_tenant_admin: boolean;
	created_at: string;
}

interface Location {
	id: string;
	name: string;
}

type UserInvitation = Database["public"]["Tables"]["user_invitations"]["Row"];

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
	const [locations, setLocations] = useState<Location[]>([]);
	const [invitations, setInvitations] = useState<UserInvitation[]>([]);
	const [showInviteUser, setShowInviteUser] = useState(false);
	const [loading, setLoading] = useState(true);
	const [invitationsLoading, setInvitationsLoading] = useState(false);

	const [inviteEmail, setInviteEmail] = useState("");
	const [inviteRole, setInviteRole] = useState("staff");
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
	const { toast } = useToast();
	const { user: currentUser, tenant } = useAuth();
	const { hasPermission } = usePermissions();

	const fetchInvitations = useCallback(async () => {
		if (!tenant?.id) return;

		try {
			setInvitationsLoading(true);
			const result = await getInvitations(tenant.id);
			if (result.success) {
				setInvitations(result.data || []);
			} else {
				console.error("Error fetching invitations:", result.error);
			}
		} catch (error) {
			console.error("Exception fetching invitations:", error);
		} finally {
			setInvitationsLoading(false);
		}
	}, [tenant?.id, setInvitations, setInvitationsLoading]);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);

			// Fetch users with permissions
			const { data: profilesData, error: profilesError } = await supabase
				.from("profiles")
				.select("*")
				.order("created_at", { ascending: false });

			if (profilesError) throw profilesError;

			console.log("Fetched profiles data:", profilesData);

			// Fetch locations (only active ones)
			const { data: locationsData, error: locationsError } = await supabase
				.from("locations")
				.select("*")
				.eq("is_active", true)
				.order("name");

			if (locationsError) throw locationsError;

			// Get permissions for each user - but only for active locations
			const usersWithPermissions = await Promise.all(
				(profilesData || []).map(async (profile) => {
					try {
						// Get permissions directly from user_permissions table, filtered by active locations
						const { data: userPermsData, error: userPermsError } =
							await supabase
								.from("user_permissions")
								.select(`
                *,
                locations!inner(id, name, is_active)
              `)
								.eq("user_id", profile.id)
								.eq("locations.is_active", true);

						if (userPermsError) {
							console.error("Error fetching user permissions:", userPermsError);
						}

						// Transform permissions data
						const permissions: Record<string, UserPermissions> = {};
						let isUserAdmin = false;
						if (userPermsData) {
							userPermsData.forEach((perm: any) => {
								if (perm.locations) {
									permissions[perm.locations.name] = {
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
										is_admin: perm.is_admin || false,
									};
									// Check if user is admin in any location
									if (perm.is_admin) {
										isUserAdmin = true;
									}
								}
							});
						}

						return {
							...profile,
							permissions,
							tenant_role: (profile as any).tenant_role || "tenant_staff",
							is_tenant_admin: (profile as any).is_tenant_admin || false,
						};
					} catch (error) {
						console.error(
							"Error processing user permissions for",
							profile.email,
							error,
						);
						return {
							...profile,
							permissions: {},
							tenant_role: (profile as any).tenant_role || "tenant_staff",
							is_tenant_admin: (profile as any).is_tenant_admin || false,
						};
					}
				}),
			);

			setUsers(usersWithPermissions);
			console.log("Updated users state:", usersWithPermissions);
			setLocations(locationsData || []);

			// Fetch invitations if tenant exists
			if (tenant?.id) {
				await fetchInvitations();
			}
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
	}, [toast, tenant, fetchInvitations]);

	// Invitation handlers
	const handleInviteMember = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!tenant?.id || !inviteEmail.trim()) return;

		// Check permissions
		if (!hasPermission("access_users")) {
			toast({
				title: "Access Denied",
				description: "You don't have permission to invite users",
				variant: "destructive",
			});
			return;
		}

		try {
			setInviteLoading(true);
			const result = await createInvitation(
				tenant.id,
				inviteEmail,
				inviteRole as any,
				invitePermissions,
			);

			if (result.success) {
				toast({
					title: "Invitation Sent",
					description: `Login credentials have been sent to ${inviteEmail}. They will receive an email with their login details.`,
					duration: 5000,
				});
				setInviteEmail("");
				setInviteRole("staff");
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
				await fetchInvitations();
			} else {
				toast({
					title: "Error",
					description: result.error || "Failed to send invitation",
					variant: "destructive",
				});
			}
		} catch (error: any) {
			toast({
				title: "Error",
				description: error.message || "Failed to send invitation",
				variant: "destructive",
			});
		} finally {
			setInviteLoading(false);
		}
	};

	const handleResendInvitation = async (invitationEmail: string) => {
		try {
			setInviteLoading(true);
			const result = await resendInvitation(invitationEmail);

			if (result.success) {
				toast({
					title: "New Credentials Sent",
					description: `Updated login credentials have been sent to ${invitationEmail}. They will receive an email with their new login details.`,
					duration: 5000,
				});
			} else {
				toast({
					title: "Error",
					description: result.error || "Failed to resend invitation",
					variant: "destructive",
				});
			}
		} catch (error: any) {
			toast({
				title: "Error",
				description: error.message || "Failed to resend invitation",
				variant: "destructive",
			});
		} finally {
			setInviteLoading(false);
		}
	};

	const handleRevokeInvitation = async (invitationId: string) => {
		try {
			setInviteLoading(true);
			const result = await revokeInvitation(invitationId);

			if (result.success) {
				toast({
					title: "Invitation Revoked",
					description: "Invitation has been revoked successfully",
				});
				await fetchInvitations();
			} else {
				toast({
					title: "Error",
					description: result.error || "Failed to revoke invitation",
					variant: "destructive",
				});
			}
		} catch (error: any) {
			toast({
				title: "Error",
				description: error.message || "Failed to revoke invitation",
				variant: "destructive",
			});
		} finally {
			setInviteLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const handleDeleteUser = async (userId: string) => {
		if (
			!confirm(
				"Are you sure you want to delete this user? This action cannot be undone.",
			)
		) {
			return;
		}

		try {
			// Delete user permissions first (foreign key constraint)
			const { error: permError } = await supabase
				.from("user_permissions")
				.delete()
				.eq("user_id", userId);

			if (permError) {
				console.error("Error deleting permissions:", permError);
				// Continue anyway, as permissions might not exist
			}

			// Note: We cannot delete from auth.users table directly
			// Instead, we'll just delete the profile and mark the user as inactive
			const { error: profileError } = await supabase
				.from("profiles")
				.delete()
				.eq("id", userId);

			if (profileError) throw profileError;

			fetchData();

			toast({
				title: "User Deleted",
				description:
					"User profile and permissions have been removed from the system.",
			});
		} catch (error: any) {
			console.error("Error deleting user:", error);
			toast({
				title: "Error",
				description: error.message || "Failed to delete user",
				variant: "destructive",
			});
		}
	};

	const updateEditUserPermission = (
		location: string,
		permission: string,
		checked: boolean,
	) => {
		if (!editingUser) return;

		setEditingUser((prev) => ({
			...prev!,
			permissions: {
				...prev!.permissions,
				[location]: {
					...(prev!.permissions[location] || {
						dashboard: false,
						income: false,
						expenses: false,
						reports: false,
						calendar: false,
						bookings: false,
						rooms: false,
						master_files: false,
						accounts: false,
						users: false,
						settings: false,
						booking_channels: false,
					}),
					[permission]: checked,
				},
			},
		}));
	};

	const handleEditUser = (user: User) => {
		// Initialize permissions for all active locations if user doesn't have any
		const userWithInitializedPermissions = { ...user };

		// Ensure user has permission entries for all active locations
		locations.forEach((location) => {
			if (!userWithInitializedPermissions.permissions[location.name]) {
				userWithInitializedPermissions.permissions[location.name] = {
					dashboard: false,
					income: false,
					expenses: false,
					reports: false,
					calendar: false,
					bookings: false,
					rooms: false,
					master_files: false,
					accounts: false,
					users: false,
					settings: false,
					booking_channels: false,
				};
			}
		});

		setEditingUser(userWithInitializedPermissions);
		setShowEditUser(true);
	};

	const handleSaveEditUser = async () => {
		if (!editingUser) return;

		try {
			console.log(
				"Updating user:",
				editingUser.id,
				"admin status:",
				editingUser.is_tenant_admin,
			);

			// Update profile with name, tenant_role and is_tenant_admin
			const { data: updateResult, error: profileError } = await supabase
				.from("profiles")
				.update({
					name: editingUser.name,
					tenant_role: editingUser.tenant_role,
					is_tenant_admin: editingUser.is_tenant_admin,
				})
				.eq("id", editingUser.id)
				.select();

			console.log("Update result:", updateResult);
			console.log("Profile update error:", profileError);

			if (profileError) {
				console.error("Profile update error:", profileError);
				throw profileError;
			}

			console.log("Profile updated successfully");

			// Delete existing permissions
			const { error: deleteError } = await supabase
				.from("user_permissions")
				.delete()
				.eq("user_id", editingUser.id);

			if (deleteError) {
				console.error("Permission deletion error:", deleteError);
				// Don't throw here as permissions might not exist, just log it
			}

			// Insert new permissions for each location
			const permissionInserts = [];
			for (const location of locations) {
				const locationPerms = editingUser.permissions[location.name];
				if (locationPerms) {
					permissionInserts.push({
						user_id: editingUser.id,
						tenant_id: tenant?.id,
						location_id: location.id,
						access_dashboard: locationPerms.dashboard || false,
						access_income: locationPerms.income || false,
						access_expenses: locationPerms.expenses || false,
						access_reports: locationPerms.reports || false,
						access_calendar: locationPerms.calendar || false,
						access_bookings: locationPerms.bookings || false,
						access_rooms: locationPerms.rooms || false,
						access_master_files: locationPerms.master_files || false,
						access_accounts: locationPerms.accounts || false,
						access_users: locationPerms.users || false,
						access_settings: locationPerms.settings || false,
						access_booking_channels: locationPerms.booking_channels || false,
						tenant_role: editingUser.tenant_role,
						is_tenant_admin: editingUser.is_tenant_admin || false,
					});
				}
			}

			if (permissionInserts.length > 0) {
				const { error: permError } = await supabase
					.from("user_permissions")
					.insert(permissionInserts);

				if (permError) throw permError;
			}

			setShowEditUser(false);
			setEditingUser(null);

			console.log("About to refresh data...");
			await fetchData();
			console.log("Data refreshed");

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

	if (loading) {
		return (
			<div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
				<SectionLoader className="min-h-64" />
			</div>
		);
	}

	return (
		<div className="w-full pb-20 sm:pb-8 px-4 sm:px-0 mx-auto space-y-6 animate-fade-in">
			{/* Action Buttons */}
			<div className="flex items-center justify-end">
				<div className="flex gap-2">
					{/* Edit User Dialog */}
					<Dialog open={showEditUser} onOpenChange={setShowEditUser}>
						<DialogContent className="max-w-[380px] sm:max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
							<DialogHeader>
								<DialogTitle>Edit User Permissions</DialogTitle>
								<DialogDescription>
									Modify user details and configure their permissions for
									different locations and application features.
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

									<div className="space-y-2">
										<Label className="text-sm font-medium">User Role</Label>
										<Select
											value={editingUser.tenant_role}
											onValueChange={(
												value:
													| "tenant_admin"
													| "tenant_billing"
													| "tenant_manager"
													| "tenant_staff",
											) =>
												setEditingUser({
													...editingUser,
													tenant_role: value,
													is_tenant_admin: value === "tenant_admin",
												})
											}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="tenant_admin">
													<div className="flex items-center gap-2">
														<Shield className="h-4 w-4" />
														Tenant Administrator
													</div>
												</SelectItem>
												<SelectItem value="tenant_billing">
													<div className="flex items-center gap-2">
														<Settings className="h-4 w-4" />
														Billing Manager
													</div>
												</SelectItem>
												<SelectItem value="tenant_manager">
													<div className="flex items-center gap-2">
														<UserCheck className="h-4 w-4" />
														Manager
													</div>
												</SelectItem>
												<SelectItem value="tenant_staff">
													<div className="flex items-center gap-2">
														<User className="h-4 w-4" />
														Staff
													</div>
												</SelectItem>
											</SelectContent>
										</Select>
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
																className="text-sm"
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
			</div>

			{/* Invitation Section */}
			<div className="grid gap-6 md:grid-cols-2">
				{/* Invite Member Form */}
				{hasPermission("access_users") ? (
					<Card>
						<CardHeader>
							<CardTitle>Invite Member</CardTitle>
							<CardDescription>
								Send an invitation to join your organization
							</CardDescription>
						</CardHeader>
						<CardContent>
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
									<Label htmlFor="inviteRole">Role</Label>
									<Select value={inviteRole} onValueChange={setInviteRole}>
										<SelectTrigger>
											<SelectValue placeholder="Select role" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="staff">Staff</SelectItem>
											<SelectItem value="manager">Manager</SelectItem>
											<SelectItem value="admin">Admin</SelectItem>
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
											<Label
												htmlFor="access_rooms"
												className="text-sm font-normal"
											>
												Rooms
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
											<Label
												htmlFor="access_users"
												className="text-sm font-normal"
											>
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

								<Button type="submit" disabled={inviteLoading}>
									{inviteLoading ? "Sending..." : "Send Invitation"}
								</Button>
							</form>
						</CardContent>
					</Card>
				) : (
					<Card>
						<CardHeader>
							<CardTitle>Access Denied</CardTitle>
							<CardDescription>
								You don't have permission to invite users
							</CardDescription>
						</CardHeader>
					</Card>
				)}

				{/* Pending Invitations */}
				<Card>
					<CardHeader>
						<CardTitle>Pending Invitations</CardTitle>
						<CardDescription>
							Invitations that have not been accepted yet
						</CardDescription>
					</CardHeader>
					<CardContent>
						{invitationsLoading ? (
							<div className="flex justify-center items-center h-20">
								<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
							</div>
						) : invitations.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No pending invitations
							</p>
						) : (
							<div className="space-y-3">
								{invitations.map((invitation) => (
									<div
										key={invitation.id}
										className="flex items-center justify-between p-3 border rounded-lg"
									>
										<div>
											<p className="font-medium">{invitation.email}</p>
											<p className="text-sm text-muted-foreground">
												Role: {invitation.role} • Sent{" "}
												{new Date(invitation.created_at).toLocaleDateString()}
											</p>
										</div>
										<div className="flex space-x-2">
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleResendInvitation(invitation.email)}
												disabled={inviteLoading}
											>
												Resend
											</Button>
											<Button
												variant="destructive"
												size="sm"
												onClick={() => handleRevokeInvitation(invitation.id)}
												disabled={inviteLoading}
											>
												Revoke
											</Button>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Users List */}
			<div className="space-y-4">
				{users.map((user) => (
					<Card key={user.id} className="bg-card border">
						<CardHeader>
							<div className="flex flex-col sm:flex-row gap-y-2 justify-between items-start">
								<div className="flex items-center gap-3">
									<div className="p-2 bg-primary/10 rounded-full">
										<User className="size-5 text-primary" />
									</div>
									<div>
										<CardTitle className="text-lg">{user.name}</CardTitle>
										<p className="text-sm text-muted-foreground">
											{user.email}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Badge
										variant={user.is_tenant_admin ? "default" : "secondary"}
										className="flex items-center gap-1"
									>
										{user.is_tenant_admin ? (
											<Shield className="h-3 w-3" />
										) : (
											<UserCheck className="h-3 w-3" />
										)}
										{user.tenant_role === "tenant_admin"
											? "Administrator"
											: user.tenant_role === "tenant_billing"
												? "Billing Manager"
												: user.tenant_role === "tenant_manager"
													? "Manager"
													: "Staff"}
									</Badge>
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
							</div>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								<h4 className="font-semibold text-sm">
									Permissions by Location:
								</h4>
								{Object.keys(user.permissions).length > 0 ? (
									Object.entries(user.permissions).map(([location, perms]) => (
										<div key={location} className="space-y-2">
											<h5 className="font-medium text-sm text-primary">
												{location}
											</h5>
											<div className="flex flex-wrap gap-1">
												{Object.entries(perms).map(
													([perm, enabled]) =>
														enabled && (
															<Badge
																key={perm}
																variant="outline"
																className="text-xs rounded-sm"
															>
																{
																	permissionTypes.find((p) => p.key === perm)
																		?.label
																}
															</Badge>
														),
												)}
												{Object.values(perms).every((p) => !p) && (
													<Badge variant="secondary" className="text-xs">
														No permissions assigned
													</Badge>
												)}
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
						</CardContent>
					</Card>
				))}
			</div>

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
		</div>
	);
}
