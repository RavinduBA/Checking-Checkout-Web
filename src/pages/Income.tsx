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
    dateFrom: format(new Date(), "yyyy-MM-dd"),
    dateTo: format(new Date(), "yyyy-MM-dd"),
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
    doc.text(`Date: ${formData.dateFrom}`, 20, 80);
    if (formData.note) doc.text(`Note: ${formData.note}`, 20, 90);
    
    doc.save(`income-record-${formData.dateFrom}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("income").insert([{
        type: formData.type,
        amount: parseFloat(formData.amount),
        account_id: formData.accountId,
        location_id: formData.locationId,
        date: formData.dateFrom,
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
        dateFrom: format(new Date(), "yyyy-MM-dd"),
        dateTo: format(new Date(), "yyyy-MM-dd"),
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

  // Remove delete function - deletion should be done from settings page

  if (loading) {
    return <div className="container mx-auto p-4 sm:p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Add Income</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Record your income transactions</p>
        </div>
      </div>

      {/* Location Filter at Top */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div>
            <Label htmlFor="locationFilter" className="text-green-800 font-medium">Select Location</Label>
            <Select value={formData.locationId} onValueChange={(value) => setFormData({...formData, locationId: value})}>
              <SelectTrigger className="bg-white border-green-200">
                <SelectValue placeholder="Select Location" />
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
        </CardContent>
      </Card>

      {/* Only show content after location is selected */}
      {formData.locationId && (
        <div className="space-y-4 sm:space-y-6">
          {/* Income Form - Show First */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-green-800 flex items-center gap-2 text-lg">
                <Plus className="h-5 w-5" />
                New Income Record
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
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

                {/* Date Range Section - Check-in/Check-out for Bookings */}
                <div className="bg-white/50 p-4 rounded-lg border border-green-100">
                  <Label className="text-green-800 font-medium mb-3 block">Booking Period</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="checkIn">Check-in Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="checkIn"
                          type="date"
                          value={formData.dateFrom}
                          onChange={(e) => setFormData({...formData, dateFrom: e.target.value})}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="checkOut">Check-out Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="checkOut"
                          type="date"
                          value={formData.dateTo}
                          onChange={(e) => setFormData({...formData, dateTo: e.target.value})}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                  </div>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Input
                      id="paymentMethod"
                      placeholder="Cash, Card, Bank Transfer..."
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
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

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Income
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Recent Income Records - Show Second */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-green-800 text-lg">Recent Income Records</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-2 max-h-80 sm:max-h-96 overflow-y-auto">
                {recentIncomes.map((income) => (
                  <div key={income.id} className="p-3 bg-white/60 rounded-lg border border-green-100">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="flex-1">
                        <div className="font-medium text-green-900 text-sm sm:text-base">
                          {income.type.charAt(0).toUpperCase() + income.type.slice(1)} - {income.accounts?.currency === "LKR" ? "Rs." : "$"}{income.amount.toLocaleString()}
                        </div>
                        <div className="text-xs sm:text-sm text-green-700 mt-1">
                          <div>{income.locations?.name}</div>
                          <div>Account: {income.accounts?.name} ({income.accounts?.currency})</div>
                          <div>{format(new Date(income.date), "MMM dd, yyyy")}</div>
                          {income.note && <div className="mt-1 italic">"{income.note}"</div>}
                        </div>
                      </div>
                    </div>
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
      )}
    </div>
  );
}