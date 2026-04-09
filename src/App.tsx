import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import StudentDashboard from "./pages/student/StudentDashboard";
import AvailableExams from "./pages/student/AvailableExams";
import TakeExam from "./pages/student/TakeExam";
import StudentResults from "./pages/student/StudentResults";
import ResultDetail from "./pages/student/ResultDetail";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageExams from "./pages/admin/ManageExams";
import CreateExam from "./pages/admin/CreateExam";
import EditExam from "./pages/admin/EditExam";
import AdminResults from "./pages/admin/AdminResults";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />

            {/* Student routes */}
            <Route path="/student" element={<ProtectedRoute requiredRole="student"><AppLayout><StudentDashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/student/exams" element={<ProtectedRoute requiredRole="student"><AppLayout><AvailableExams /></AppLayout></ProtectedRoute>} />
            <Route path="/student/exam/:examId" element={<ProtectedRoute requiredRole="student"><TakeExam /></ProtectedRoute>} />
            <Route path="/student/results" element={<ProtectedRoute requiredRole="student"><AppLayout><StudentResults /></AppLayout></ProtectedRoute>} />
            <Route path="/student/results/:attemptId" element={<ProtectedRoute requiredRole="student"><AppLayout><ResultDetail /></AppLayout></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AppLayout><AdminDashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/exams" element={<ProtectedRoute requiredRole="admin"><AppLayout><ManageExams /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/create-exam" element={<ProtectedRoute requiredRole="admin"><AppLayout><CreateExam /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/exams/:examId" element={<ProtectedRoute requiredRole="admin"><AppLayout><EditExam /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/results" element={<ProtectedRoute requiredRole="admin"><AppLayout><AdminResults /></AppLayout></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
