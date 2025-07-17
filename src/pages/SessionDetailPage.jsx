import { useLoaderData, Link, useNavigate } from 'react-router-dom';
import { 
    ArrowLeftIcon,
    CalendarIcon, 
    UserIcon,
    CpuChipIcon,
    TagIcon,
} from '@heroicons/react/24/outline';
// Note: You'll need to install a charting library like 'recharts' or 'chart.js'
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getAuthToken } from '../utils/auth'; // We'll create this helper

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// This loader function runs BEFORE the page component renders
export async function loader({ params }) {
  const { sessionId } = params;
  const authToken = getAuthToken(); // Get token using a helper

  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/`, {
    headers: { 'Authorization': `Token ${authToken}` },
  });

  // If the session is not found (404) or another error occurs,
  // this will automatically trigger the `errorElement` in your router.
  if (!response.ok) {
    throw response;
  }
  
  return response.json();
}

// A reusable card for displaying stats
const StatCard = ({ icon, label, value, colorClass = 'text-slate-800' }) => (
  <div className="bg-white p-4 rounded-xl shadow-md flex items-center">
    <div className="flex-shrink-0 mr-4">{icon}</div>
    <div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`text-xl font-bold ${colorClass}`}>{value}</p>
    </div>
  </div>
);

// The main page component
export default function SessionDetailPage() {
  // `useLoaderData` gives us the data returned from our loader function
  const session = useLoaderData();
  const navigate = useNavigate();

  const predictionColor = session.ml_prediction === 'Anomaly' ? 'text-red-500' : 'text-green-600';

  return (
    <div className="p-4 sm:p-8 bg-slate-50 min-h-full">
      {/* --- Header --- */}
      <div className="mb-6 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)} // Go back to the previous page
          className="p-2 rounded-full hover:bg-slate-200 transition-colors"
        >
          <ArrowLeftIcon className="w-6 h-6 text-slate-700" />
        </button>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Session Detail
        </h1>
      </div>

      {/* --- Stat Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          icon={<CalendarIcon className="w-8 h-8 text-sky-500" />}
          label="Session Date"
          value={new Date(session.session_date).toLocaleDateString()}
        />
        <StatCard 
          icon={<UserIcon className="w-8 h-8 text-sky-500" />}
          label="Volunteer"
          value={`${session.volunteer_first_name} ${session.volunteer_last_name}`}
        />
        <StatCard 
          icon={<CpuChipIcon className="w-8 h-8 text-sky-500" />}
          label="ML Prediction"
          value={session.ml_prediction || 'N/A'}
          colorClass={predictionColor}
        />
        <StatCard 
          icon={<TagIcon className="w-8 h-8 text-sky-500" />}
          label="Admin Label"
          value={session.admin_label || 'Normal'}
        />
      </div>

      {/* --- Chart Placeholder --- */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Heart Rate Over Time</h3>
        <div className="w-full h-80 bg-slate-100 rounded-md flex items-center justify-center">
          <p className="text-slate-500">
            Chart Area: Install a library like Recharts to display time-series data here.
          </p>
          {/* Example with Recharts:
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={session.timeseries_data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="heart_rate" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          */}
        </div>
      </div>
    </div>
  );
}