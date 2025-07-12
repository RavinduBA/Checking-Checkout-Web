import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables, Database } from "@/integrations/supabase/types";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { ArrowLeft, Plus, Calendar, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

type Location = Tables<"locations">;
type Account = Tables<"accounts">;
type Income = Tables<"income"> & {
  locations?: Location;
  accounts?: Account;
};

export default function Income() {
  const [formData, setFormData] = useState({
    type: "booking" as Database["public"]["Enums"]["income_type"],
    amount: "",
    accountId: "",
    locationId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    note: "",
    paymentMethod: "",
    bookingSource: "direct" as Database["public"]["Enums"]["booking_source"],
    isAdvance: false,
  });

  const [locations, setLocations] = useState<Location[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [incomeTypes, setIncomeTypes] = useState<any[]>([]);
  const [recentIncomes, setRecentIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [locationsData, accountsData, recentIncomeData, incomeTypesData] = await Promise.all([
        supabase.from("locations").select("*").eq("is_active", true),
        supabase.from("accounts").select("*"),
        supabase.from("income").select("*, accounts(*), locations(*)").order("created_at", { ascending: false }).limit(10),
        supabase.from("income_types").select("*").order("type_name")
      ]);

      setLocations(locationsData.data || []);
      setAccounts(accountsData.data || []);
      setRecentIncomes(recentIncomeData.data || []);
      setIncomeTypes(incomeTypesData.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedAccount = accounts.find(a => a.id === formData.accountId);
  const currencySymbol = selectedAccount?.currency === "USD" ? "$" : "Rs.";

  const generatePDF = () => {
    const doc = new jsPDF();
    const selectedLocation = locations.find(l => l.id === formData.locationId);
    const selectedAccount = accounts.find(a => a.id === formData.accountId);
    const currencySymbol = selectedAccount?.currency === "USD" ? "$" : "Rs. ";

    doc.setFontSize(20);
    doc.text("Income Record", 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Type: ${formData.type}`, 20, 40);
    doc.text(`Amount: ${currencySymbol}${formData.amount}`, 20, 50);
    doc.text(`Account: ${selectedAccount?.name || "N/A"}`, 20, 60);
    doc.text(`Location: ${selectedLocation?.name || "N/A"}`, 20, 70);
    doc.text(`Date: ${formData.date}`, 20, 80);
    if (formData.note) doc.text(`Note: ${formData.note}`, 20, 90);
    
    doc.save(`income-record-${formData.date}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("income").insert([{
        type: formData.type,
        amount: parseFloat(formData.amount),
        account_id: formData.accountId,
        location_id: formData.locationId,
        date: formData.date,
        note: formData.note || null,
        payment_method: formData.paymentMethod,
        is_advance: formData.isAdvance,
      }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Income record added successfully",
      });

      // Reset form
      setFormData({
        type: "booking",
        amount: "",
        accountId: "",
        locationId: "",
        date: format(new Date(), "yyyy-MM-dd"),
        note: "",
        paymentMethod: "",
        bookingSource: "direct",
        isAdvance: false,
      });

      fetchData(); // Refresh recent incomes
    } catch (error) {
      console.error("Error adding income:", error);
      toast({
        title: "Error",
        description: "Failed to add income record",
        variant: "destructive",
      });
    }
  };

  const deleteIncome = async (id: string) => {
    if (confirm("Are you sure you want to delete this income record?")) {
      try {
        const { error } = await supabase
          .from("income")
          .delete()
          .eq("id", id);
        if (error) throw error;
        toast({ title: "Success", description: "Income record deleted successfully" });
        fetchData();
      } catch (error) {
        console.error("Error deleting income:", error);
        toast({
          title: "Error",
          description: "Failed to delete income record",
          variant: "destructive",
        });
      }
    }
  };

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Income</h1>
          <p className="text-muted-foreground">Record your income transactions</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Income Form */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <Plus className="h-5 w-5" />
              New Income Record
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Income Type</Label>
                  <Select value={formData.type} onValueChange={(value: Database["public"]["Enums"]["income_type"]) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {incomeTypes.map((type) => (
                        <SelectItem key={type.id} value={type.type_name}>
                          {type.type_name.charAt(0).toUpperCase() + type.type_name.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.type === "booking" && (
                  <div>
                    <Label htmlFor="bookingSource">Booking Source</Label>
                    <Select value={formData.bookingSource} onValueChange={(value: Database["public"]["Enums"]["booking_source"]) => setFormData({ ...formData, bookingSource: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct">Direct</SelectItem>
                        <SelectItem value="airbnb">Airbnb</SelectItem>
                        <SelectItem value="booking_com">Booking.com</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                    {currencySymbol}
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accountId">Account</Label>
                  <Select value={formData.accountId} onValueChange={(value) => setFormData({...formData, accountId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.currency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="locationId">Location</Label>
                  <Select value={formData.locationId} onValueChange={(value) => setFormData({...formData, locationId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
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
              </div>

              <div>
                <Label htmlFor="date">Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="note">Note (Optional)</Label>
                <Textarea
                  id="note"
                  placeholder="Add any additional details..."
                  value={formData.note}
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={generatePDF} className="flex-1">
                  Download PDF
                </Button>
                <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                  Add Income
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Recent Income Records */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-green-800">Recent Income Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentIncomes.map((income) => (
                <div key={income.id} className="flex justify-between items-center p-3 bg-white/60 rounded-lg border border-green-100">
                  <div className="flex-1">
                    <div className="font-medium text-green-900">
                      {income.type.charAt(0).toUpperCase() + income.type.slice(1)} - {income.accounts?.currency === "LKR" ? "Rs." : "$"}{income.amount.toLocaleString()}
                    </div>
                    <div className="text-sm text-green-700">
                      {income.locations?.name} • {format(new Date(income.date), "MMM dd, yyyy")}
                      {income.note && ` • ${income.note}`}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteIncome(income.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {recentIncomes.length === 0 && (
                <div className="text-center py-8 text-green-600">
                  No income records yet. Add your first income above!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}