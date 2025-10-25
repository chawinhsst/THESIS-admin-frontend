import { Link } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    UserIcon, 
    CalendarIcon, 
    EnvelopeIcon, 
    CheckBadgeIcon, 
    CloudArrowUpIcon, 
    CpuChipIcon, 
    TagIcon,
    TrashIcon,
    ExclamationTriangleIcon,
    PencilSquareIcon,
    ArrowTopRightOnSquareIcon,
    ClockIcon,
    HeartIcon,
    ArrowsRightLeftIcon,
    ArrowsUpDownIcon,
    CloudArrowDownIcon,
} from '@heroicons/react/24/outline';
import VolunteerDetailModal from '../components/VolunteerDetailModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// --- UTILITY FUNCTIONS ---
const formatDuration = (totalSeconds) => {
  if (totalSeconds == null) return 'N/A';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return [
    hours > 0 ? hours.toString().padStart(2, '0') : null,
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].filter(Boolean).join(':');
};

// --- (Other utility functions like SkeletonCard, InfoItem, etc. are unchanged) ---
const SkeletonCard = ({ lines = 3 }) => (
  <div className="bg-white p-6 rounded-xl shadow-lg animate-pulse">
    <div className="h-5 bg-slate-200 rounded w-3/4 mb-4"></div>
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className={`h-4 bg-slate-200 rounded w-${i % 2 === 0 ? '5/6' : '4/6'} mb-3`}></div>
    ))}
  </div>
);

const InfoItem = ({ icon, label, value }) => (
    <div className="flex items-start">
        <div className="flex-shrink-0 w-6 pt-1 text-slate-400">{icon}</div>
        <div className="ml-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
            <p className="text-base text-slate-800 break-words">{value || '-'}</p>
        </div>
    </div>
);

const VolunteerSummaryCard = ({ volunteer, onEdit }) => {
    if (!volunteer) return <SkeletonCard />;
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-gray-900">Volunteer Information</h3>
                <button onClick={onEdit} className="flex items-center gap-2 text-sm font-medium text-sky-600 hover:text-sky-800">
                    <PencilSquareIcon className="w-5 h-5"/> Edit
                </button>
            </div>
            <div className="mt-4 border-t pt-4 space-y-4">
                <InfoItem icon={<UserIcon className="w-5 h-5" />} label="Full Name" value={`${volunteer.first_name} ${volunteer.last_name}`} />
                <InfoItem icon={<EnvelopeIcon className="w-5 h-5" />} label="Email" value={volunteer.email} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <InfoItem icon={<CalendarIcon className="w-5 h-5" />} label="Date of Birth" value={volunteer.date_of_birth} />
                    <InfoItem icon={<CheckBadgeIcon className="w-5 h-5" />} label="Status" value={<span className={`font-semibold ${volunteer.status === 'approved' ? 'text-emerald-700' : 'text-amber-700'}`}>{volunteer.status}</span>} />
                </div>
            </div>
        </div>
    );
};

