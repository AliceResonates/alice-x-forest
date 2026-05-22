import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Feed from './pages/Feed';
import ProfilePage from './pages/ProfilePage';
import CompanionsPage from './pages/CompanionsPage';
import TeamsPage from './pages/TeamsPage';
import TeamDetail from './pages/TeamDetail';
import PageNotFound from './pages/PageNotFound';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Feed />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="companions" element={<CompanionsPage />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="teams/:id" element={<TeamDetail />} />
          <Route path="*" element={<PageNotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}
