import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { LocationProvider } from "@/context/LocationContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { AuthRedirect } from "./components/AuthRedirect";
import Dashboard from "./pages/Dashboard";
import Income from "./pages/Income";
import PaymentForm from "./pages/PaymentForm";
import Expense from "./pages/Expense";
import EnhancedCalendar from "./pages/EnhancedCalendar";
import BookingChannelsIntegration from "@/pages/BookingChannelsIntegration";
import Reports from "@/pages/Reports";
import FinancialReports from "./pages/FinancialReports";
import Accounts from "./pages/Accounts";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
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
        <LocationProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<AuthRedirect />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
            </Route>
            <Route path="/calendar" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<EnhancedCalendar />} />
            </Route>
            <Route path="/booking-channels" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<BookingChannelsIntegration />} />
            </Route>
            <Route path="/master-files" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<MasterFiles />} />
            </Route>
            <Route path="/income" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Income />} />
            </Route>
            <Route path="/payments/new" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<PaymentForm />} />
            </Route>
            <Route path="/expense" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Expense />} />
            </Route>
            <Route path="/booking/new" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<BookingForm />} />
            </Route>
            <Route path="/booking/edit/:id" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<BookingForm />} />
            </Route>
            <Route path="/reservations" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Reservations />} />
            </Route>
            <Route path="/reservations/new" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<ReservationFormCompact />} />
            </Route>
            <Route path="/reservations/edit/:id" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<ReservationFormCompact />} />
            </Route>
            <Route path="/reservations/:id" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<ReservationDetails />} />
            </Route>
            <Route path="/reports" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Reports />} />
            </Route>
            <Route path="/financial-reports" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<FinancialReports />} />
            </Route>
            <Route path="/accounts" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Accounts />} />
            </Route>
            <Route path="/users" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Users />} />
            </Route>
            <Route path="/settings" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </LocationProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
