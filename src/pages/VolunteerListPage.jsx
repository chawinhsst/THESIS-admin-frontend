import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import VolunteerDetailModal from '../components/VolunteerDetailModal';
import { 
    FiUsers, FiCheckSquare, FiXSquare, FiGrid, FiEdit, FiTrash2, 
    FiInbox, FiAlertCircle, FiSearch, FiChevronUp, FiChevronDown 
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

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="whitespace-nowrap px-6 py-4"><div className="h-4 bg-slate-200 rounded w-3/4"></div></td>
    <td className="whitespace-nowrap px-6 py-4 hidden sm:table-cell"><div className="h-4 bg-slate-200 rounded w-full"></div></td>
    <td className="whitespace-nowrap px-6 py-4"><div className="h-6 bg-slate-200 rounded-full w-20"></div></td>
    <td className="whitespace-nowrap px-6 py-4 hidden md:table-cell"><div className="h-4 bg-slate-200 rounded w-1/2"></div></td>
    <td className="whitespace-nowrap px-6 py-4"><div className="flex items-center gap-x-3"><div className="h-8 w-8 bg-slate-200 rounded-md"></div><div className="h-8 w-8 bg-slate-200 rounded-md"></div></div></td>
  </tr>
);

const SortableHeader = ({ children, name, sortConfig, onSort }) => {
    const isSorted = sortConfig.key === name;
    const direction = isSorted ? sortConfig.direction : 'none';
    
    return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer" onClick={() => onSort(name)}>
            <div className="flex items-center gap-2">
                {children}
                {isSorted ? (
                    direction === 'ascending' ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />
                ) : (
                    <FiChevronDown className="h-4 w-4 text-slate-300" />
                )}
            </div>
        </th>
    );
};

// --- Main Page Component ---

