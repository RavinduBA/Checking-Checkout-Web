import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface UserPermissions {
  [locationName: string]: {
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
  };
}

export const usePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissions>({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!user) return;

      try {
        // Check if user is admin
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        console.log("User profile:", profile);
        const userIsAdmin = profile?.role === 'admin';
        setIsAdmin(userIsAdmin);

        // If admin, grant all permissions
        if (userIsAdmin) {
          console.log("User is admin - granting all permissions");
          const { data: locations } = await supabase
            .from("locations")
            .select("name")
            .eq("is_active", true);

          const adminPermissions: UserPermissions = {};
          locations?.forEach(location => {
            adminPermissions[location.name] = {
              dashboard: true,
              income: true,
              expenses: true,
              reports: true,
              calendar: true,
              bookings: true,
              rooms: true,
              master_files: true,
              accounts: true,
              users: true,
              settings: true,
              booking_channels: true,
            };
          });
          console.log("Admin permissions:", adminPermissions);
          setPermissions(adminPermissions);
        } else {
          // Fetch user permissions using the RPC function
          const { data: userPermissions } = await supabase
            .rpc("get_user_permissions", { user_id_param: user.id });

          console.log("User permissions from RPC:", userPermissions);
          setPermissions((userPermissions as UserPermissions) || {});
        }
      } catch (error) {
        console.error("Error fetching permissions:", error);
        setPermissions({});
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchPermissions();
    } else {
      setPermissions({});
      setIsAdmin(false);
      setLoading(false);
    }
  }, [user]);

  const hasPermission = (permission: keyof UserPermissions[string], locationName?: string): boolean => {
    if (isAdmin) return true;
    
    if (!locationName) {
      // Check if user has permission in any location
      return Object.values(permissions).some(locationPerms => locationPerms[permission]);
    }
    
    return permissions[locationName]?.[permission] || false;
  };

  const hasAnyPermission = (permission: keyof UserPermissions[string]): boolean => {
    if (isAdmin) return true;
    return Object.values(permissions).some(locationPerms => locationPerms[permission]);
  };

  const getPermittedLocations = (permission: keyof UserPermissions[string]): string[] => {
    if (isAdmin) return Object.keys(permissions);
    
    return Object.entries(permissions)
      .filter(([, locationPerms]) => locationPerms[permission])
      .map(([locationName]) => locationName);
  };

  const refetch = async () => {
    if (!user) return;

    try {
      console.log("Fetching permissions for user:", user.id);
      
      // Check if user is admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      console.log("User profile:", profile);
      const userIsAdmin = profile?.role === 'admin';
      setIsAdmin(userIsAdmin);

      // If admin, grant all permissions
      if (userIsAdmin) {
        console.log("User is admin - granting all permissions");
        const { data: locations } = await supabase
          .from("locations")
          .select("name")
          .eq("is_active", true);

        const adminPermissions: UserPermissions = {};
        locations?.forEach(location => {
          adminPermissions[location.name] = {
            dashboard: true,
            income: true,
            expenses: true,
            reports: true,
            calendar: true,
            bookings: true,
            rooms: true,
            master_files: true,
            accounts: true,
            users: true,
            settings: true,
            booking_channels: true,
          };
        });
        console.log("Admin permissions:", adminPermissions);
        setPermissions(adminPermissions);
      } else {
        // Fetch user permissions using the RPC function
        const { data: userPermissions } = await supabase
          .rpc("get_user_permissions", { user_id_param: user.id });

        console.log("User permissions from RPC:", userPermissions);
        setPermissions((userPermissions as UserPermissions) || {});
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  };

  return {
    permissions,
    loading,
    isAdmin,
    hasPermission,
    hasAnyPermission,
    getPermittedLocations,
    refetch,
  };
};