// admin-frontend/src/pages/VolunteerListPage.jsx
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import VolunteerDetailModal from '../components/VolunteerDetailModal';
import { useLocation } from 'react-router-dom';
import { 
    FiUsers, FiCheckSquare, FiXSquare, FiGrid, FiEdit, FiTrash2, 
    FiInbox, FiAlertCircle, FiSearch, FiChevronUp, FiChevronDown, FiMail, FiCalendar 
} from 'react-icons/fi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const ITEMS_PER_PAGE = 10;

// --- Helper Components ---

const StatusBadge = ({ status }) => {
  const statusStyles = {
    approved: 'bg-emerald-100 text-emerald-800',
    pending: 'bg-amber-100 text-amber-800',
    rejected: 'bg-rose-100 text-rose-800',
  };
  return (
    <span className={`inline-flex items-center gap-x-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${statusStyles[status].replace('text', 'bg').replace('100', '500')}`}></span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const SortableHeader = ({ children, name, sortConfig, onSort }) => {
    const isSorted = sortConfig.key === name;
    const direction = isSorted ? sortConfig.direction : 'none';
    return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer" onClick={() => onSort(name)}>
            <div className="flex items-center gap-2">
                {children}
                {isSorted ? (direction === 'ascending' ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />) : <FiChevronDown className="h-4 w-4 text-slate-300" />}
            </div>
        </th>
    );
};

// --- Main Page Component ---

export default function VolunteerListPage() {
  const { state: locationState } = useLocation();
  const { authToken } = useAuth();
  
  const [allVolunteers, setAllVolunteers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeStatus, setActiveStatus] = useState(locationState?.defaultStatus || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'registration_date', direction: 'descending' });
  const [currentPage, setCurrentPage] = useState(1);
  
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);

  useEffect(() => {
    const fetchVolunteers = async () => {
      if (!authToken) return;
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/volunteers/`, { headers: { 'Authorization': `Token ${authToken}` } });
        if (!response.ok) throw new Error('Failed to fetch volunteer data.');
        const data = await response.json();
        setAllVolunteers(data);
      } catch (err) { setError(err.message); } finally { setIsLoading(false); }
    };
    fetchVolunteers();
  }, [authToken]);

  const processedVolunteers = useMemo(() => {
    let filtered = [...allVolunteers];
    if (activeStatus !== 'all') filtered = filtered.filter(v => v.status === activeStatus);
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(v =>
        `${v.first_name} ${v.last_name}`.toLowerCase().includes(lowercasedQuery) ||
        v.email.toLowerCase().includes(lowercasedQuery)
      );
    }
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [allVolunteers, activeStatus, searchQuery, sortConfig]);

  const paginatedVolunteers = processedVolunteers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(processedVolunteers.length / ITEMS_PER_PAGE);

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };

  const handleOpenModal = (volunteer) => setSelectedVolunteer(volunteer);
  const handleCloseModal = () => setSelectedVolunteer(null);
  const handleUpdateVolunteer = (updated) => setAllVolunteers(allVolunteers.map(v => v.id === updated.id ? updated : v));
  const handleDeleteVolunteer = async (id) => {
    if (window.confirm("Are you sure? This cannot be undone.")) {
      try {
        await fetch(`${API_BASE_URL}/api/volunteers/${id}/`, { method: 'DELETE', headers: { 'Authorization': `Token ${authToken}` } });
        setAllVolunteers(allVolunteers.filter(v => v.id !== id));
      } catch (err) { alert(`Error: ${err.message}`); }
    }
  };
  
  const statusTabs = [
    { name: 'All', value: 'all', icon: FiGrid }, { name: 'Pending', value: 'pending', icon: FiUsers },
    { name: 'Approved', value: 'approved', icon: FiCheckSquare }, { name: 'Rejected', value: 'rejected', icon: FiXSquare },
  ];

  return (
    <>
      <main className="flex-1 bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="block md:flex md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Volunteer Management</h1>
              <p className="mt-1 text-sm text-slate-600">Search, sort, and manage all registrations.</p>
            </div>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input type="text" placeholder="Search volunteers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"/>
            </div>
          </div>

          <div className="mt-6 mb-6">
            <div className="p-1.5 inline-flex items-center gap-x-2 bg-slate-200/60 rounded-lg overflow-x-auto">
              {statusTabs.map((tab) => (
                <button key={tab.name} onClick={() => { setActiveStatus(tab.value); setCurrentPage(1); }}
                  className={`flex items-center gap-x-2 whitespace-nowrap py-2 px-4 rounded-md text-sm font-semibold transition-all ${activeStatus === tab.value ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-600 hover:bg-white/60 hover:text-sky-600'}`}>
                  <tab.icon className="h-5 w-5" /> {tab.name}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 overflow-hidden">
            {/* Mobile Card View */}
            <div className="divide-y divide-slate-200 md:hidden">
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 animate-pulse"><div className="h-16 w-full rounded-md bg-slate-200"></div></div>
              )) : paginatedVolunteers.length > 0 ? paginatedVolunteers.map((v) => (
                <div key={v.id} className="p-4 text-sm"> {/* FIXED: Standardized base font size */}
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-800">{v.first_name} {v.last_name}</p>
                    <StatusBadge status={v.status} />
                  </div>
                  <div className="mt-2 text-slate-600 space-y-1">
                    <p className="flex items-center gap-2"><FiMail /> <span>{v.email}</span></p>
                    <p className="flex items-center gap-2"><FiCalendar /> <span>{new Date(v.registration_date).toLocaleDateString()}</span></p>
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-x-3">
                    <button onClick={() => handleOpenModal(v)} className="p-2 rounded-md bg-slate-100 text-slate-600 hover:bg-sky-100 hover:text-sky-700" title="View / Edit Details"><FiEdit className="h-4 w-4" /></button>
                    <button onClick={() => handleDeleteVolunteer(v.id)} disabled={v.status !== 'pending'} className="p-2 rounded-md bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-700 disabled:opacity-50" title="Delete Registration"><FiTrash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-16"><FiInbox className="mx-auto h-12 w-12 text-slate-400" /><p className="mt-4 text-sm font-medium text-slate-600">No volunteers found.</p></div>
              )}
            </div>

            {/* Desktop Table View */}
            <table className="min-w-full hidden md:table">
              <thead className="bg-slate-100">
                <tr>
                  <SortableHeader name="last_name" sortConfig={sortConfig} onSort={handleSort}>Name</SortableHeader>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <SortableHeader name="registration_date" sortConfig={sortConfig} onSort={handleSort}>Registration Date</SortableHeader>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan="5" className="p-4"><div className="h-10 w-full rounded-md bg-slate-200 animate-pulse"></div></td></tr>
                ) : error ? (
                  <tr><td colSpan="5" className="text-center py-16"><FiAlertCircle className="mx-auto h-12 w-12 text-slate-400" /><p className="mt-4 text-sm font-medium text-slate-600">Error: {error}</p></td></tr>
                ) : paginatedVolunteers.length > 0 ? paginatedVolunteers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-800">{v.first_name} {v.last_name}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{v.email}</td>
                    <td className="whitespace-nowrap px-6 py-4"><StatusBadge status={v.status} /></td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{new Date(v.registration_date).toLocaleDateString()}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-x-3">
                        <button onClick={() => handleOpenModal(v)} className="p-2 rounded-md bg-slate-100 text-slate-600 hover:bg-sky-100 hover:text-sky-700" title="View / Edit Details"><FiEdit className="h-4 w-4" /></button>
                        <button onClick={() => handleDeleteVolunteer(v.id)} disabled={v.status !== 'pending'} className="p-2 rounded-md bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-700 disabled:opacity-50" title="Delete Registration"><FiTrash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" className="text-center py-16"><FiInbox className="mx-auto h-12 w-12 text-slate-400" /><p className="mt-4 text-sm font-medium text-slate-600">No volunteers found.</p></td></tr>
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
                    <div><p className="text-sm text-slate-700">Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span></p></div>
                    <div className="inline-flex -space-x-px rounded-md shadow-sm">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="relative inline-flex items-center rounded-l-md px-3 py-1.5 text-slate-500 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50">&lt;</button>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="relative inline-flex items-center rounded-r-md px-3 py-1.5 text-slate-500 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50">&gt;</button>
                    </div>
                </div>
            )}
          </div>
        </div>
      </main>
      
      {selectedVolunteer && <VolunteerDetailModal volunteer={selectedVolunteer} onClose={handleCloseModal} onUpdate={handleUpdateVolunteer}/>}
    </>
  );
}