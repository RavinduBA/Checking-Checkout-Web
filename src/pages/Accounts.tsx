import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { ArrowLeft, Plus, Edit, Trash2, ArrowRightLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Account = Tables<"accounts">;
type Location = Tables<"locations">;

export default function Accounts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    currency: "LKR" as "LKR" | "USD",
    initial_balance: 0,
    location_access: [] as string[]
  });
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferData, setTransferData] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: 0,
    conversionRate: 1,
    note: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsResponse, locationsResponse] = await Promise.all([
        supabase.from("accounts").select("*").order("created_at", { ascending: false }),
        supabase.from("locations").select("*").eq("is_active", true)
      ]);

      if (accountsResponse.error) throw accountsResponse.error;
      if (locationsResponse.error) throw locationsResponse.error;

      setAccounts(accountsResponse.data || []);
      setLocations(locationsResponse.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch accounts data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        const { error } = await supabase
          .from("accounts")
          .update(formData)
          .eq("id", editingAccount.id);
        if (error) throw error;
        toast({ title: "Success", description: "Account updated successfully" });
      } else {
        const { error } = await supabase
          .from("accounts")
          .insert([formData]);
        if (error) throw error;
        toast({ title: "Success", description: "Account added successfully" });
      }
      
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error saving account:", error);
      toast({
        title: "Error",
        description: "Failed to save account",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this account?")) {
      try {
        const { error } = await supabase
          .from("accounts")
          .delete()
          .eq("id", id);
        if (error) throw error;
        toast({ title: "Success", description: "Account deleted successfully" });
        fetchData();
      } catch (error) {
        console.error("Error deleting account:", error);
        toast({
          title: "Error",
          description: "Failed to delete account",
          variant: "destructive",
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      currency: "LKR",
      initial_balance: 0,
      location_access: []
    });
    setEditingAccount(null);
    setShowAddDialog(false);
  };

  const startEdit = (account: Account) => {
    setFormData({
      name: account.name,
      currency: account.currency,
      initial_balance: account.initial_balance,
      location_access: account.location_access
    });
    setEditingAccount(account);
    setShowAddDialog(true);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("account_transfers")
        .insert([{
          from_account_id: transferData.fromAccountId,
          to_account_id: transferData.toAccountId,
          amount: transferData.amount,
          conversion_rate: transferData.conversionRate,
          note: transferData.note
        }]);
      
      if (error) throw error;
      
      toast({ 
        title: "Success", 
        description: "Transfer completed successfully" 
      });
      
      setTransferData({
        fromAccountId: "",
        toAccountId: "",
        amount: 0,
        conversionRate: 1,
        note: ""
      });
      setShowTransferDialog(false);
    } catch (error) {
      console.error("Error creating transfer:", error);
      toast({
        title: "Error",
        description: "Failed to complete transfer",
        variant: "destructive",
      });
    }
  };

  const getExchangeRate = (fromCurrency: string, toCurrency: string) => {
    if (fromCurrency === toCurrency) return 1;
    // Default exchange rates - in real app, these would come from an API
    if (fromCurrency === "USD" && toCurrency === "LKR") return 300;
    if (fromCurrency === "LKR" && toCurrency === "USD") return 0.0033;
    return 1;
  };

  const handleFromAccountChange = (accountId: string) => {
    const fromAccount = accounts.find(acc => acc.id === accountId);
    const toAccount = accounts.find(acc => acc.id === transferData.toAccountId);
    
    if (fromAccount && toAccount) {
      const rate = getExchangeRate(fromAccount.currency, toAccount.currency);
      setTransferData({
        ...transferData,
        fromAccountId: accountId,
        conversionRate: rate
      });
    } else {
      setTransferData({
        ...transferData,
        fromAccountId: accountId
      });
    }
  };

  const handleToAccountChange = (accountId: string) => {
    const fromAccount = accounts.find(acc => acc.id === transferData.fromAccountId);
    const toAccount = accounts.find(acc => acc.id === accountId);
    
    if (fromAccount && toAccount) {
      const rate = getExchangeRate(fromAccount.currency, toAccount.currency);
      setTransferData({
        ...transferData,
        toAccountId: accountId,
        conversionRate: rate
      });
    } else {
      setTransferData({
        ...transferData,
        toAccountId: accountId
      });
    }
  };

  if (loading) {
    return <div className="p-6">Loading accounts...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Account Management</h1>
        <div className="flex gap-2">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
          </Dialog>
          <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transfer Money
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAccount ? "Edit Account" : "Add New Account"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Account Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select value={formData.currency} onValueChange={(value: "LKR" | "USD") => setFormData({ ...formData, currency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LKR">LKR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="initial_balance">Initial Balance</Label>
                <Input
                  id="initial_balance"
                  type="number"
                  step="0.01"
                  value={formData.initial_balance}
                  onChange={(e) => setFormData({ ...formData, initial_balance: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="location_access">Location Access</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="all_locations"
                      checked={formData.location_access.length === 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, location_access: [] });
                        }
                      }}
                    />
                    <Label htmlFor="all_locations" className="text-sm">All Locations</Label>
                  </div>
                  {locations.map((location) => (
                    <div key={location.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={location.id}
                        checked={formData.location_access.includes(location.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              location_access: [...formData.location_access, location.id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              location_access: formData.location_access.filter(id => id !== location.id)
                            });
                          }
                        }}
                      />
                      <Label htmlFor={location.id} className="text-sm">{location.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingAccount ? "Update Account" : "Add Account"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        
        <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Money Between Accounts</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <Label htmlFor="fromAccount">From Account</Label>
                <Select value={transferData.fromAccountId} onValueChange={handleFromAccountChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source account" />
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
                <Label htmlFor="toAccount">To Account</Label>
                <Select value={transferData.toAccountId} onValueChange={handleToAccountChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.filter(acc => acc.id !== transferData.fromAccountId).map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({account.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={transferData.amount}
                  onChange={(e) => setTransferData({ ...transferData, amount: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              
              {(() => {
                const fromAccount = accounts.find(acc => acc.id === transferData.fromAccountId);
                const toAccount = accounts.find(acc => acc.id === transferData.toAccountId);
                return fromAccount && toAccount && fromAccount.currency !== toAccount.currency && (
                  <div>
                    <Label htmlFor="conversionRate">Conversion Rate ({fromAccount.currency} to {toAccount.currency})</Label>
                    <Input
                      id="conversionRate"
                      type="number"
                      step="0.0001"
                      value={transferData.conversionRate}
                      onChange={(e) => setTransferData({ ...transferData, conversionRate: parseFloat(e.target.value) || 1 })}
                      required
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      {transferData.amount} {fromAccount.currency} = {(transferData.amount * transferData.conversionRate).toFixed(2)} {toAccount.currency}
                    </p>
                  </div>
                );
              })()}
              
              <div>
                <Label htmlFor="note">Note (Optional)</Label>
                <Input
                  id="note"
                  value={transferData.note}
                  onChange={(e) => setTransferData({ ...transferData, note: e.target.value })}
                  placeholder="Transfer description..."
                />
              </div>
              
              <div className="flex gap-2">
                <Button type="submit">Complete Transfer</Button>
                <Button type="button" variant="outline" onClick={() => setShowTransferDialog(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {accounts.map((account) => (
          <Card key={account.id} className="border-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{account.name}</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startEdit(account)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(account.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Currency:</span> {account.currency}
                </div>
                <div>
                  <span className="font-medium">Initial Balance:</span> {account.currency === "LKR" ? "Rs." : "$"}{account.initial_balance.toLocaleString()}
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Location Access:</span> {
                    account.location_access.length === 0 
                      ? "All Locations" 
                      : locations
                          .filter(loc => account.location_access.includes(loc.id))
                          .map(loc => loc.name)
                          .join(", ")
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}