import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme/theme';
import AppRouter from './routes/AppRouter';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppRouter />  {/* ← el BrowserRouter vive adentro de acá */}
    </ThemeProvider>
  );
}