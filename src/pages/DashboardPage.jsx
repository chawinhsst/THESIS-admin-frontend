// admin-frontend/src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiUsers, FiClock, FiCheckCircle, FiXCircle, FiArrowRight } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// --- Reusable Components ---

const KpiCard = ({ title, value, icon: Icon, color, status }) => (
  <Link 
    to="/volunteers" 
    state={{ defaultStatus: status }} 
    className="block rounded-xl border bg-white p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1"
  >
    <div className="flex items-center justify-between">
      {/* FIXED: Standardized title size to match other widgets */}
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      <Icon className={`h-6 w-6 ${color}`} />
    </div>
    <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
  </Link>
);

const SkeletonCard = () => (
  <div className="rounded-xl border bg-white p-6 shadow-sm animate-pulse">
    <div className="h-4 w-3/4 rounded bg-slate-200"></div>
    <div className="mt-4 h-8 w-1/4 rounded bg-slate-200"></div>
  </div>
);

// --- Dashboard Sub-Components ---

const RecentRegistrations = ({ volunteers, isLoading }) => (
  <div className="rounded-xl border bg-white p-6 shadow-sm">
    <h3 className="text-base font-semibold text-slate-800">Recent Registrations</h3>
    <div className="mt-4 space-y-4">
      {isLoading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 animate-pulse">
            <div className="h-10 w-10 rounded-full bg-slate-200"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-slate-200"></div>
              <div className="h-3 w-1/2 rounded bg-slate-200"></div>
            </div>
          </div>
        ))
      ) : (
        volunteers.slice(0, 5).map(v => (
          <div key={v.id} className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600">
              {v.first_name?.[0]}{v.last_name?.[0]}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">{v.first_name} {v.last_name}</p>
              <p className="text-xs text-slate-500">{v.email}</p>
            </div>
          </div>
        ))
      )}
    </div>
    <Link to="/volunteers" className="mt-4 flex items-center justify-end gap-1 text-sm font-semibold text-sky-600 hover:text-sky-700">
      View All
      <FiArrowRight className="h-4 w-4" />
    </Link>
  </div>
);

const PlatformChart = ({ volunteers, isLoading }) => {
    const processData = () => {
        if (!volunteers || volunteers.length === 0) return [];
        const counts = volunteers.reduce((acc, v) => {
            const platform = v.platform || "Unknown";
            acc[platform] = (acc[platform] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    };

    return (
        <div className="rounded-xl border bg-white p-6 shadow-sm col-span-1 lg:col-span-2">
            <h3 className="text-base font-semibold text-slate-800">Platform Distribution</h3>
            <div className="mt-4 h-80">
                {isLoading ? <div className="h-full w-full animate-pulse rounded-md bg-slate-200"></div> :
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={processData()} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-25} textAnchor="end" height={60} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                            <Tooltip cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem' }} />
                            <Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                }
            </div>
        </div>
    );
};

// --- Main Dashboard Page ---

export default function DashboardPage() {
  const [allVolunteers, setAllVolunteers] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const { authToken } = useAuth();

  useEffect(() => {
    const fetchVolunteers = async () => {
      if (!authToken) return;
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/volunteers/`, {
          headers: { 'Authorization': `Token ${authToken}` },
        });
        if (!response.ok) throw new Error('Failed to fetch volunteer data.');
        const data = await response.json();
        const sortedData = data.sort((a, b) => new Date(b.registration_date) - new Date(a.registration_date));
        setAllVolunteers(sortedData);
        setStats({
          total: data.length,
          pending: data.filter(v => v.status === 'pending').length,
          approved: data.filter(v => v.status === 'approved').length,
          rejected: data.filter(v => v.status === 'rejected').length,
        });
      } catch (err) { console.error(err.message); } finally { setIsLoading(false); }
    };
    fetchVolunteers();
  }, [authToken]);

  return (
    <main className="flex-1 bg-slate-50 p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
      
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />) :
            <>
                <KpiCard title="Total Volunteers" value={stats.total} icon={FiUsers} color="text-sky-500" status="all" />
                <KpiCard title="Pending Approval" value={stats.pending} icon={FiClock} color="text-amber-500" status="pending" />
                <KpiCard title="Approved Volunteers" value={stats.approved} icon={FiCheckCircle} color="text-emerald-500" status="approved" />
                <KpiCard title="Rejected Applicants" value={stats.rejected} icon={FiXCircle} color="text-rose-500" status="rejected" />
            </>
        }
      </div>
      
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <PlatformChart volunteers={allVolunteers} isLoading={isLoading} />
          <RecentRegistrations volunteers={allVolunteers} isLoading={isLoading} />
      </div>
    </main>
  );
}