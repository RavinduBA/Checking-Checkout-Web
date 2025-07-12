import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

type ExpenseType = {
  id: string;
  main_type: string;
  sub_type: string;
  created_at: string;
};

type IncomeType = {
  id: string;
  type_name: string;
  created_at: string;
};

type Location = {
  id: string;
  name: string;
  is_active: boolean;
};

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [newMainType, setNewMainType] = useState("");
  const [newSubType, setNewSubType] = useState("");
  const [newIncomeType, setNewIncomeType] = useState("");

  useEffect(() => {
    fetchExpenseTypes();
    fetchIncomeTypes();
    fetchLocations();
  }, []);

  const fetchExpenseTypes = async () => {
    const { data, error } = await supabase
      .from("expense_types")
      .select("*")
      .order("main_type", { ascending: true });

    if (error) {
      console.error("Error fetching expense types:", error);
      toast({
        title: "Error",
        description: "Failed to fetch expense types",
        variant: "destructive",
      });
    } else {
      setExpenseTypes(data || []);
    }
  };

  const fetchIncomeTypes = async () => {
    const { data, error } = await supabase
      .from("income_types")
      .select("*")
      .order("type_name", { ascending: true });

    if (error) {
      console.error("Error fetching income types:", error);
      toast({
        title: "Error",
        description: "Failed to fetch income types",
        variant: "destructive",
      });
    } else {
      setIncomeTypes(data || []);
    }
  };

  const fetchLocations = async () => {
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching locations:", error);
      toast({
        title: "Error",
        description: "Failed to fetch locations",
        variant: "destructive",
      });
    } else {
      setLocations(data || []);
    }
  };

  const addExpenseType = async () => {
    if (!newMainType.trim() || !newSubType.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both main type and sub type",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("expense_types")
      .insert([{ main_type: newMainType.trim(), sub_type: newSubType.trim() }]);

    if (error) {
      console.error("Error adding expense type:", error);
      toast({
        title: "Error",
        description: "Failed to add expense type",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Expense type added successfully",
      });
      setNewMainType("");
      setNewSubType("");
      fetchExpenseTypes();
    }
  };

  const addIncomeType = async () => {
    if (!newIncomeType.trim()) {
      toast({
        title: "Error",
        description: "Please fill in the income type",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("income_types")
      .insert([{ type_name: newIncomeType.trim() }]);

    if (error) {
      console.error("Error adding income type:", error);
      toast({
        title: "Error",
        description: "Failed to add income type",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Income type added successfully",
      });
      setNewIncomeType("");
      fetchIncomeTypes();
    }
  };

  const deleteExpenseType = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this expense type?")) {
      try {
        const { error } = await supabase
          .from("expense_types")
          .delete()
          .eq("id", id);
        if (error) throw error;
        toast({
          title: "Success",
          description: "Expense type deleted successfully",
        });
        fetchExpenseTypes();
      } catch (error) {
        console.error("Error deleting expense type:", error);
        toast({
          title: "Error",
          description: "Failed to delete expense type",
          variant: "destructive",
        });
      }
    }
  };

  const deleteIncomeType = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this income type?")) {
      try {
        const { error } = await supabase
          .from("income_types")
          .delete()
          .eq("id", id);
        if (error) throw error;
        toast({
          title: "Success",
          description: "Income type deleted successfully",
        });
        fetchIncomeTypes();
      } catch (error) {
        console.error("Error deleting income type:", error);
        toast({
          title: "Error",
          description: "Failed to delete income type",
          variant: "destructive",
        });
      }
    }
  };

  const clearLocationBookings = async () => {
    if (!selectedLocationId) {
      toast({
        title: "Error",
        description: "Please select a location first",
        variant: "destructive",
      });
      return;
    }

    const selectedLocation = locations.find(l => l.id === selectedLocationId);
    if (!selectedLocation) return;

    if (window.confirm(`Are you sure you want to clear ALL bookings for ${selectedLocation.name}? This action cannot be undone.`)) {
      try {
        const { data, error } = await supabase.functions.invoke('clear-bookings', {
          body: { locationId: selectedLocationId }
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: `Cleared ${data.deletedCount} bookings from ${selectedLocation.name}`,
        });
      } catch (error) {
        console.error("Error clearing bookings:", error);
        toast({
          title: "Error",
          description: "Failed to clear bookings",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="expenses">Expense Categories</TabsTrigger>
          <TabsTrigger value="income">Income Types</TabsTrigger>
          <TabsTrigger value="bookings">Booking Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Expense Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="mainType">Main Type</Label>
                    <Input
                      id="mainType"
                      value={newMainType}
                      onChange={(e) => setNewMainType(e.target.value)}
                      placeholder="e.g., Utilities"
                    />
                  </div>
                  <div>
                    <Label htmlFor="subType">Sub Type</Label>
                    <Input
                      id="subType"
                      value={newSubType}
                      onChange={(e) => setNewSubType(e.target.value)}
                      placeholder="e.g., Electricity"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addExpenseType} className="w-full">
                      Add Expense Type
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {expenseTypes.map((type) => (
                    <div
                      key={type.id}
                      className="flex items-center justify-between p-3 border rounded-lg group hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{type.main_type}</div>
                        <div className="text-sm text-muted-foreground">{type.sub_type}</div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteExpenseType(type.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income">
          <Card>
            <CardHeader>
              <CardTitle>Income Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="incomeType">Income Type</Label>
                    <Input
                      id="incomeType"
                      value={newIncomeType}
                      onChange={(e) => setNewIncomeType(e.target.value)}
                      placeholder="e.g., Booking, Food, Laundry"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addIncomeType} className="w-full">
                      Add Income Type
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {incomeTypes.map((type) => (
                    <div
                      key={type.id}
                      className="flex items-center justify-between p-3 border rounded-lg group hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{type.type_name}</div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteIncomeType(type.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle>Booking Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <h3 className="font-medium text-yellow-800 mb-2">Clear All Bookings</h3>
                  <p className="text-sm text-yellow-700 mb-4">
                    This will permanently delete all bookings for the selected location. 
                    Use this before re-syncing from iCal to avoid duplicates.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location">Select Location</Label>
                      <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select location to clear" />
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
                    <div className="flex items-end">
                      <Button 
                        onClick={clearLocationBookings} 
                        variant="destructive" 
                        className="w-full"
                        disabled={!selectedLocationId}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear All Bookings
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}