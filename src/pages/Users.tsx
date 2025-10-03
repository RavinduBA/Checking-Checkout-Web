import { useState } from "react";
import { UsersSkeleton } from "@/components/UsersSkeleton";
import { Button } from "@/components/ui/button";
import {
	UsersList,
	PermissionMatrix,
	UserStats,
	InviteMemberDialog,
	EditUserDialog,
	useUsers,
	type User,
} from "@/components/users";
import { useAuth } from "@/context/AuthContext";
import { useLocationContext } from "@/context/LocationContext";
import { usePermissions } from "@/hooks/usePermissions";

export default function Users() {
	const [showInviteDialog, setShowInviteDialog] = useState(false);
	const [editingUser, setEditingUser] = useState<User | null>(null);
	const [showEditUser, setShowEditUser] = useState(false);
	const { user: currentUser, tenant } = useAuth();
	const { hasPermission } = usePermissions();
	const { locations } = useLocationContext();
	const { loading } = useUsers();

	const handleEditUser = (user: User) => {
		setEditingUser({ ...user });
		setShowEditUser(true);
	};

	const handleInviteSuccess = () => {
		// The components will refresh their own data
		setShowInviteDialog(false);
	};

	const handleEditSuccess = () => {
		// The components will refresh their own data
		setShowEditUser(false);
		setEditingUser(null);
	};

	if (loading) {
		return <UsersSkeleton />;
	}

	return (
		<div className="w-full pb-20 sm:pb-8 px-4 sm:px-6 mx-auto space-y-6 animate-fade-in">
			{/* Header */}
			<div className="flex justify-between items-center pt-8">
				<h1 className="text-2xl font-bold">Users</h1>
				{hasPermission("access_users") && (
					<Button onClick={() => setShowInviteDialog(true)}>
						Invite Member
					</Button>
				)}
			</div>

			{/* User Statistics */}
			<UserStats />

			{/* Users List */}
			<UsersList onEditUser={handleEditUser} />

			{/* Permission Matrix */}
			<PermissionMatrix onEditUser={handleEditUser} />

			{/* Invite Member Dialog */}
			<InviteMemberDialog
				open={showInviteDialog}
				onOpenChange={setShowInviteDialog}
				locations={locations}
				tenant={tenant}
				currentUserId={currentUser?.id}
				onInviteSuccess={handleInviteSuccess}
			/>

			{/* Edit User Dialog */}
			<EditUserDialog
				open={showEditUser}
				onOpenChange={setShowEditUser}
				user={editingUser}
				locations={locations}
				tenant={tenant}
				onEditSuccess={handleEditSuccess}
			/>
		</div>
	);
}