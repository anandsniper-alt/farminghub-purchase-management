import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Vendors from './pages/Vendors.jsx';
import FollowUps from './pages/FollowUps.jsx';
import VendorImport from './pages/VendorImport.jsx';
import VendorForm from './pages/VendorForm.jsx';
import VendorDetail from './pages/VendorDetail.jsx';
import Expos from './pages/Expos.jsx';
import Categories from './pages/Categories.jsx';
import Components from './pages/Components.jsx';
import Concentration from './pages/Concentration.jsx';
import Analytics from './pages/Analytics.jsx';
import Settings from './pages/Settings.jsx';
import PendingSync from './pages/PendingSync.jsx';
import GetApp from './pages/GetApp.jsx';
import UsersPage from './pages/Users.jsx';
import NotFound from './pages/NotFound.jsx';
 
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/follow-ups" element={<FollowUps />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/vendors/import" element={<VendorImport />} />
        <Route path="/vendors/new" element={<VendorForm />} />
        <Route path="/vendors/:id" element={<VendorDetail />} />
        <Route path="/vendors/:id/edit" element={<VendorForm />} />
        <Route path="/expos" element={<Expos />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/components" element={<Components />} />
        <Route path="/concentration" element={<Concentration />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/pending" element={<PendingSync />} />
        <Route path="/get-app" element={<GetApp />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
