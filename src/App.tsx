import { AppDataProvider } from './context/AppDataContext';
import { AppRoutes } from './routes';

function App() {
  return (
    <AppDataProvider>
      <AppRoutes />
    </AppDataProvider>
  );
}

export default App;
