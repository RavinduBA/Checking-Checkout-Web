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
  beds24: boolean;
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
  { key: "beds24", label: "Beds24 Integration" }
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

      // Fetch locations
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true);

      if (locationsError) throw locationsError;

      // Fetch allowed emails
      const { data: emailsData, error: emailsError } = await supabase
        .from('allowed_emails')
        .select('*')
        .order('email');

      if (emailsError) throw emailsError;

      // Get permissions for each user
      const usersWithPermissions = await Promise.all(
        profilesData.map(async (profile) => {
          const { data: permissionsData } = await supabase
            .rpc('get_user_permissions', { user_id_param: profile.id });

          // Safely parse permissions data
          let permissions: Record<string, UserPermissions> = {};
          if (permissionsData && typeof permissionsData === 'object' && !Array.isArray(permissionsData)) {
            permissions = permissionsData as unknown as Record<string, UserPermissions>;
          }

          return {
            ...profile,
            permissions
          };
        })
      );

      setUsers(usersWithPermissions);
      setLocations(locationsData || []);
      setAllowedEmails(emailsData || []);
    } catch (error: any) {
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

      // Create user permissions for each location
      const permissionPromises = Object.entries(newUser.permissions).map(
        ([locationName, perms]) => {
          const location = locations.find(l => l.name === locationName);
          if (!location) return null;

          return supabase
            .from('user_permissions')
            .insert({
              user_id: newUser.email, // Will be updated when user actually signs in
              location_id: location.id,
              ...perms
            });
        }
      ).filter(Boolean);

      await Promise.all(permissionPromises);

      setNewUser({ name: "", email: "", role: "staff", permissions: {} });
      setShowAddUser(false);
      fetchData();

      toast({
        title: "User Added",
        description: `${newUser.name} has been added. They can now sign in with Gmail.`,
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
    try {
      // Delete user permissions
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

      // Delete profile
      await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      fetchData();

      toast({
        title: "User Deleted",
        description: "User has been removed from the system.",
      });
    } catch (error: any) {
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
            beds24: false
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
            beds24: false
          }),
          [permission]: checked
        }
      }
    }));
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowEditUser(true);
  };

  const handleSaveEditUser = async () => {
    if (!editingUser) return;

    try {
      // Update profile role
      await supabase
        .from('profiles')
        .update({ role: editingUser.role })
        .eq('id', editingUser.id);

      // Delete existing permissions
      await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', editingUser.id);

      // Insert new permissions
      const permissionPromises = Object.entries(editingUser.permissions).map(
        ([locationName, perms]) => {
          const location = locations.find(l => l.name === locationName);
          if (!location) return null;

          return supabase
            .from('user_permissions')
            .insert({
              user_id: editingUser.id,
              location_id: location.id,
              access_dashboard: perms.dashboard,
              access_income: perms.income,
              access_expenses: perms.expenses,
              access_reports: perms.reports,
              access_calendar: perms.calendar,
              access_bookings: perms.bookings,
              access_rooms: perms.rooms,
              access_master_files: perms.master_files,
              access_accounts: perms.accounts,
              access_users: perms.users,
              access_settings: perms.settings,
              access_beds24: perms.beds24,
            });
        }
      ).filter(Boolean);

      await Promise.all(permissionPromises);

      setShowEditUser(false);
      setEditingUser(null);
      fetchData();

      toast({
        title: "User Updated",
        description: `${editingUser.name}'s permissions have been updated.`,
      });
    } catch (error: any) {
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
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/app">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground">Manage users, roles, and permissions</p>
          </div>
        </div>
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
          <Card key={user.id} className="bg-gradient-card border-0 shadow-elegant">
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
                {Object.entries(user.permissions).map(([location, perms]) => (
                  <div key={location} className="space-y-2">
                    <h5 className="font-medium text-sm text-primary">{location}</h5>
                    <div className="flex flex-wrap gap-1 pl-4">
                      {Object.entries(perms).map(([perm, enabled]) => (
                        enabled && (
                          <Badge key={perm} variant="outline" className="text-xs">
                            {permissionTypes.find(p => p.key === perm)?.label}
                          </Badge>
                        )
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-card border-0 shadow-elegant">
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

        <Card className="bg-gradient-card border-0 shadow-elegant">
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

        <Card className="bg-gradient-card border-0 shadow-elegant">
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