const SessionUploader = ({ volunteerId, onUploadSuccess }) => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const { authToken } = useAuth();

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    const uploadPromises = files.map(file => {
      const formData = new FormData();
      formData.append('session_file', file);
      formData.append('volunteer', volunteerId);
      formData.append('session_date', new Date().toISOString());
      formData.append('source_type', 'admin_upload');
      return fetch(`${API_BASE_URL}/api/sessions/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${authToken}` },
        body: formData,
      }).then(response => {
        if (!response.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }
        return response.json();
      });
    });
    try {
      await Promise.all(uploadPromises);
      alert(`${files.length} file(s) uploaded successfully!`);
      onUploadSuccess();
      setFiles([]);
    } catch (error) {
      alert(`An error occurred during upload: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg mt-6">
      <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Upload New Session(s)</h3>
      <div className="mt-1 flex justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
        <div className="space-y-1 text-center">
          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="flex text-sm text-gray-600">
            <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-medium text-sky-600 focus-within:outline-none hover:text-sky-500">
              <span>Choose files</span>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} multiple />
            </label>
          </div>
          <p className="text-xs text-gray-500">CSV, FIT, or TCX files</p>
        </div>
      </div>
      
      {files.length > 0 && (
        <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-medium text-gray-800">Selected files:</h4>
            <ul className="mt-2 space-y-1 text-xs text-gray-600 list-disc list-inside">
                {files.map(file => <li key={file.name}>{file.name}</li>)}
            </ul>
        </div>
      )}

      <button onClick={handleUpload} disabled={files.length === 0 || isUploading} className="mt-4 w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:bg-slate-400 disabled:cursor-not-allowed">
        {isUploading ? `Uploading ${files.length} file(s)...` : `Upload ${files.length} Session(s)`}
      </button>
    </div>
  );
};

const StatItem = ({ icon, value, isSorted = false }) => (
  <div className="flex items-center text-sm text-slate-600">
    <div className="flex-shrink-0 w-5 h-5 mr-1.5 text-slate-400">{icon}</div>
    <span className={isSorted ? 'font-bold text-sky-600' : ''}>{value}</span>
  </div>
);

const SessionListItem = ({ session, onDelete, onExport, isExporting, sortBy, isSelected, onSelect, onReuploadSuccess }) => {
  const navigate = useNavigate();
  const { authToken } = useAuth();
  const fileInputRef = useRef(null);
  
  const hasData = session.status === 'completed';
  const hasFailed = session.status === 'failed';

  const statusColors = {
    completed: 'bg-emerald-100 text-emerald-800',
    processing: 'bg-amber-100 text-amber-800',
    failed: 'bg-red-100 text-red-800',
  };

  const handleReuploadClick = () => {
    fileInputRef.current.click();
  };

  const handleFileReupload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('session_file', file);
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/${session.id}/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Token ${authToken}` },
        body: formData,
      });
      if (!response.ok) throw new Error('Re-upload failed.');
      alert('File submitted for reprocessing!');
      onReuploadSuccess();
    } catch (error) {
      alert(error.message);
    }
  };
  
  return (
    <div className={`border rounded-xl p-4 bg-white transition-all duration-200 ${isSelected ? 'shadow-md border-sky-500 ring-2 ring-sky-500' : 'border-gray-200 hover:shadow-md'}`}>
      <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            className="h-5 w-5 rounded border-gray-300 text-sky-600 focus:ring-sky-500 mt-0.5"
            checked={isSelected}
            onChange={() => onSelect(session.id)}
            onClick={(e) => e.stopPropagation()}
          />
          <div>
            <p className={`font-bold text-gray-800 flex items-center gap-2 ${sortBy === 'session_date' ? 'text-sky-600' : ''}`}>
              <CalendarIcon className="w-5 h-5 text-gray-400" /> 
              Run Date: {new Date(session.runDate).toLocaleString()}
            </p>
            <div className="flex items-center gap-2 ml-7 mt-1">
              <p className="text-xs text-gray-500">Uploaded: {new Date(session.uploaded_at).toLocaleDateString()}</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[session.status] || 'bg-gray-100 text-gray-800'}`}>
                {session.status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
            <button
                onClick={(e) => { e.stopPropagation(); onExport(session); }}
                disabled={isExporting}
                className="flex items-center gap-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md px-3 py-1.5 shadow-sm disabled:bg-slate-400"
                title="Export this session to CSV"
            >
                <CloudArrowDownIcon className="w-4 h-4"/>
                <span>{isExporting ? '...' : 'Export'}</span>
            </button>
            <Link 
                to={`/sessions/${session.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-md px-3 py-1.5 shadow-sm" 
                title="View & Label Session"
            >
                <PencilSquareIcon className="w-4 h-4" />
                <span>View & Label</span>
            </Link>
            <button 
                onClick={(e) => { e.stopPropagation(); onDelete(session.id); }} 
                className="p-1.5 rounded-md hover:bg-red-100 text-gray-400 hover:text-red-600" 
                title="Delete Session"
            >
                <TrashIcon className="w-4 h-4" />
            </button>
        </div>
      </div>
      
      {hasData && (
        <div className="bg-slate-50 rounded-md p-3 mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2">
            <StatItem icon={<ArrowsRightLeftIcon />} value={`${(session.total_distance_km || 0).toFixed(2)} km`} isSorted={sortBy === 'total_distance_km'} />
            <StatItem icon={<ClockIcon />} value={formatDuration(session.total_duration_secs)} isSorted={sortBy === 'total_duration_secs'}/>
            <StatItem icon={<HeartIcon />} value={`Avg: ${session.avg_heart_rate || 'N/A'}`} isSorted={sortBy === 'avg_heart_rate'}/>
            <StatItem icon={<HeartIcon className="text-blue-500"/>} value={`Min: ${session.min_heart_rate || 'N/A'}`} isSorted={sortBy === 'min_heart_rate'}/>
            <StatItem icon={<HeartIcon className="text-red-500"/>} value={`Max: ${session.max_heart_rate || 'N/A'}`} isSorted={sortBy === 'max_heart_rate'}/>
        </div>
      )}
      
      {hasFailed && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-3 flex items-center justify-between gap-4">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0"/>
              <div>
                <p className="text-sm font-semibold text-red-800">Processing Failed</p>
                <p className="text-xs text-red-700">{session.processing_error || 'An unknown error occurred.'}</p>
              </div>
            </div>
            <div>
              <input type="file" ref={fileInputRef} onChange={handleFileReupload} className="hidden" />
              <button onClick={handleReuploadClick} className="text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md px-3 py-1.5">
                Re-upload
              </button>
            </div>
        </div>
      )}
    </div>
  );
};

