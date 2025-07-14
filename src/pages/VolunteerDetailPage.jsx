import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
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
    PencilSquareIcon
} from '@heroicons/react/24/outline';
import VolunteerDetailModal from '../components/VolunteerDetailModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// --- Reusable Sub-Components ---

const SkeletonCard = ({ lines = 3 }) => (
  <div className="bg-white p-6 rounded-xl shadow-lg animate-pulse">
    <div className="h-5 bg-slate-200 rounded w-3/4 mb-4"></div>
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className={`h-4 bg-slate-200 rounded w-${i % 2 === 0 ? '5/6' : '4/6'} mb-3`}></div>
    ))}
  </div>
);

// This is the direct fix for the text overflow issue.
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
                    <PencilSquareIcon className="w-5 h-5"/>
                    Edit
                </button>
            </div>
            {/* THIS IS THE NEW, MORE ROBUST LAYOUT */}
            <div className="mt-4 border-t pt-4 space-y-4">
                <InfoItem icon={<UserIcon className="w-5 h-5" />} label="Full Name" value={`${volunteer.first_name} ${volunteer.last_name}`} />
                <InfoItem icon={<EnvelopeIcon className="w-5 h-5" />} label="Email" value={volunteer.email} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <InfoItem icon={<CalendarIcon className="w-5 h-5" />} label="Date of Birth" value={volunteer.date_of_birth} />
                    <InfoItem icon={<CheckBadgeIcon className="w-5 h-5" />} label="Status" value={<span className="font-semibold text-emerald-700">Approved</span>} />
                </div>
            </div>
        </div>
    );
};

const SessionUploader = ({ volunteerId, onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const { authToken } = useAuth();

  const handleFileChange = (e) => setFile(e.target.files ? e.target.files[0] : null);

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append('session_file', file);
    formData.append('volunteer', volunteerId);
    formData.append('session_date', new Date().toISOString());
    formData.append('source_type', 'admin_upload');

    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${authToken}` },
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed. Please check the file format.');
      onUploadSuccess();
      setFile(null);
      alert('Upload successful!');
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg mt-6">
      <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Upload New Session</h3>
      <div className="mt-1 flex justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
        <div className="space-y-1 text-center">
          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
          <div className="flex text-sm text-gray-600">
            <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-medium text-sky-600 focus-within:outline-none hover:text-sky-500">
              <span>Choose a file</span>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
            </label>
          </div>
          {file ? <p className="text-xs text-gray-700 font-semibold">{file.name}</p> : <p className="text-xs text-gray-500">CSV, FIT, or TCX files</p>}
        </div>
      </div>
      <button onClick={handleUpload} disabled={!file || isUploading} className="mt-4 w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:bg-slate-400 disabled:cursor-not-allowed">
        {isUploading ? 'Uploading...' : 'Upload Session'}
      </button>
    </div>
  );
};

const SessionListItem = ({ session, onLabelChange, onDelete }) => {
  const [currentLabel, setCurrentLabel] = useState(session.admin_label || 'Normal');
  const { authToken } = useAuth();
  
  const predictionColor = session.ml_prediction === 'Anomaly' ? 'text-red-500' : 'text-green-600';

  const handleLabelUpdate = async (newLabel) => {
    setCurrentLabel(newLabel);
    try {
      await fetch(`${API_BASE_URL}/api/sessions/${session.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${authToken}` },
        body: JSON.stringify({ admin_label: newLabel })
      });
      onLabelChange(session.id, newLabel);
    } catch (error) { alert("Failed to save label."); }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-lg transition-shadow duration-300">
      <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
        <div>
          <p className="font-bold text-gray-800 flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-gray-400" /> {new Date(session.session_date).toLocaleString()}</p>
          <p className="text-xs text-gray-500 ml-7">Source: {session.source_type}</p>
        </div>
        <button onClick={() => onDelete(session.id)} className="p-1.5 rounded-md hover:bg-red-100 text-gray-400 hover:text-red-600" title="Delete Session"><TrashIcon className="w-4 h-4" /></button>
      </div>
      <div className="bg-slate-50 rounded-md p-3 mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div className="flex items-center">
          <CpuChipIcon className="mr-3 h-6 w-6 text-gray-500 flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-gray-500">ML PREDICTION</p>
            <p className={`font-bold ${predictionColor}`}>{session.ml_prediction || 'Not Processed'}</p>
            {session.ml_confidence && <p className="text-xs text-gray-500">Confidence: {session.ml_confidence}%</p>}
          </div>
        </div>
        <div className="flex items-center">
          <TagIcon className="mr-3 h-6 w-6 text-gray-500 flex-shrink-0" />
          <div>
            <label htmlFor={`label-${session.id}`} className="text-xs font-medium text-gray-500">ADMIN LABEL</label>
            <select
              id={`label-${session.id}`}
              value={currentLabel}
              onChange={(e) => handleLabelUpdate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm focus:ring-sky-500 focus:border-sky-500"
            >
              <option>Normal</option>
              <option>Ischemic Anomaly</option>
              <option>Arrhythmic Anomaly</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};


// --- Main Page Component ---
export default function VolunteerDetailPage() {
  const { volunteerId } = useParams();
  const { authToken } = useAuth();
  
  const [volunteer, setVolunteer] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!authToken) return;
    try {
      const [volunteerRes, sessionsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/volunteers/${volunteerId}/`, { headers: { 'Authorization': `Token ${authToken}` } }),
        fetch(`${API_BASE_URL}/api/sessions/?volunteer=${volunteerId}`, { headers: { 'Authorization': `Token ${authToken}` } }),
      ]);
      if (!volunteerRes.ok || !sessionsRes.ok) throw new Error('Failed to load page data.');
      const volunteerData = await volunteerRes.json();
      const sessionsData = await sessionsRes.json();
      setVolunteer(volunteerData);
      setSessions(sessionsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [volunteerId, authToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLabelChange = (sessionId, newLabel) => {
    setSessions(currentSessions => 
      currentSessions.map(s => s.id === sessionId ? { ...s, admin_label: newLabel } : s)
    );
  };
  
  const handleDeleteSession = async (sessionId) => {
    if (window.confirm("Are you sure you want to delete this session?")) {
        try {
            await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Token ${authToken}` }
            });
            setSessions(sessions.filter(s => s.id !== sessionId));
            alert("Session deleted.");
        } catch (error) {
            alert("Failed to delete session.");
        }
    }
  };

  const handleUpdateVolunteer = (updatedVolunteer) => {
    setVolunteer(updatedVolunteer);
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

  return (
    <>
      <div className="p-4 sm:p-8 bg-slate-50 min-h-full">
        <h1 className="text-3xl font-bold text-slate-900 mb-6 tracking-tight">Volunteer Workspace</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-1 space-y-6">
            <VolunteerSummaryCard volunteer={volunteer} onEdit={() => setIsModalOpen(true)} />
            <SessionUploader volunteerId={volunteerId} onUploadSuccess={fetchData} />
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">Running Sessions</h3>
                <div className="space-y-4">
                {sessions.length > 0 ? (
                    sessions.map(session => <SessionListItem key={session.id} session={session} onLabelChange={handleLabelChange} onDelete={handleDeleteSession} />)
                ) : (
                    <p className="text-sm text-gray-500 text-center py-12">No sessions have been uploaded for this volunteer yet.</p>
                )}
                </div>
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