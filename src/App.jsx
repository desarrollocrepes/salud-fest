import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Activities from './components/Activities';
import AdminPanel from './components/AdminPanel';

function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <Routes>
          <Route path="/" element={<Activities />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;