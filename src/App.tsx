import { AppDataProvider } from './context/AppDataContext';
import { AuthProvider } from './context/AuthProvider';
import { AppRoutes } from './routes';

function App() {
  return (
    <AppDataProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </AppDataProvider>
  );
}

export default App;
