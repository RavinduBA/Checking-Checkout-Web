import { Outlet } from "react-router-dom";
import { useState } from "react";
import { Building2, Menu, X, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Sidebar } from "@/components/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const isMobile = useIsMobile();

  const locations = [
    { value: "all", label: "All Locations" },
    { value: "asaliya", label: "Asaliya Villa" },
    { value: "rusty", label: "Rusty Bunk" },
    { value: "antiqua", label: "Antiqua Serenity" },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-soft sticky top-0 z-40">
        <div className="flex items-center justify-between p-3 lg:p-4">
          <div className="flex items-center gap-2 lg:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
              <span className="font-semibold text-foreground text-sm lg:text-base">
                {isMobile ? "Villa" : "Villa Manager"}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Location Selector */}
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-32 sm:w-40 lg:w-48 h-8 lg:h-10 text-xs lg:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-50">
                {locations.map((location) => (
                  <SelectItem key={location.value} value={location.value}>
                    {location.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* User Info & Logout */}
            <div className="flex items-center gap-1 lg:gap-2">
              {!isMobile && (
                <div className="hidden sm:flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  <span className="text-muted-foreground">
                    {profile?.name || "User"}
                  </span>
                </div>
              )}
              <Button 
                variant="ghost" 
                size="icon"
                onClick={signOut}
                title="Sign Out"
                className="h-8 w-8 lg:h-10 lg:w-10"
              >
                <LogOut className="h-3 w-3 lg:h-4 lg:w-4" />
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
        <main className="flex-1 lg:ml-64 min-h-screen">
          <div className="p-3 lg:p-6 pb-20 lg:pb-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileBottomNav />}
    </div>
  );
}