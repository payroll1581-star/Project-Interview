import { BrowserRouter, Route, Routes } from 'react-router';
import { AppLayout } from './components/layout/AppLayout';
import { RequireAuth } from './components/auth/RequireAuth';
import { HomeRedirect } from './components/auth/HomeRedirect';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CandidatesPage } from './pages/CandidatesPage';
import { CandidateDetailPage } from './pages/CandidateDetailPage';
import { SchedulingPage } from './pages/SchedulingPage';
import { InterviewersPage } from './pages/InterviewersPage';
import { EvaluationCriteriaPage } from './pages/EvaluationCriteriaPage';
import { ActivityLogPage } from './pages/ActivityLogPage';
import { MyInterviewsPage } from './pages/MyInterviewsPage';
import { AppraisalReportPage } from './pages/AppraisalReportPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route
          path="candidates/:candidateId/interviews/:interviewId/appraisal"
          element={
            <RequireAuth>
              <AppraisalReportPage />
            </RequireAuth>
          }
        />
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<HomeRedirect />} />
          <Route path="my-interviews" element={<MyInterviewsPage />} />
          <Route
            path="dashboard"
            element={
              <RequireAuth roles={['admin']}>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="candidates"
            element={
              <RequireAuth roles={['admin']}>
                <CandidatesPage />
              </RequireAuth>
            }
          />
          <Route
            path="candidates/:candidateId"
            element={
              <RequireAuth roles={['admin']}>
                <CandidateDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="scheduling"
            element={
              <RequireAuth roles={['admin']}>
                <SchedulingPage />
              </RequireAuth>
            }
          />
          <Route
            path="interviewers"
            element={
              <RequireAuth roles={['admin']}>
                <InterviewersPage />
              </RequireAuth>
            }
          />
          <Route
            path="evaluation-criteria"
            element={
              <RequireAuth roles={['admin']}>
                <EvaluationCriteriaPage />
              </RequireAuth>
            }
          />
          <Route
            path="activity-log"
            element={
              <RequireAuth roles={['admin']}>
                <ActivityLogPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
