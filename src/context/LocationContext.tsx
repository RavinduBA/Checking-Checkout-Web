import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Location = Tables<"locations">;

interface LocationContextType {
  selectedLocation: string;
  setSelectedLocation: (locationId: string) => void;
  locations: Location[];
  loading: boolean;
  getSelectedLocationData: () => Location | null;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data, error } = await supabase
          .from("locations")
          .select("*")
          .eq("is_active", true)
          .order("name");

        if (error) throw error;
        setLocations(data || []);
      } catch (error) {
        console.error("Error fetching locations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  const getSelectedLocationData = () => {
    if (selectedLocation === "all") return null;
    return locations.find(loc => loc.id === selectedLocation) || null;
  };

  return (
    <LocationContext.Provider 
      value={{
        selectedLocation,
        setSelectedLocation,
        locations,
        loading,
        getSelectedLocationData,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
}
