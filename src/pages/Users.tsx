import { useState } from "react";
import { ArrowLeft, Plus, User, Shield, Edit, Trash2, UserCheck } from "lucide-react";
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

interface UserPermissions {
  dashboard: boolean;
  income: boolean;
  expenses: boolean;
  reports: boolean;
  calendar: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
  permissions: Record<string, UserPermissions>;
}

const mockUsers: User[] = [
  {
    id: "1",
    name: "John Administrator",
    email: "admin@asaliyavilla.com",
    role: "admin",
    permissions: {
      "Asaliya Villa": { dashboard: true, income: true, expenses: true, reports: true, calendar: true },
      "Rusty Bunk": { dashboard: true, income: true, expenses: true, reports: true, calendar: true }
    }
  },
  {
    id: "2",
    name: "Sarah Manager",
    email: "sarah@asaliyavilla.com", 
    role: "staff",
    permissions: {
      "Asaliya Villa": { dashboard: true, income: true, expenses: true, reports: false, calendar: true }
    }
  }
];

const locations = ["Asaliya Villa", "Rusty Bunk", "Antiqua Serenity"];
const permissionTypes = [
  { key: "dashboard", label: "Dashboard Access" },
  { key: "income", label: "Income Management" },
  { key: "expenses", label: "Expense Management" },
  { key: "reports", label: "Reports & Analytics" },
  { key: "calendar", label: "Calendar Access" }
];

export default function Users() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState<{
    name: string;
    email: string;
    role: "admin" | "staff";
    permissions: Record<string, UserPermissions>;
  }>({
    name: "",
    email: "",
    role: "staff",
    permissions: {}
  });
  const { toast } = useToast();

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) return;
    
    const user: User = {
      id: Date.now().toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      permissions: newUser.permissions
    };
    
    setUsers([...users, user]);
    setNewUser({ name: "", email: "", role: "staff", permissions: {} });
    setShowAddUser(false);
    
    toast({
      title: "User Added",
      description: `${user.name} has been added successfully.`,
    });
  };

  const updatePermission = (location: string, permission: string, checked: boolean) => {
    setNewUser(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [location]: {
          ...(prev.permissions[location] || { dashboard: false, income: false, expenses: false, reports: false, calendar: false }),
          [permission]: checked
        }
      }
    }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground">Manage users and permissions</p>
          </div>
        </div>
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
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newUser.role} onValueChange={(value: "admin" | "staff") => setNewUser({...newUser, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">Location Permissions</Label>
                {locations.map((location) => (
                  <Card key={location} className="p-4">
                    <h3 className="font-semibold mb-3">{location}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {permissionTypes.map((permission) => (
                        <div key={permission.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${location}-${permission.key}`}
                            checked={newUser.permissions[location as keyof typeof newUser.permissions]?.[permission.key as keyof typeof permission] || false}
                            onCheckedChange={(checked) => updatePermission(location, permission.key, checked as boolean)}
                          />
                          <Label htmlFor={`${location}-${permission.key}`} className="text-sm">
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
      </div>

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
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
                <p className="text-sm text-muted-foreground">Staff Members</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === "staff").length}</p>
              </div>
              <UserCheck className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}