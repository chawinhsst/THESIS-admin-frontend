import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import VolunteerDetailModal from '../components/VolunteerDetailModal';
import { 
    UsersIcon, 
    CheckCircleIcon, 
    XCircleIcon, 
    ClockIcon, 
    MagnifyingGlassIcon, 
    ChevronUpIcon, 
    ChevronDownIcon, 
    EnvelopeIcon, 
    CalendarIcon,
    PencilSquareIcon, 
    TrashIcon, 
    ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const ITEMS_PER_PAGE = 10;

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
                {isSorted ? (direction === 'ascending' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />) : <ChevronDownIcon className="h-4 w-4 text-slate-300" />}
            </div>
        </th>
    );
};

export default function VolunteerListPage() {
  const { state: locationState } = useLocation();
  const { authToken } = useAuth();
  const navigate = useNavigate();
  
  const [allVolunteers, setAllVolunteers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // --- THIS IS THE CHANGED LINE ---
  const [activeStatus, setActiveStatus] = useState(locationState?.defaultStatus || 'all');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'registration_date', direction: 'descending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);

  const [sliderStyle, setSliderStyle] = useState({});
  const tabsRef = useRef(new Map());

  useEffect(() => {
    const fetchVolunteers = async () => {
      if (!authToken) return;
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/volunteers/`, { headers: { 'Authorization': `Token ${authToken}` } });
        if (!response.ok) throw new Error('Failed to fetch volunteer data.');
        const data = await response.json();
        setAllVolunteers(data.results || data);
      } catch (err) { setError(err.message); } finally { setIsLoading(false); }
    };
    fetchVolunteers();
  }, [authToken]);

  useEffect(() => {
    const activeTabNode = tabsRef.current.get(activeStatus);
    if (activeTabNode) {
      setSliderStyle({ left: activeTabNode.offsetLeft, width: activeTabNode.offsetWidth });
    }
  }, [activeStatus, allVolunteers]);

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

  const goToDetailPage = (id) => {
    navigate(`/volunteers/${id}`);
  };
  
  const statusTabs = [
    { name: 'All', value: 'all', icon: UsersIcon }, 
    { name: 'Pending', value: 'pending', icon: ClockIcon }, 
    { name: 'Approved', value: 'approved', icon: CheckCircleIcon }, 
    { name: 'Rejected', value: 'rejected', icon: XCircleIcon },
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
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input type="text" placeholder="Search volunteers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"/>
            </div>
          </div>
          <div className="mt-8 mb-6">
            <div className="relative inline-flex items-center bg-slate-200/60 rounded-lg p-1.5">
              <span className="absolute left-0 top-0 bottom-0 z-0 h-full rounded-md bg-white shadow-sm transition-all duration-300 ease-in-out" style={sliderStyle} />
              {statusTabs.map((tab) => (
                <button
                  key={tab.value}
                  ref={(node) => { if (node) tabsRef.current.set(tab.value, node); }}
                  onClick={() => { setActiveStatus(tab.value); setCurrentPage(1); }}
                  className={`relative z-10 flex items-center justify-center whitespace-nowrap rounded-md py-2 text-sm font-semibold transition-colors duration-300 px-3 sm:px-4 ${
                    activeStatus === tab.value ? 'text-sky-600' : 'text-slate-600 hover:text-sky-600'
                  }`}
                  title={tab.name}
                >
                  <tab.icon className="h-5 w-5" />
                  <span className="hidden sm:inline ml-2">{tab.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 overflow-hidden">
            <table className="w-full hidden md:table">
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
                { !isLoading && !error && paginatedVolunteers.length > 0 && paginatedVolunteers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-800">{v.first_name} {v.last_name}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{v.email}</td>
                    <td className="whitespace-nowrap px-6 py-4"><StatusBadge status={v.status} /></td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">{new Date(v.registration_date).toLocaleDateString()}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-x-4">
                        <button onClick={() => handleOpenModal(v)} className="p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-sky-700" title="Quick View/Edit Status">
                          <PencilSquareIcon className="h-5 w-5" />
                        </button>
                        
                        {v.status === 'approved' && (
                          <button onClick={() => goToDetailPage(v.id)} className="p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-green-700" title="Go to Volunteer Workspace">
                            <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                          </button>
                        )}

                        <button onClick={() => handleDeleteVolunteer(v.id)} disabled={v.status !== 'pending'} className="p-2 rounded-md text-slate-500 hover:bg-rose-100 hover:text-rose-700 disabled:opacity-50 disabled:cursor-not-allowed" title="Delete Registration">
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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