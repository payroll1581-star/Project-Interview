import { Navigate } from 'react-router';
import { useAuth } from '../../context/useAuth';
import { getHomePath } from '../../lib/roleHome';

export function HomeRedirect() {
  const { currentUser } = useAuth();
  return <Navigate to={getHomePath(currentUser?.role)} replace />;
}
