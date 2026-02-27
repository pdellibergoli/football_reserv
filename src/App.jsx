import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import MatchDetail from './pages/MatchDetail';
import CreateMatch from './pages/CreateMatch';
import Profile from './pages/Profile';
import Archive from './pages/Archive';
import RatePlayers from './pages/RatePlayers';
import Navbar from './components/Navbar';
import ForgotPassword from './pages/ForgotPassword';
import './App.css';

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { currentUser } = useAuth();

  return (
    <>
      {currentUser && <Navbar />}
      <Routes>
        <Route path="/login" element={currentUser ? <Navigate to="/" /> : <Login />} />
        <Route path="/signup" element={currentUser ? <Navigate to="/" /> : <Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/match/:id" element={<PrivateRoute><MatchDetail /></PrivateRoute>} />
        <Route path="/create-match" element={<PrivateRoute><CreateMatch /></PrivateRoute>} />
        <Route path="/edit-match/:id" element={<PrivateRoute><CreateMatch /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/archive" element={<PrivateRoute><Archive /></PrivateRoute>} />
        <Route path="/rate-players/:matchId" element={<PrivateRoute><RatePlayers /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;