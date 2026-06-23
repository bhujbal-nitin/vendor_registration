import { Routes, Route, Navigate } from 'react-router-dom'
import VendorLogin from './pages/vendorRegistration/login/vendorLogin'
import VendorHome from './pages/vendorRegistration/vendorHome'
import DocumentUpload from './pages/vendorRegistration/documentUpload'
import VendorRegistrationForm from './pages/vendorRegistration/vendorRegistrationForm'
import FinanceHome from './pages/financeView/financeHome'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/vendor-registration" replace />} />

      <Route path="/vendor-registration" element={<VendorLogin />} />
      <Route path="/vendor-registration/home" element={<VendorHome />} />
      <Route path="/vendor-registration/upload-documents" element={<DocumentUpload />} />
      <Route path="/vendor-registration/form" element={<VendorRegistrationForm />} />

      <Route path="/finance" element={<FinanceHome />} />

      <Route path="*" element={<Navigate to="/vendor-registration" replace />} />
    </Routes>
  )
}

export default App
