import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  
  palette: {
    mode: 'light',
    primary: {
      main: '#2C2C2A',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#888780',
    },
    background: {
      default: '#F1EFE8',
      paper: '#ffffff',
    },
    text: {
      primary: '#2C2C2A',
      secondary: '#5F5E5A',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    fontSize: 16,
    body1: { fontSize: '1rem' },
    body2: { fontSize: '0.925rem' },
    caption: { fontSize: '0.85rem' },
    h4: { fontSize: '2rem' },
    h5: { fontSize: '1.6rem' },
    h6: { fontSize: '1.25rem' },
    button: { textTransform: 'none', fontSize: '1rem' },
  },
  shape: { borderRadius: 8 },
  
});

export default theme;