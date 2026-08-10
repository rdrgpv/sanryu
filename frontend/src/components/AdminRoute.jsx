import ProtectedRoute from './ProtectedRoute.jsx';
import AdminLayout from './AdminLayout.jsx';

export default function AdminRoute({ children }) {
  return (
    <ProtectedRoute>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}
