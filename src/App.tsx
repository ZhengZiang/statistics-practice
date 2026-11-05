import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactElement } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Practice from './pages/Practice';
import ExamPaper from './pages/ExamPaper';
import QuestionBank from './pages/QuestionBank';
import WrongQuestions from './pages/WrongQuestions';
import WeaknessAnalysis from './pages/WeaknessAnalysis';
import BookInsights from './pages/BookInsights';
import Login from './pages/Login';
import { getCurrentUser } from './utils/auth';

function RequireAuth({ children }: { children: ReactElement }) {
  if (!getCurrentUser()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/exam" element={<ExamPaper />} />
          <Route path="/questions" element={<QuestionBank />} />
          <Route path="/wrong-questions" element={<WrongQuestions />} />
          <Route path="/weakness" element={<WeaknessAnalysis />} />
          <Route path="/insights" element={<BookInsights />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
