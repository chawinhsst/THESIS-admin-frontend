import { getAuthToken } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export async function loader({ params }) {
  const { sessionId } = params;
  const authToken = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/`, {
    headers: { 'Authorization': `Token ${authToken}` },
  });

  if (!response.ok) {
    throw response;
  }
  
  return response.json();
}