export default function VolunteerListPage() {
  const [allVolunteers, setAllVolunteers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { authToken } = useAuth();
  
  // State for page functionality
  const [activeStatus, setActiveStatus] = useState('all'); // Default is now 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'registration_date', direction: 'descending' });
  const [currentPage, setCurrentPage] = useState(1);
  
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);

  // Fetch data on initial load
  useEffect(() => {
    const fetchVolunteers = async () => {
      if (!authToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/volunteers/`, { headers: { 'Authorization': `Token ${authToken}` } });
        if (!response.ok) throw new Error('Failed to fetch volunteer data.');
        const data = await response.json();
        setAllVolunteers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVolunteers();
  }, [authToken]);

  // Memoized processing of volunteers: filtering, searching, and sorting
  const processedVolunteers = useMemo(() => {
    let filtered = [...allVolunteers];

    // 1. Filter by status
    if (activeStatus !== 'all') {
      filtered = filtered.filter(v => v.status === activeStatus);
    }

    // 2. Filter by search query
    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(v =>
        v.first_name.toLowerCase().includes(lowercasedQuery) ||
        v.last_name.toLowerCase().includes(lowercasedQuery) ||
        v.email.toLowerCase().includes(lowercasedQuery)
      );
    }

    // 3. Sort
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [allVolunteers, activeStatus, searchQuery, sortConfig]);

  // Paginated data
  const paginatedVolunteers = processedVolunteers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(processedVolunteers.length / ITEMS_PER_PAGE);

  // Handlers
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleOpenModal = (volunteer) => setSelectedVolunteer(volunteer);
  const handleCloseModal = () => setSelectedVolunteer(null);
  
  const handleUpdateVolunteer = (updatedVolunteer) => {
    setAllVolunteers(allVolunteers.map(v => v.id === updatedVolunteer.id ? updatedVolunteer : v));
  };
  
  const handleDeleteVolunteer = async (volunteerId) => {
    if (window.confirm("Are you sure you want to delete this pending registration? This action cannot be undone.")) {
      try {
        await fetch(`${API_BASE_URL}/api/volunteers/${volunteerId}/`, {
          method: 'DELETE',
          headers: { 'Authorization': `Token ${authToken}` },
        });
        setAllVolunteers(allVolunteers.filter(v => v.id !== volunteerId));
      } catch (err) {
        alert(`Error deleting volunteer: ${err.message}`);
      }
    }
  };
  
  const statusTabs = [
    { name: 'All', value: 'all', icon: FiGrid },
    { name: 'Pending', value: 'pending', icon: FiUsers },
    { name: 'Approved', value: 'approved', icon: FiCheckSquare },
    { name: 'Rejected', value: 'rejected', icon: FiXSquare },
  ];

  return (
    <>
      <main className="flex-1 bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="md:flex md:items-center md:justify-between">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Volunteer Management</h1>
                <p className="mt-1 text-sm text-slate-600">Search, sort, and manage all volunteer registrations.</p>
            </div>
            <div className="relative mt-4 md:mt-0">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full md:w-64 rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="mt-6 mb-6">
            <div className="p-1.5 inline-flex items-center gap-x-2 bg-slate-200/60 rounded-lg overflow-x-auto">
              {statusTabs.map((tab) => (
                <button
                  key={tab.name}
                  onClick={() => { setActiveStatus(tab.value); setCurrentPage(1); }}
                  className={`flex items-center gap-x-2 whitespace-nowrap py-2 px-4 rounded-md text-sm font-semibold transition-all duration-200 ${
                    activeStatus === tab.value
                      ? 'bg-white text-sky-600 shadow-sm'
                      : 'text-slate-600 hover:bg-white/60 hover:text-sky-600'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  {tab.name}
                </button>
              ))}
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    <SortableHeader name="last_name" sortConfig={sortConfig} onSort={handleSort}>Name</SortableHeader>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider hidden sm:table-cell">Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                    <SortableHeader name="registration_date" sortConfig={sortConfig} onSort={handleSort}>Registration Date</SortableHeader>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  ) : error ? (
                    <tr><td colSpan="5" className="text-center py-16"><FiAlertCircle className="mx-auto h-12 w-12 text-slate-400" /><p className="mt-4 text-sm font-medium text-slate-600">Error: {error}</p></td></tr>
                  ) : paginatedVolunteers.length > 0 ? paginatedVolunteers.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors duration-150">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-slate-800">{v.first_name} {v.last_name}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600 hidden sm:table-cell">{v.email}</td>
                      <td className="whitespace-nowrap px-6 py-4"><StatusBadge status={v.status} /></td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600 hidden md:table-cell">{new Date(v.registration_date).toLocaleDateString()}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-x-3">
                          <button onClick={() => handleOpenModal(v)} className="p-2 rounded-md bg-slate-100 text-slate-600 hover:bg-sky-100 hover:text-sky-700 transition-all" title="View / Edit Details"><FiEdit className="h-4 w-4" /></button>
                          <button onClick={() => handleDeleteVolunteer(v.id)} disabled={v.status !== 'pending'} className="p-2 rounded-md bg-slate-100 text-slate-600 hover:bg-rose-100 hover:text-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed" title={v.status === 'pending' ? 'Delete Registration' : 'Cannot delete'}><FiTrash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" className="text-center py-16"><FiInbox className="mx-auto h-12 w-12 text-slate-400" /><p className="mt-4 text-sm font-medium text-slate-600">No volunteers found.</p></td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
                    <div className="flex flex-1 justify-between sm:hidden">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Previous</button>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Next</button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div><p className="text-sm text-slate-700">Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, processedVolunteers.length)}</span> of <span className="font-medium">{processedVolunteers.length}</span> results</p></div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50"> &lt; </button>
                                {/* Page numbers could be generated here for more complex pagination */}
                                <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300">Page {currentPage} of {totalPages}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50"> &gt; </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}
          </div>
        </div>
      </main>
      
      {selectedVolunteer && (
        <VolunteerDetailModal 
          volunteer={selectedVolunteer} 
          onClose={handleCloseModal}
          onUpdate={handleUpdateVolunteer}
        />
      )}
    </>
  );
}