import { useState, useEffect } from "react";
import { ArrowLeft, Plus, DollarSign, Calendar, Download, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import jsPDF from 'jspdf';

const bookingSources = [
  { value: "direct", label: "Direct Booking" },
  { value: "airbnb", label: "Airbnb" },
  { value: "booking_com", label: "Booking.com" }
];

type Location = Tables<"locations">;
type Account = Tables<"accounts">;
type IncomeType = Tables<"income">["type"];
type Income = Tables<"income"> & {
  accounts: Tables<"accounts">;
  locations: Tables<"locations">;
};

export default function Income() {
  const [formData, setFormData] = useState({
    type: "" as IncomeType | "",
    amount: "",
    accountId: "",
    locationId: "",
    bookingSource: "",
    isAdvance: false,
    note: "",
    date: new Date().toISOString().split('T')[0]
  });
  const [locations, setLocations] = useState<Location[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [incomeTypes, setIncomeTypes] = useState<{value: IncomeType, label: string}[]>([
    { value: "booking", label: "Booking Income" },
    { value: "laundry", label: "Laundry Income" },
    { value: "food", label: "Food Income" },
    { value: "other", label: "Other Income" }
  ]);
  const [recentIncomes, setRecentIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [locationsData, accountsData, recentIncomeData] = await Promise.all([
        supabase.from("locations").select("*").eq("is_active", true),
        supabase.from("accounts").select("*"),
        supabase.from("income").select("*, accounts(*), locations(*)").order("created_at", { ascending: false }).limit(10)
      ]);

      setLocations(locationsData.data || []);
      setAccounts(accountsData.data || []);
      setRecentIncomes(recentIncomeData.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const selectedLocation = locations.find(l => l.id === formData.locationId);
    const selectedAccount = accounts.find(a => a.id === formData.accountId);
    const currencySymbol = selectedAccount?.currency === "USD" ? "$" : "Rs. ";
    
    // Header
    doc.setFontSize(20);
    doc.text('Income Record', 20, 30);
    
    // Details
    doc.setFontSize(12);
    doc.text(`Location: ${selectedLocation?.name || 'N/A'}`, 20, 50);
    doc.text(`Income Type: ${incomeTypes.find(t => t.value === formData.type)?.label || 'N/A'}`, 20, 60);
    doc.text(`Amount: ${currencySymbol}${Number(formData.amount).toLocaleString()}`, 20, 70);
    doc.text(`Account: ${selectedAccount?.name || 'N/A'}`, 20, 80);
    if (formData.type === "booking" && formData.bookingSource) {
      doc.text(`Booking Source: ${bookingSources.find(s => s.value === formData.bookingSource)?.label || 'N/A'}`, 20, 90);
    }
    doc.text(`Date: ${formData.date}`, 20, 100);
    doc.text(`Is Advance: ${formData.isAdvance ? 'Yes' : 'No'}`, 20, 110);
    if (formData.note) {
      doc.text(`Note: ${formData.note}`, 20, 120);
    }
    
    doc.save(`income-${formData.date}-${Date.now()}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const paymentMethod = formData.type === "booking" ? formData.bookingSource : "direct";
      
      const { error } = await supabase
        .from("income")
        .insert([{
          type: formData.type as IncomeType,
          amount: Number(formData.amount),
          account_id: formData.accountId,
          location_id: formData.locationId,
          payment_method: paymentMethod,
          is_advance: formData.isAdvance,
          note: formData.note || null,
          date: formData.date
        }]);

      if (error) throw error;

      const selectedAccount = accounts.find(a => a.id === formData.accountId);
      const currencySymbol = selectedAccount?.currency === "USD" ? "$" : "Rs. ";

      toast({
        title: "Income Added Successfully",
        description: `${currencySymbol}${Number(formData.amount).toLocaleString()} added to ${selectedAccount?.name}`,
      });
      
      // Reset form and refresh recent incomes
      setFormData({
        type: "" as IncomeType | "",
        amount: "",
        accountId: "",
        locationId: "",
        bookingSource: "",
        isAdvance: false,
        note: "",
        date: new Date().toISOString().split('T')[0]
      });
      
      // Refresh recent incomes
      fetchData();
    } catch (error) {
      console.error("Error adding income:", error);
      toast({
        title: "Error",
        description: "Failed to add income",
        variant: "destructive"
      });
    }
  };

  const selectedAccount = accounts.find(a => a.id === formData.accountId);
  const selectedLocation = locations.find(l => l.id === formData.locationId);
  const currencySymbol = selectedAccount?.currency === "USD" ? "$" : "Rs. ";

  if (loading) {
    return <div className="flex justify-center items-center min-h-64">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Income</h1>
          <p className="text-muted-foreground">Record income for selected location</p>
        </div>
      </div>

      {/* Current Location Badge */}
      {selectedLocation && (
        <Badge variant="outline" className="w-fit flex items-center gap-2">
          <MapPin className="h-3 w-3" />
          {selectedLocation.name}
        </Badge>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <Card className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-950 border-emerald-200 shadow-emerald-200/50 shadow-xl"
                style={{ boxShadow: '0 20px 25px -5px rgba(16, 185, 129, 0.1), 0 10px 10px -5px rgba(16, 185, 129, 0.04)' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <Plus className="h-5 w-5" />
                Income Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select 
                value={formData.locationId} 
                onValueChange={(value) => setFormData({...formData, locationId: value})}
              >
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

                {/* Income Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Income Type</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(value) => setFormData({...formData, type: value as IncomeType, bookingSource: ""})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select income type" />
                    </SelectTrigger>
                    <SelectContent>
                      {incomeTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Booking Source - Only show if income type is booking */}
                {formData.type === "booking" && (
                  <div className="space-y-2">
                    <Label htmlFor="bookingSource">Booking Source</Label>
                    <Select 
                      value={formData.bookingSource} 
                      onValueChange={(value) => setFormData({...formData, bookingSource: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Where did this booking come from?" />
                      </SelectTrigger>
                      <SelectContent>
                        {bookingSources.map((source) => (
                          <SelectItem key={source.value} value={source.value}>
                            {source.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Account */}
                <div className="space-y-2">
                  <Label htmlFor="account">Deposit to Account</Label>
                  <Select 
                    value={formData.accountId} 
                    onValueChange={(value) => setFormData({...formData, accountId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{account.name}</span>
                            <Badge variant="outline" className="ml-2">
                              {account.currency}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="space-y-2">
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
                  {selectedAccount && (
                    <p className="text-xs text-muted-foreground">
                      Will be added to {selectedAccount.name} ({selectedAccount.currency})
                    </p>
                  )}
                </div>

            {/* Date */}
            <div className="space-y-2">
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

            {/* Advance Payment Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="advance"
                checked={formData.isAdvance}
                onCheckedChange={(checked) => setFormData({...formData, isAdvance: checked as boolean})}
              />
              <Label htmlFor="advance" className="text-sm">
                This is an advance payment
              </Label>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Add any additional details..."
                value={formData.note}
                onChange={(e) => setFormData({...formData, note: e.target.value})}
                rows={3}
              />
            </div>

                {/* Submit and PDF Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button asChild variant="outline" className="flex-1">
                    <Link to="/">Cancel</Link>
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={generatePDF}
                    disabled={!formData.type || !formData.amount || !formData.accountId || !formData.locationId || (formData.type === "booking" && !formData.bookingSource)}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={!formData.type || !formData.amount || !formData.accountId || !formData.locationId || (formData.type === "booking" && !formData.bookingSource)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Income
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Recent Income List */}
        <div className="lg:col-span-1">
          <Card className="bg-gradient-card border-0 shadow-elegant">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">Recent Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentIncomes.length > 0 ? (
                  recentIncomes.map((income) => (
                    <div key={income.id} className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-sm capitalize">{income.type.replace('_', ' ')}</p>
                          <p className="text-xs text-muted-foreground">{income.locations?.name}</p>
                          <p className="text-xs text-muted-foreground">{new Date(income.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-emerald-600">
                            {income.accounts?.currency === "USD" ? "$" : "Rs. "}{Number(income.amount).toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">{income.accounts?.name}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent income</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}