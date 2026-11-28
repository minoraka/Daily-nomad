import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { AppLayout } from './layout/AppLayout'
import Board from './pages/Board'
import Dailies from './pages/Dailies'
import Home from './pages/Home'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Register from './pages/Register'

function HomeOrBoard() {
  const { me } = useAuth()
  return me?.role === 'teacher' ? <Navigate to="/board" replace /> : <Home />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomeOrBoard />} />
          <Route path="/board" element={<Board />} />
          <Route path="/dailies" element={<Dailies />} />
          <Route path="/users/:id" element={<Profile />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
