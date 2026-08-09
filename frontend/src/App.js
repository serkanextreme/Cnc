import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppProvider } from './context/AppContext';
import Home from './pages/Home';
import Milling from './pages/Milling';
import Turning from './pages/Turning';
import Drilling from './pages/Drilling';
import Materials from './pages/Materials';
import MaterialDetail from './pages/MaterialDetail';
import MaterialForm from './pages/MaterialForm';
import HistoryPage from './pages/History';
import SettingsPage from './pages/Settings';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/freze" element={<Milling />} />
          <Route path="/torna" element={<Turning />} />
          <Route path="/matkap" element={<Drilling />} />
          <Route path="/malzemeler" element={<Materials />} />
          <Route path="/malzeme/yeni" element={<MaterialForm />} />
          <Route path="/malzeme/:id/duzenle" element={<MaterialForm />} />
          <Route path="/malzemeler/:id" element={<MaterialDetail />} />
          <Route path="/gecmis" element={<HistoryPage />} />
          <Route path="/ayarlar" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-center"
        theme="dark"
        toastOptions={{
          style: {
            background: '#182123',
            border: '1px solid #344346',
            color: '#F3F7F5',
            fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
          },
        }}
      />
    </AppProvider>
  );
}
