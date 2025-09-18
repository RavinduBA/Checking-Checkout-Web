import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Income from "./pages/Income";
import PaymentForm from "./pages/PaymentForm";
import Expense from "./pages/Expense";
import Calendar from "@/pages/Calendar";
import Beds24Integration from "@/pages/Beds24Integration";
import Reports from "@/pages/Reports";
import FinancialReports from "./pages/FinancialReports";
import Accounts from "./pages/Accounts";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import BookingForm from "./pages/BookingForm";
import MasterFiles from "./pages/MasterFiles";
import ReservationDetails from "./pages/ReservationDetails";
import ReservationFormCompact from "./pages/ReservationFormCompact";
import Reservations from "./pages/Reservations";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/app" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="beds24" element={<Beds24Integration />} />
              <Route path="master-files" element={<MasterFiles />} />
              <Route path="income" element={<Income />} />
              <Route path="payments/new" element={<PaymentForm />} />
              <Route path="expense" element={<Expense />} />
              <Route path="booking/new" element={<BookingForm />} />
              <Route path="booking/edit/:id" element={<BookingForm />} />
              <Route path="reservations" element={<Reservations />} />
              <Route path="reservations/new" element={<ReservationFormCompact />} />
              <Route path="reservations/edit/:id" element={<ReservationFormCompact />} />
              <Route path="reservations/:id" element={<ReservationDetails />} />
              <Route path="reports" element={<Reports />} />
              <Route path="financial-reports" element={<FinancialReports />} />
              <Route path="accounts" element={<Accounts />} />
              <Route path="users" element={<Users />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
