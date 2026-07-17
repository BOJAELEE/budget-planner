import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import DashboardPage from './pages/DashboardPage';
import ExtraSpendingPage from './pages/ExtraSpendingPage';
import FixedCostsPage from './pages/FixedCostsPage';
import IncomePage from './pages/IncomePage';
import HistoryPage from './pages/HistoryPage';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="app-shell mx-auto min-h-screen max-w-md pb-20">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/extra" element={<ExtraSpendingPage />} />
          <Route path="/fixed" element={<FixedCostsPage />} />
          <Route path="/income" element={<IncomePage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
