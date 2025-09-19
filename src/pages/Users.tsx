import { useState, useEffect } from "react";
import { ArrowLeft, Plus, User, Shield, Edit, Trash2, UserCheck, Mail, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { SectionLoader } from "@/components/ui/loading-spinner";

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
}

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff" | "manager";
  permissions: Record<string, UserPermissions>;
  created_at: string;
}

interface Location {
  id: string;
  name: string;
}

interface AllowedEmail {
  id: string;
  email: string;
  is_active: boolean;
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
  { key: "booking_channels", label: "Booking Channels" }
];

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [allowedEmails, setAllowedEmails] = useState<AllowedEmail[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState<{
    name: string;
    email: string;
    role: "admin" | "staff" | "manager";
    permissions: Record<string, UserPermissions>;
  }>({
    name: "",
    email: "",
    role: "staff",
    permissions: {}
  });
  const [newEmail, setNewEmail] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEditUser, setShowEditUser] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch users with permissions
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch locations (only active ones)
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (locationsError) throw locationsError;

      // Fetch allowed emails
      const { data: emailsData, error: emailsError } = await supabase
        .from('allowed_emails')
        .select('*')
        .order('email');

      if (emailsError) throw emailsError;

      // Get permissions for each user - but only for active locations
      const usersWithPermissions = await Promise.all(
        (profilesData || []).map(async (profile) => {
          try {
            // Get permissions directly from user_permissions table, filtered by active locations
            const { data: userPermsData, error: userPermsError } = await supabase
              .from('user_permissions')
              .select(`
                *,
                locations!inner(id, name, is_active)
              `)
              .eq('user_id', profile.id)
              .eq('locations.is_active', true);

            if (userPermsError) {
              console.error('Error fetching user permissions:', userPermsError);
            }

            // Transform permissions data
            const permissions: Record<string, UserPermissions> = {};
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
                  };
                }
              });
            }

            return {
              ...profile,
              permissions
            };
          } catch (error) {
            console.error('Error processing user permissions for', profile.email, error);
            return {
              ...profile,
              permissions: {}
            };
          }
        })
      );

      setUsers(usersWithPermissions);
      setLocations(locationsData || []);
      setAllowedEmails(emailsData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email) return;

    try {
      // First add email to allowed list if not already there
      const emailExists = allowedEmails.some(e => e.email === newUser.email);
      if (!emailExists) {
        const { error: emailError } = await supabase
          .from('allowed_emails')
          .insert({ email: newUser.email });

        if (emailError) throw emailError;
      }

      // Note: We can't create a profile or permissions until the user actually signs in
      // The profile will be created automatically by the handle_new_user trigger
      // For now, we just add the email to allowed list

      setNewUser({ name: "", email: "", role: "staff", permissions: {} });
      setShowAddUser(false);
      fetchData();

      toast({
        title: "Email Added",
        description: `${newUser.email} has been added to allowed emails. They can now sign in with Gmail to complete setup.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add user",
        variant: "destructive",
      });
    }
  };

  const handleAddEmail = async () => {
    if (!newEmail) return;

    try {
      const { error } = await supabase
        .from('allowed_emails')
        .insert({ email: newEmail });

      if (error) throw error;

      setNewEmail("");
      setShowAddEmail(false);
      fetchData();

      toast({
        title: "Email Added",
        description: `${newEmail} can now sign in to the system.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add email",
        variant: "destructive",
      });
    }
  };

  const handleToggleEmail = async (emailId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('allowed_emails')
        .update({ is_active: !isActive })
        .eq('id', emailId);

      if (error) throw error;
      fetchData();

      toast({
        title: "Email Updated",
        description: `Email access has been ${!isActive ? 'enabled' : 'disabled'}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update email",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    try {
      // Delete user permissions first (foreign key constraint)
      const { error: permError } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

      if (permError) {
        console.error('Error deleting permissions:', permError);
        // Continue anyway, as permissions might not exist
      }

      // Note: We cannot delete from auth.users table directly
      // Instead, we'll just delete the profile and mark the user as inactive
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      fetchData();

      toast({
        title: "User Deleted",
        description: "User profile and permissions have been removed from the system.",
      });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const updatePermission = (location: string, permission: string, checked: boolean) => {
    setNewUser(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [location]: {
          ...(prev.permissions[location] || {
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
            booking_channels: false
          }),
          [permission]: checked
        }
      }
    }));
  };

  const updateEditUserPermission = (location: string, permission: string, checked: boolean) => {
    if (!editingUser) return;
    
    setEditingUser(prev => ({
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
            booking_channels: false
          }),
          [permission]: checked
        }
      }
    }));
  };

  const handleEditUser = (user: User) => {
    // Initialize permissions for all active locations if user doesn't have any
    const userWithInitializedPermissions = { ...user };
    
    // Ensure user has permission entries for all active locations
    locations.forEach(location => {
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
          booking_channels: false
        };
      }
    });

    setEditingUser(userWithInitializedPermissions);
    setShowEditUser(true);
  };

  const handleSaveEditUser = async () => {
    if (!editingUser) return;

    try {
      // Update profile role and name
      await supabase
        .from('profiles')
        .update({ 
          role: editingUser.role,
          name: editingUser.name 
        })
        .eq('id', editingUser.id);

      // Delete existing permissions
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', editingUser.id);

      // Insert new permissions for each location
      const permissionInserts = [];
      for (const location of locations) {
        const locationPerms = editingUser.permissions[location.name];
        if (locationPerms) {
          permissionInserts.push({
            user_id: editingUser.id,
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
          });
        }
      }

      if (permissionInserts.length > 0) {
        const { error: permError } = await supabase
          .from('user_permissions')
          .insert(permissionInserts);

        if (permError) throw permError;
      }

      setShowEditUser(false);
      setEditingUser(null);
      fetchData();

      toast({
        title: "User Updated",
        description: `${editingUser.name}'s permissions have been updated.`,
      });
    } catch (error: any) {
      console.error('Error updating user:', error);
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
    <div className="w-full pb-8 mx-auto space-y-6 animate-fade-in">
      {/* Action Buttons */}
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          <Dialog open={showAddEmail} onOpenChange={setShowAddEmail}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Add Email
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Allowed Email</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    placeholder="user@gmail.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowAddEmail(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleAddEmail} className="flex-1">
                    Add Email
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      placeholder="John Doe"
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Gmail Address</Label>
                    <Input
                      type="email"
                      placeholder="john@gmail.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newUser.role} onValueChange={(value: "admin" | "staff" | "manager") => setNewUser({...newUser, role: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-semibold">Location Permissions</Label>
                  {locations.map((location) => (
                    <Card key={location.id} className="p-4">
                      <h3 className="font-semibold mb-3">{location.name}</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {permissionTypes.map((permission) => (
                          <div key={permission.key} className="flex items-center space-x-2">
                            <Checkbox
                              id={`${location.name}-${permission.key}`}
                              checked={newUser.permissions[location.name]?.[permission.key as keyof UserPermissions] || false}
                              onCheckedChange={(checked) => updatePermission(location.name, permission.key, checked as boolean)}
                            />
                            <Label htmlFor={`${location.name}-${permission.key}`} className="text-sm">
                              {permission.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowAddUser(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleAddUser} className="flex-1">
                    Add User
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit User Dialog */}
          <Dialog open={showEditUser} onOpenChange={setShowEditUser}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit User Permissions</DialogTitle>
              </DialogHeader>
              {editingUser && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input
                        placeholder="John Doe"
                        value={editingUser.name}
                        onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
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
                    <Label>Role</Label>
                    <Select value={editingUser.role} onValueChange={(value: "admin" | "staff" | "manager") => setEditingUser({...editingUser, role: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Location Permissions</Label>
                    {locations.map((location) => (
                      <Card key={location.id} className="p-4">
                        <h3 className="font-semibold mb-3">{location.name}</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {permissionTypes.map((permission) => (
                            <div key={permission.key} className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-${location.name}-${permission.key}`}
                                checked={editingUser.permissions[location.name]?.[permission.key as keyof UserPermissions] || false}
                                onCheckedChange={(checked) => updateEditUserPermission(location.name, permission.key, checked as boolean)}
                              />
                              <Label htmlFor={`edit-${location.name}-${permission.key}`} className="text-sm">
                                {permission.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowEditUser(false)} className="flex-1">
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

      {/* Allowed Emails Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Allowed Email Addresses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {allowedEmails.map((email) => (
              <div key={email.id} className="flex items-center justify-between p-2 border rounded">
                <span className={email.is_active ? "text-foreground" : "text-muted-foreground"}>
                  {email.email}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={email.is_active ? "default" : "secondary"}>
                    {email.is_active ? "Active" : "Disabled"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleEmail(email.id, email.is_active)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="space-y-4">
        {users.map((user) => (
          <Card key={user.id} className="bg-card border">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{user.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={user.role === "admin" ? "default" : "secondary"} className="flex items-center gap-1">
                    {user.role === "admin" ? <Shield className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                    {user.role === "admin" ? "Administrator" : "Staff"}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEditUser(user)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {user.id !== currentUser?.id && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Permissions by Location:</h4>
                {Object.keys(user.permissions).length > 0 ? (
                  Object.entries(user.permissions).map(([location, perms]) => (
                    <div key={location} className="space-y-2">
                      <h5 className="font-medium text-sm text-primary">{location}</h5>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(perms).map(([perm, enabled]) => (
                          enabled && (
                            <Badge key={perm} variant="outline" className="text-xs rounded-sm">
                              {permissionTypes.find(p => p.key === perm)?.label}
                            </Badge>
                          )
                        ))}
                        {Object.values(perms).every(p => !p) && (
                          <Badge variant="secondary" className="text-xs">No permissions assigned</Badge>
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
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <User className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Administrators</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === "admin").length}</p>
              </div>
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Allowed Emails</p>
                <p className="text-2xl font-bold">{allowedEmails.filter(e => e.is_active).length}</p>
              </div>
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}