const sortOptions = [
    { value: 'session_date', label: 'Run Date' },
    { value: 'total_distance_km', label: 'Distance' },
    { value: 'total_duration_secs', label: 'Duration' },
    { value: 'max_heart_rate', label: 'Max Heart Rate' },
    { value: 'min_heart_rate', label: 'Min Heart Rate' },
    { value: 'avg_heart_rate', label: 'Avg Heart Rate' },
];

const SessionListSkeletonContainer = ({ count }) => (
    <div className="space-y-4">
        <div className="flex items-center pb-2 animate-pulse">
            <div className="h-5 w-5 rounded bg-slate-200"></div>
            <div className="ml-3 h-4 w-24 bg-slate-200 rounded"></div>
        </div>
        {Array.from({ length: count }).map((_, i) => (
             <div key={i} className="border rounded-xl p-4 bg-white animate-pulse">
                <div className="flex justify-between items-start gap-2 mb-3">
                    <div className="flex items-start gap-3 w-full">
                        <div className="h-5 w-5 rounded bg-slate-200 mt-0.5"></div>
                        <div className="w-full space-y-2">
                            <div className="h-5 w-2/3 bg-slate-200 rounded"></div>
                            <div className="h-3 w-1/3 bg-slate-200 rounded"></div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-50 rounded-md p-3 mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-5 w-20 bg-slate-200 rounded"></div>
                    ))}
                </div>
            </div>
        ))}
    </div>
);

const PaginationControls = ({ paginationInfo, onPageChange, currentPage, pageSize }) => {
    if (pageSize === 'all' || !paginationInfo || (typeof pageSize === 'number' && paginationInfo.count <= pageSize)) {
        return null;
    }
    const handlePrev = () => onPageChange(currentPage - 1);
    const handleNext = () => onPageChange(currentPage + 1);
    const fromItem = paginationInfo.count > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const toItem = Math.min(currentPage * pageSize, paginationInfo.count);
    return (
        <div className="flex items-center justify-between mt-6 border-t pt-4">
            <p className="text-sm text-slate-700">
                Showing <span className="font-semibold">{fromItem}</span> to <span className="font-semibold">{toItem}</span> of{' '}
                <span className="font-semibold">{paginationInfo.count}</span> results
            </p>
            <div className="flex gap-2">
                <button onClick={handlePrev} disabled={!paginationInfo.previous} className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                    Previous
                </button>
                <button onClick={handleNext} disabled={!paginationInfo.next} className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                    Next
                </button>
            </div>
        </div>
    );
};

