import { useState, useEffect } from "react";
import { ArrowLeft, Minus, DollarSign, Calendar, MapPin, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import jsPDF from 'jspdf';

type Location = Tables<"locations">;
type Account = Tables<"accounts">;
type ExpenseType = Tables<"expense_types">;

export default function Expense() {
  const [formData, setFormData] = useState({
    mainCategory: "",
    subCategory: "",
    amount: "",
    accountId: "",
    locationId: "",
    note: "",
    date: new Date().toISOString().split('T')[0]
  });
  const [locations, setLocations] = useState<Location[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [locationsData, accountsData, expenseTypesData] = await Promise.all([
        supabase.from("locations").select("*").eq("is_active", true),
        supabase.from("accounts").select("*"),
        supabase.from("expense_types").select("*")
      ]);

      setLocations(locationsData.data || []);
      setAccounts(accountsData.data || []);
      setExpenseTypes(expenseTypesData.data || []);
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
    
    // Header
    doc.setFontSize(20);
    doc.text('Expense Record', 20, 30);
    
    // Details
    doc.setFontSize(12);
    doc.text(`Location: ${selectedLocation?.name || 'N/A'}`, 20, 50);
    doc.text(`Category: ${formData.mainCategory} - ${formData.subCategory}`, 20, 60);
    doc.text(`Amount: LKR ${Number(formData.amount).toLocaleString()}`, 20, 70);
    doc.text(`Account: ${selectedAccount?.name || 'N/A'}`, 20, 80);
    doc.text(`Date: ${formData.date}`, 20, 90);
    if (formData.note) {
      doc.text(`Note: ${formData.note}`, 20, 100);
    }
    
    doc.save(`expense-${formData.date}-${Date.now()}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from("expenses")
        .insert([{
          main_type: formData.mainCategory,
          sub_type: formData.subCategory,
          amount: Number(formData.amount),
          account_id: formData.accountId,
          location_id: formData.locationId,
          note: formData.note || null,
          date: formData.date
        }]);

      if (error) throw error;

      toast({
        title: "Expense Added Successfully",
        description: `LKR ${Number(formData.amount).toLocaleString()} expense recorded for ${formData.subCategory}`,
      });
      
      // Reset form
      setFormData({
        mainCategory: "",
        subCategory: "",
        amount: "",
        accountId: "",
        locationId: "",
        note: "",
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error("Error adding expense:", error);
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive"
      });
    }
  };

  const selectedAccount = accounts.find(a => a.id === formData.accountId);
  const selectedLocation = locations.find(l => l.id === formData.locationId);
  const mainCategories = [...new Set(expenseTypes.map(et => et.main_type))];
  const subCategories = expenseTypes
    .filter(et => et.main_type === formData.mainCategory)
    .map(et => et.sub_type);

  if (loading) {
    return <div className="flex justify-center items-center min-h-64">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Expense</h1>
          <p className="text-muted-foreground">Record expense for Asaliya Villa</p>
        </div>
      </div>

      {/* Current Location Badge */}
      {selectedLocation && (
        <Badge variant="outline" className="w-fit flex items-center gap-2">
          <MapPin className="h-3 w-3" />
          {selectedLocation.name}
        </Badge>
      )}

      {/* Form */}
      <Card className="bg-gradient-card border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Minus className="h-5 w-5 text-destructive" />
            Expense Details
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

            {/* Main Category */}
            <div className="space-y-2">
              <Label htmlFor="mainCategory">Main Category</Label>
              <Select 
                value={formData.mainCategory} 
                onValueChange={(value) => setFormData({...formData, mainCategory: value, subCategory: ""})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select main category" />
                </SelectTrigger>
                <SelectContent>
                  {mainCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sub Category */}
            {formData.mainCategory && (
              <div className="space-y-2">
                <Label htmlFor="subCategory">Sub Category</Label>
                <Select 
                  value={formData.subCategory} 
                  onValueChange={(value) => setFormData({...formData, subCategory: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub category" />
                  </SelectTrigger>
                  <SelectContent>
                    {subCategories.map((subCategory) => (
                      <SelectItem key={subCategory} value={subCategory}>
                        {subCategory}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                  Will be deducted from {selectedAccount.name} ({selectedAccount.currency})
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

            {/* Account */}
            <div className="space-y-2">
              <Label htmlFor="account">Pay from Account</Label>
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

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Add details about this expense..."
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
                disabled={!formData.mainCategory || !formData.subCategory || !formData.amount || !formData.accountId || !formData.locationId}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button 
                type="submit" 
                variant="destructive"
                className="flex-1"
                disabled={!formData.mainCategory || !formData.subCategory || !formData.amount || !formData.accountId || !formData.locationId}
              >
                <Minus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}