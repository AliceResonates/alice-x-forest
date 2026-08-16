import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Feed from './pages/Feed';
import ProfilePage from './pages/ProfilePage';
import CompanionsPage from './pages/CompanionsPage';
import TeamsPage from './pages/TeamsPage';
import TeamDetail from './pages/TeamDetail';
import PageNotFound from './pages/PageNotFound';
import ChatRoomPage from './pages/ChatRoomPage';
import ForestEntry from './components/forest/ForestEntry';
import ForestPage from './pages/ForestPage';
import ResearchPage from './pages/ResearchPage';

function ForestEntryPage() {
  const navigate = useNavigate();
  return (
    <ForestEntry
      onSessionReady={(sessionId) => navigate(sessionId ? `/chat/${sessionId}` : '/feed')}
    />
  );
}

function ChatPage() {
  const { sessionId } = useParams();
  return <ChatRoomPage roomId={sessionId} />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<ForestEntryPage />} />
          <Route path="feed" element={<Feed />} />
          <Route path="forest" element={<ForestPage />} />
          <Route path="chat/:sessionId" element={<ChatPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="companions" element={<CompanionsPage />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="teams/:id" element={<TeamDetail />} />
          <Route path="research" element={<ResearchPage />} />
          <Route path="*" element={<PageNotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}