export default function VolunteerDetailPage() {
  const { volunteerId } = useParams();
  const { authToken } = useAuth();
  
  const [volunteer, setVolunteer] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [sortBy, setSortBy] = useState('session_date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const sortDropdownRef = useRef(null);
  
  const [selectedSessions, setSelectedSessions] = useState(new Set());
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paginationInfo, setPaginationInfo] = useState(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const pageSizeOptions = [10, 25, 50, 'all'];

  const [isExporting, setIsExporting] = useState(false);
  const [exportingId, setExportingId] = useState(null);

  useEffect(() => {
      if (!authToken) return;
      setIsLoading(true);
      const controller = new AbortController();
      fetch(`${API_BASE_URL}/api/volunteers/${volunteerId}/`, {
          headers: { 'Authorization': `Token ${authToken}` },
          signal: controller.signal,
      })
      .then(res => {
          if (!res.ok) throw new Error('Failed to load volunteer data.');
          return res.json();
      })
      .then(data => setVolunteer(data))
      .catch(err => {
          if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setIsLoading(false));

      return () => controller.abort();
  }, [volunteerId, authToken]);
  
  useEffect(() => {
    if (!authToken) return;
    setIsSessionsLoading(true);
    const controller = new AbortController();

    const fetchAllSessionsInParallel = async (url) => {
        const firstRes = await fetch(url, { headers: { 'Authorization': `Token ${authToken}` }, signal: controller.signal });
        if (!firstRes.ok) throw new Error('Failed to load initial session data.');
        const firstData = await firstRes.json();
        const { count, results } = firstData;
        if (!results || results.length === 0) return [];
        const inferredPageSize = results.length;
        const totalPages = Math.ceil(count / inferredPageSize);
        if (totalPages <= 1) return results;
        
        const promises = [];
        for (let page = 2; page <= totalPages; page++) {
            const pageUrl = new URL(url);
            pageUrl.searchParams.set('page', page);
            promises.push(fetch(pageUrl.toString(), { headers: { 'Authorization': `Token ${authToken}` }, signal: controller.signal }).then(res => res.json()));
        }
        const remainingData = await Promise.all(promises);
        const all = results;
        remainingData.forEach(page => { if (page.results) all.push(...page.results); });
        return all;
    };

    const ordering = sortDirection === 'desc' ? `-${sortBy}` : sortBy;
    const initialUrl = `${API_BASE_URL}/api/sessions/?volunteer=${volunteerId}&ordering=${ordering}`;

    let fetchPromise;
    if (pageSize === 'all') {
        fetchPromise = fetchAllSessionsInParallel(initialUrl);
    } else {
        const paginatedUrl = `${initialUrl}&page=${currentPage}&page_size=${pageSize}`;
        fetchPromise = fetch(paginatedUrl, { headers: { 'Authorization': `Token ${authToken}` }, signal: controller.signal }).then(res => res.json());
    }

    fetchPromise.then(data => {
        if (pageSize === 'all') {
            setSessions(data);
            setPaginationInfo(null);
        } else {
            setSessions(data.results || []);
            setPaginationInfo({ count: data.count, next: data.next, previous: data.previous });
        }
    }).catch(err => {
        if (err.name !== 'AbortError') setError(err.message);
    }).finally(() => {
        setIsSessionsLoading(false);
        setSelectedSessions(new Set());
    });

    return () => controller.abort();
  }, [volunteerId, authToken, currentPage, pageSize, sortBy, sortDirection, refetchTrigger]);


  useEffect(() => {
    function handleClickOutside(event) {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setIsSortOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sortDropdownRef]);
  
  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage !== currentPage) {
      setCurrentPage(newPage);
      window.scrollTo(0, 0);
    }
  };
  
  const handlePageSizeChange = (e) => {
    const newSize = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortDirection('desc');
    }
    if (currentPage !== 1) setCurrentPage(1);
    setIsSortOpen(false);
  };
  
  const triggerRefetch = () => {
    if (currentPage !== 1) setCurrentPage(1);
    else setRefetchTrigger(c => c + 1);
  };

  const sessionsWithDerivedStats = useMemo(() => {
    return sessions.map(session => {
      const hasTimeseries = session.timeseries_data && session.timeseries_data.length > 0;
      const runDate = hasTimeseries ? new Date(session.timeseries_data[0].timestamp) : new Date(session.session_date);
      const heartRates = hasTimeseries ? session.timeseries_data.map(r => r.heart_rate).filter(hr => hr != null) : [];
      const minHeartRate = heartRates.length ? Math.min(...heartRates) : null;
      return { ...session, runDate, min_heart_rate: minHeartRate };
    });
  }, [sessions]);

  const handleSelectSession = (sessionId) => {
    setSelectedSessions(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(sessionId)) newSelected.delete(sessionId);
      else newSelected.add(sessionId);
      return newSelected;
    });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedSessions(new Set(sessionsWithDerivedStats.map(s => s.id)));
    else setSelectedSessions(new Set());
  };

  const handleDeleteSelected = async () => {
    const sessionIdsToDelete = Array.from(selectedSessions);
    if (sessionIdsToDelete.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${sessionIdsToDelete.length} session(s)?`)) {
      try {
        await Promise.all(sessionIdsToDelete.map(id => 
          fetch(`${API_BASE_URL}/api/sessions/${id}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Token ${authToken}` }
          })
        ));
        triggerRefetch();
        alert("Selected sessions deleted.");
      } catch (error) {
        alert("Failed to delete some sessions.");
      }
    }
  };
  
  const handleSingleDelete = async (sessionId) => {
    if (window.confirm("Are you sure you want to delete this session?")) {
        try {
            await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Token ${authToken}` }
            });
            triggerRefetch();
            alert("Session deleted.");
        } catch (error) {
            alert("Failed to delete session.");
        }
    }
  };

  const handleUpdateVolunteer = (updatedVolunteer) => { setVolunteer(updatedVolunteer); };

  const convertToCSV = (data, headers) => {
    const headerRow = headers.join(',');
    const bodyRows = data.map(row => 
      headers.map(header => {
        const value = row[header] ?? '';
        const stringValue = String(value);
        if (stringValue.includes(',')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    );
    return [headerRow, ...bodyRows].join('\n');
  };

  const downloadCSV = (csvString, filename) => {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  const processAndDownload = (sessions, filename) => {
      let csvData = [];
      const headerSet = new Set(['session_id', 'run_date', 'timestamp', 'anomaly', 'heart_rate', 'speed', 'distance']);
      
      sessions.forEach(session => {
        if (session.timeseries_data && session.timeseries_data.length > 0) {
          session.timeseries_data.forEach(row => {
            const flatRow = {
              session_id: session.id,
              run_date: new Date(session.session_date).toISOString().split('T')[0],
              ...row
            };
            Object.keys(flatRow).forEach(key => headerSet.add(key));
            csvData.push(flatRow);
          });
        }
      });

      if (csvData.length === 0) {
        alert("No time-series data found in selected session(s) to export.");
        return;
      }
      
      const orderedHeaders = Array.from(headerSet);
      const csvString = convertToCSV(csvData, orderedHeaders);
      downloadCSV(csvString, filename);
  }

  // ✅ UPDATED: Multi-export now downloads individual files
  const handleExportSelected = async () => {
    const sessionIds = Array.from(selectedSessions);
    if (sessionIds.length === 0 || !volunteer) return;
    setIsExporting(true);
    try {
        const promises = sessionIds.map(id =>
            fetch(`${API_BASE_URL}/api/sessions/${id}/`, { headers: { 'Authorization': `Token ${authToken}` } })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error for session ${id}: ${res.status}`);
                return res.json();
            })
        );
        const results = await Promise.allSettled(promises);

        const successfulFetches = results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);
        
        const failedFetches = results.filter(result => result.status === 'rejected');
        if (failedFetches.length > 0) {
            console.error("Some sessions failed to fetch:", failedFetches.map(f => f.reason));
            alert(`${failedFetches.length} out of ${sessionIds.length} sessions could not be fetched.`);
        }
        
        if (successfulFetches.length === 0) {
            alert("No session data could be exported.");
            return;
        }

        // Iterate and download each one individually
        successfulFetches.forEach(session => {
            const runDate = (session.timeseries_data && session.timeseries_data.length > 0)
                ? new Date(session.timeseries_data[0].timestamp)
                : new Date(session.session_date);
            
            const dateString = runDate.toISOString().split('T')[0];
            const safeFirstName = volunteer.first_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const safeLastName = volunteer.last_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const filename = `${safeFirstName}_${safeLastName}_${dateString}_session_${session.id}.csv`;

            processAndDownload([session], filename);
        });
    } catch (err) {
      alert(`An error occurred during export: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };
  
  // ✅ UPDATED: Uses the correct run date for single export filename
  const handleExportSingleSession = async (session) => {
    if (!session || !volunteer) return;
    setExportingId(session.id);
    try {
        const res = await fetch(`${API_BASE_URL}/api/sessions/${session.id}/`, { headers: { 'Authorization': `Token ${authToken}` } });
        if (!res.ok) throw new Error(`Failed to fetch session ${session.id}`);
        const detailedSession = await res.json();
        
        const runDate = (detailedSession.timeseries_data && detailedSession.timeseries_data.length > 0)
            ? new Date(detailedSession.timeseries_data[0].timestamp)
            : new Date(detailedSession.session_date);

        const dateString = runDate.toISOString().split('T')[0];
        const safeFirstName = volunteer.first_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const safeLastName = volunteer.last_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${safeFirstName}_${safeLastName}_${dateString}_session_${session.id}.csv`;

        processAndDownload([detailedSession], filename);
    } catch (err) {
        alert(`An error occurred during export: ${err.message}`);
    } finally {
        setExportingId(null);
    }
  };
  
  if (isLoading) {
    return (
        <div className="p-4 sm:p-8">
            <div className="h-8 bg-slate-200 rounded w-1/2 mb-6 animate-pulse"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6"><SkeletonCard lines={4} /><SkeletonCard lines={2} /></div>
                <div className="lg:col-span-2"><SkeletonCard lines={5} /></div>
            </div>
        </div>
    );
  }
  
  if (error) return <div className="p-8 text-red-600 flex items-center gap-2"><ExclamationTriangleIcon className="w-6 h-6" /> Error: {error}</div>;

  const currentSortLabel = sortOptions.find(opt => opt.value === sortBy)?.label;
  const isAllSelected = sessionsWithDerivedStats.length > 0 && selectedSessions.size === sessionsWithDerivedStats.length;

  return (
    <>
      <div className="p-4 sm:p-8 bg-slate-50 min-h-full">
        <h1 className="text-3xl font-bold text-slate-900 mb-6 tracking-tight">Volunteer Workspace</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-1 space-y-6">
            <VolunteerSummaryCard volunteer={volunteer} onEdit={() => setIsModalOpen(true)} />
            <SessionUploader volunteerId={volunteerId} onUploadSuccess={triggerRefetch} />
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex flex-wrap justify-between items-center border-b pb-4 mb-4 gap-4">
                  <h3 className="text-lg font-bold text-gray-900">Running Sessions</h3>
                  <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
                    {selectedSessions.size > 0 && (
                      <>
                        <button onClick={handleExportSelected} disabled={isExporting} className="flex items-center gap-1.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md px-3 py-2 disabled:bg-slate-400">
                          <CloudArrowDownIcon className="w-4 h-4"/>
                          {isExporting ? 'Exporting...' : `Export (${selectedSessions.size})`}
                        </button>
                        <button onClick={handleDeleteSelected} className="flex items-center gap-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md px-3 py-2">
                          <TrashIcon className="w-4 h-4"/>
                          Delete ({selectedSessions.size})
                        </button>
                      </>
                    )}
                    <div className="flex items-center gap-2">
                        <label htmlFor="pageSize" className="text-sm font-medium text-gray-700">Show:</label>
                        <select id="pageSize" name="pageSize" value={pageSize} onChange={handlePageSizeChange} className="h-full rounded-md border-gray-300 py-2 pl-3 pr-7 text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500 sm:text-sm">
                            {pageSizeOptions.map(option => ( <option key={option} value={option}>{option === 'all' ? 'All' : option}</option> ))}
                        </select>
                    </div>
                    <div className="relative" ref={sortDropdownRef}>
                      <button onClick={() => setIsSortOpen(!isSortOpen)} className="flex items-center gap-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md px-4 py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-500">
                        <ArrowsUpDownIcon className="w-4 h-4 text-gray-400"/>
                        <span>Sort: {currentSortLabel} </span>
                        <span className={`font-semibold ${sortDirection === 'asc' ? 'text-blue-600' : 'text-red-600'}`}>({sortDirection === 'asc' ? 'Asc' : 'Desc'})</span>
                      </button>
                      {isSortOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-20 border">
                          <div className="py-1">
                            {sortOptions.map(option => (
                              <button key={option.value} onClick={() => handleSortChange(option.value)} className={`w-full text-left flex items-center px-4 py-2 text-sm hover:bg-gray-100 ${sortBy === option.value ? 'font-bold text-sky-600' : 'text-gray-700'}`}>
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {isSessionsLoading ? (
                    <SessionListSkeletonContainer count={typeof pageSize === 'number' ? pageSize : 10} />
                ) : (
                    <div>
                        <div className="space-y-4">
                            {sessionsWithDerivedStats.length > 0 ? (
                                <>
                                    <div className="flex items-center pb-2">
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                                            checked={isAllSelected}
                                            onChange={handleSelectAll}
                                            ref={el => el && (el.indeterminate = selectedSessions.size > 0 && !isAllSelected)}
                                        />
                                        <label className="ml-3 text-sm font-medium text-gray-700">Select All ({sessionsWithDerivedStats.length})</label>
                                    </div>
                                    {sessionsWithDerivedStats.map(session => (
                                        <SessionListItem 
                                            key={session.id} 
                                            session={session} 
                                            onDelete={handleSingleDelete} 
                                            sortBy={sortBy}
                                            isSelected={selectedSessions.has(session.id)}
                                            onSelect={handleSelectSession}
                                            onReuploadSuccess={triggerRefetch}
                                            onExport={handleExportSingleSession}
                                            isExporting={exportingId === session.id}
                                        />
                                    ))}
                                </>
                            ) : (
                                !isSessionsLoading && <p className="text-sm text-gray-500 text-center py-12">No sessions have been uploaded for this volunteer yet.</p>
                            )}
                        </div>
                        <PaginationControls 
                            paginationInfo={paginationInfo}
                            currentPage={currentPage}
                            onPageChange={handlePageChange}
                            pageSize={pageSize}
                        />
                    </div>
                )}
            </div>
          </div>
        </div>
      </div>
      
      {isModalOpen && (
        <VolunteerDetailModal 
          volunteer={volunteer} 
          onClose={() => setIsModalOpen(false)}
          onUpdate={handleUpdateVolunteer}
        />
      )}
    </>
  );
}