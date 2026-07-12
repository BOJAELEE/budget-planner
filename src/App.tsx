import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import DashboardPage from './pages/DashboardPage';
import FixedCostsPage from './pages/FixedCostsPage';
import IncomePage from './pages/IncomePage';
import HistoryPage from './pages/HistoryPage';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="mx-auto max-w-md pb-16">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/fixed" element={<FixedCostsPage />} />
          <Route path="/income" element={<IncomePage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
