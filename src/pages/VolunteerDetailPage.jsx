import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiUploadCloud, FiCheckCircle, FiAlertTriangle, FiBarChart2, FiTag } from 'react-icons/fi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// --- Reusable Components (within the same file) ---

// Skeleton Loader Component for cards
const SkeletonCard = () => (
  <div className="bg-white p-6 rounded-lg shadow-md animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
  </div>
);

// Card for Volunteer Summary
const VolunteerSummaryCard = ({ volunteer }) => {
  if (!volunteer) return <SkeletonCard />;

  const statusColor = {
    approved: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800',
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Volunteer Summary</h3>
      <div className="space-y-3 text-sm">
        <p className="font-semibold text-xl text-gray-900">{volunteer.first_name} {volunteer.last_name}</p>
        <p className="text-gray-500">{volunteer.email}</p>
        <p className="text-gray-500">Registered: {new Date(volunteer.registration_date).toLocaleDateString()}</p>
        <div>
          <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 font-medium text-xs ${statusColor[volunteer.status]}`}>
            {volunteer.status}
          </span>
        </div>
      </div>
    </div>
  );
};

// Card for Session File Uploader
const SessionUploader = ({ volunteerId, onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const { authToken } = useAuth();

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);

    const formData = new FormData();
    formData.append('session_file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/volunteers/${volunteerId}/sessions/upload/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${authToken}` },
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed.');
      onUploadSuccess(); // Refresh the session list
      setFile(null);
      alert('Upload successful!');
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-6">
      <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Upload New Session</h3>
      <div 
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6"
      >
        <div className="space-y-1 text-center">
          <FiUploadCloud className="mx-auto h-12 w-12 text-gray-400" />
          <div className="flex text-sm text-gray-600">
            <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-medium text-sky-600 focus-within:outline-none hover:text-sky-500">
              <span>Upload a file</span>
              <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">CSV, FIT, or TCX files</p>
        </div>
      </div>
      {file && (
        <div className="mt-4 text-sm">
          <p className="font-medium text-gray-700">Selected file: {file.name}</p>
        </div>
      )}
      <button 
        onClick={handleUpload}
        disabled={!file || isUploading}
        className="mt-4 w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isUploading ? 'Uploading...' : 'Upload Session'}
      </button>
    </div>
  );
};

// Card for listing all sessions
const SessionList = ({ sessions, onLabelChange }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4">Running Sessions</h3>
    <div className="space-y-4">
      {sessions.length > 0 ? (
        sessions.map(session => <SessionListItem key={session.id} session={session} onLabelChange={onLabelChange} />)
      ) : (
        <p className="text-sm text-gray-500">No sessions have been uploaded for this volunteer yet.</p>
      )}
    </div>
  </div>
);

// A single item in the session list
const SessionListItem = ({ session, onLabelChange }) => {
  const [currentLabel, setCurrentLabel] = useState(session.admin_label);
  const { authToken } = useAuth();
  
  const predictionColor = session.ml_prediction === 'Anomaly' ? 'text-red-600' : 'text-green-600';

  const handleLabelUpdate = async (newLabel) => {
    setCurrentLabel(newLabel);
    try {
      await fetch(`${API_BASE_URL}/api/sessions/${session.id}/`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${authToken}`
        },
        body: JSON.stringify({ admin_label: newLabel })
      });
      // Optionally show a success message
    } catch (error) {
      alert("Failed to update label.");
      setCurrentLabel(session.admin_label); // Revert on failure
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
        <p className="font-bold text-gray-800">{new Date(session.session_date).toLocaleString()}</p>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-xs text-gray-500">Distance</p>
            <p className="font-medium">{session.distance_km} km</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Duration</p>
            <p className="font-medium">{session.duration_minutes} min</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Avg. Pace</p>
            <p className="font-medium">{session.avg_pace_min_km} /km</p>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 rounded-md p-3 mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* ML Result Display */}
        <div className="flex items-center">
          <FiBarChart2 className={`mr-2 h-5 w-5 ${predictionColor}`} />
          <div>
            <p className="text-xs font-medium text-gray-500">ML PREDICTION</p>
            <p className={`font-bold ${predictionColor}`}>{session.ml_prediction}</p>
            <p className="text-xs text-gray-500">Confidence: {session.ml_confidence}%</p>
          </div>
        </div>
        {/* Admin Labeling */}
        <div className="flex items-center">
          <FiTag className="mr-2 h-5 w-5 text-gray-600" />
          <div>
            <label htmlFor={`label-${session.id}`} className="text-xs font-medium text-gray-500">ADMIN LABEL</label>
            <select
              id={`label-${session.id}`}
              value={currentLabel}
              onChange={(e) => handleLabelUpdate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm"
            >
              <option value="Normal">Normal</option>
              <option value="Ischemic Anomaly">Ischemic Anomaly</option>
              <option value="Arrhythmic Anomaly">Arrhythmic Anomaly</option>
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

  const fetchData = useCallback(async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      // Fetch both sets of data in parallel
      const [volunteerRes, sessionsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/volunteers/${volunteerId}/`, { headers: { 'Authorization': `Token ${authToken}` } }),
        fetch(`${API_BASE_URL}/api/volunteers/${volunteerId}/sessions/`, { headers: { 'Authorization': `Token ${authToken}` } }),
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

  const handleUploadSuccess = () => {
    // Refetch data after a successful upload
    fetchData(); 
  };
  
  const handleLabelChange = (sessionId, newLabel) => {
    // Update the local state immediately for a responsive feel
    setSessions(currentSessions => 
      currentSessions.map(s => s.id === sessionId ? { ...s, admin_label: newLabel } : s)
    );
  };

  if (isLoading) {
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Volunteer Profile</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6"><SkeletonCard /><SkeletonCard /></div>
                <div className="lg:col-span-2"><SkeletonCard /></div>
            </div>
        </div>
    );
  }
  
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Volunteer Profile</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          <VolunteerSummaryCard volunteer={volunteer} />
          <SessionUploader volunteerId={volunteerId} onUploadSuccess={handleUploadSuccess} />
        </div>
        {/* Right Column */}
        <div className="lg:col-span-2">
          <SessionList sessions={sessions} onLabelChange={handleLabelChange} />
        </div>
      </div>
    </div>
  );
}