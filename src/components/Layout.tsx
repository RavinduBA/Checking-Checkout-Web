import { Outlet } from "react-router-dom";
import { useState } from "react";
import { Building2, Menu, X, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Sidebar } from "@/components/Sidebar";

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const { signOut } = useAuth();
  const { profile } = useProfile();

  const locations = [
    { value: "all", label: "All Locations" },
    { value: "asaliya", label: "Asaliya Villa" },
    { value: "rusty", label: "Rusty Bunk" },
    { value: "antiqua", label: "Antiqua Serenity" },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-soft">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X /> : <Menu />}
            </Button>
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="font-semibold text-foreground">Villa Manager</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Location Selector */}
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-40 sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.value} value={location.value}>
                    {location.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* User Info & Logout */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <User className="h-4 w-4" />
                <span className="text-muted-foreground">
                  {profile?.name || "User"}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={signOut}
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />
        
        {/* Sidebar Overlay for Mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-64">
          <div className="p-4 lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}