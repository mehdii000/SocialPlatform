import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '@/services/authService';

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login or dashboard based on auth status
    if (isAuthenticated()) {
      // TODO: Replace with actual dashboard route when ready
      navigate('/login');
    } else {
      navigate('/login');
    }
  }, [navigate]);

  return null;
}
