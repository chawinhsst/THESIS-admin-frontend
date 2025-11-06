import { useLoaderData, useParams, Link, useNavigate } from 'react-router-dom';
import { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush, ReferenceLine, Dot } from 'recharts';
import {
    ArrowLeftIcon,
    CalendarIcon,
    UserIcon,
    CpuChipIcon,
    TagIcon,
    ChevronDownIcon,
    ClockIcon,
    FireIcon,
    HeartIcon,
    ArrowsRightLeftIcon,
    ChartBarIcon,
    SparklesIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    CloudArrowUpIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    ArrowsUpDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    XCircleIcon,
    ExclamationCircleIcon,
    ScissorsIcon,
    ExclamationTriangleIcon,
    CloudArrowDownIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { getAuthToken } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// --- UTILITY FUNCTIONS ---
const formatDuration = (totalSeconds) => {
  if (totalSeconds == null || isNaN(totalSeconds)) return 'N/A';
  totalSeconds = Math.round(totalSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return [
    hours > 0 ? hours.toString().padStart(2, '0') : null,
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].filter(Boolean).join(':');
};

const formatPace = (speedInMps) => {
  if (speedInMps == null || speedInMps <= 0) return 'N/A';
  const paceDecimal = (1 / speedInMps * 1000) / 60;
  const paceMinutes = Math.floor(paceDecimal);
  const paceSeconds = Math.round((paceDecimal - paceMinutes) * 60);
  return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}`;
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
};

const UNIT_MAP = {
  heart_rate: 'bpm',
  speed: 'min/km',
  distance: 'm',
  altitude: 'm',
  cadence: 'rpm',
  power: 'watts',
  position_lat: 'deg',
  position_long: 'deg',
  temperature: '°C',
  respiration_rate: 'breaths/min',
};

const formatHeader = (header) => {
  let title = header.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  if (UNIT_MAP[header]) { title += ` (${UNIT_MAP[header]})`; }
  return title;
};

const formatTableCell = (header, value) => {
    if (value == null) return 'N/A';
    switch (header) {
        case 'timestamp':
            return new Date(value).toLocaleTimeString('en-GB');
        case 'speed':
        case 'enhanced_speed':
            return formatPace(value);
        case 'altitude':
        case 'enhanced_altitude':
            return value.toFixed(2);
        case 'distance':
        case 'power':
        case 'cadence':
        case 'gps_accuracy':
            return value.toFixed(1);
        case 'position_lat':
        case 'position_long':
            return value.toFixed(6);
        default:
            return String(value);
    }
};

// --- DATA LOADER ---
export async function loader({ params }) {
  const { sessionId } = params;
  const authToken = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/`, {
    headers: { 'Authorization': `Token ${authToken}` },
  });
  if (!response.ok) { throw response; }
  return response.json();
}

// --- UI COMPONENTS ---
const StatCard = ({ icon, label, value, subValue = null, colorClass = 'text-slate-800' }) => (
  <div className="bg-white p-4 rounded-xl shadow-md flex items-start">
    <div className="flex-shrink-0 mr-4 text-sky-500">{icon}</div>
    <div className="flex-grow">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      {subValue && <p className="text-xs text-slate-400">{subValue}</p>}
    </div>
  </div>
);

const EditableAdminLabel = ({ session }) => {
  const { authToken } = useAuth();
  const [currentLabel, setCurrentLabel] = useState(session.admin_label || 'Normal');
  const [isSaving, setIsSaving] = useState(false);
  const handleSaveLabel = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/${session.id}/update-label/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${authToken}` },
        body: JSON.stringify({ admin_label: currentLabel }),
      });
      if (!response.ok) { throw new Error('Failed to save label. Please try again.'); }
      const updatedSession = await response.json();
      session.admin_label = updatedSession.admin_label;
      alert('Label updated successfully!');
    } catch (error) {
      alert(error.message);
      setCurrentLabel(session.admin_label || 'Normal');
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="bg-white p-4 rounded-xl shadow-md flex items-start">
      <div className="flex-shrink-0 mr-4 text-sky-500"><TagIcon className="w-8 h-8" /></div>
      <div className="flex-grow">
        <p className="text-sm font-medium text-slate-500">Admin Label</p>
        <div className="flex items-end gap-2 mt-1">
          <select value={currentLabel} onChange={(e) => setCurrentLabel(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm text-base focus:ring-sky-500 focus:border-sky-500">
            <option>Normal</option>
            <option>Ischemic Anomaly</option>
            <option>Arrhythmic Anomaly</option>
          </select>
          <button onClick={handleSaveLabel} disabled={isSaving || currentLabel === (session.admin_label || 'Normal')} className="rounded-md bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 disabled:bg-slate-400 disabled:cursor-not-allowed">
            {isSaving ? '...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4">
                <div className="flex items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                        <ExclamationTriangleIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
                        <div className="mt-2">{children}</div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button type="button" onClick={onConfirm} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm">
                        Confirm Save
                    </button>
                    <button type="button" onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

const ResetConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
    const [confirmText, setConfirmText] = useState('');
    if (!isOpen) return null;
    const isConfirmed = confirmText.toUpperCase() === 'RESET';
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4">
                <div className="flex items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">Reset All Anomalies</h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500">
                                This is a destructive action. All points will be reset to "Normal". To confirm, please type <strong>RESET</strong> in the box below.
                            </p>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                className="mt-3 block w-full rounded-md border-gray-300 shadow-sm text-center font-semibold tracking-widest focus:ring-red-500 focus:border-red-500"
                                placeholder="RESET"
                            />
                        </div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button type="button" onClick={onConfirm} disabled={!isConfirmed} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm">
                        Confirm Reset
                    </button>
                    <button type="button" onClick={onClose} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- CHART COMPONENTS ---

// A distinct color for ML predictions
const ML_ANOMALY_COLOR = '#8b5cf6'; // Purple

// List of *only* ML prediction fields for the dropdown
const anomalySources = [
  { key: 'ensemble_prediction', label: 'Ensemble Prediction' },
  { key: 'lof_prediction', label: 'LOF Prediction' },
  { key: 'iforest_prediction', label: 'Isolation Forest' },
  { key: 'ocsvm_prediction', label: 'OCSVM Prediction' },
  { key: 'kmeans_prediction', label: 'K-Means Prediction' },
  { key: 'lstm_prediction', label: 'LSTM Prediction' },
  { key: 'usad_prediction', label: 'USAD Prediction' },
  { key: 'mp_prediction', label: 'MP Prediction' },
];

const chartableParams = [
  { key: 'speed', label: 'Pace', unit: 'min/km', color: '#3b82f6' },
  { key: 'cadence', label: 'Cadence', unit: 'rpm', color: '#f97316' },
  { key: 'power', label: 'Power', unit: 'watts', color: '#8b5cf6' },
  { key: 'altitude', label: 'Altitude', unit: 'm', color: '#16a34a' },
  { key: 'distance', label: 'Distance', unit: 'm', color: '#14b8a6' },
  { key: 'gps_accuracy', label: 'GPS Accuracy', unit: 'm', color: '#eab308' },
  { key: 'position_lat', label: 'Latitude', unit: 'deg', color: '#0ea5e9' },
  { key: 'position_long', label: 'Longitude', unit: 'deg', color: '#d946ef' },
  { key: 'enhanced_speed', label: 'Enhanced Pace', unit: 'min/km', color: '#6366f1' },
  { key: 'enhanced_altitude', label: 'Enhanced Altitude', unit: 'm', color: '#10b981' },
];

const AnomalyDot = (props) => {
    const { cx, cy, payload, dynamicRadius, selectedAnomalyKey, showManualAnomalies } = props;
    if (dynamicRadius === 0 || payload.heart_rate == null) return null;

    const mlAnomaly = payload[selectedAnomalyKey] === 1;
    const manualAnomaly = payload.anomaly === 1;

    let fill, stroke, strokeWidth;

    // 1. Determine Fill Color (based on Manual Label)
    if (showManualAnomalies) {
        fill = manualAnomaly ? "#ef4444" : "#22c55e"; // Red for anomaly, Green for normal
    } else {
        fill = "#9ca3af"; // Default gray if manual labels are hidden
    }

    // 2. Determine Stroke (based on ML Prediction)
    if (mlAnomaly) {
        stroke = ML_ANOMALY_COLOR;
        strokeWidth = 3; // Thicker stroke for ML anomaly
    } else {
        // Default stroke
        stroke = showManualAnomalies && manualAnomaly ? "#b91c1c" : fill; // Darker red border, else same as fill
        strokeWidth = 1;
    }

    return <Dot cx={cx} cy={cy} r={dynamicRadius} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
};

const AnomalyTimeline = ({ data, onSegmentClick, selectedAnomalyKey, showManualAnomalies }) => {
    const totalPoints = data.length;
    if (totalPoints === 0) return null;

    // 1. Calculate Manual Anomaly Segments
    const manualSegments = useMemo(() => {
        if (!showManualAnomalies) return []; // Hide if toggled off
        const segments = [];
        let inSegment = false;
        for (let i = 0; i < data.length; i++) {
            if (data[i].anomaly === 1 && !inSegment) {
                inSegment = true; segments.push({ start: i, end: i });
            } else if (data[i].anomaly === 1 && inSegment) {
                segments[segments.length - 1].end = i;
            } else if (data[i].anomaly !== 1 && inSegment) {
                inSegment = false;
            }
        }
        return segments;
    }, [data, showManualAnomalies]);

    // 2. Calculate ML Anomaly Segments
    const mlSegments = useMemo(() => {
        const segments = [];
        let inSegment = false;
        for (let i = 0; i < data.length; i++) {
            if (data[i][selectedAnomalyKey] === 1 && !inSegment) {
                inSegment = true; segments.push({ start: i, end: i });
            } else if (data[i][selectedAnomalyKey] === 1 && inSegment) {
                segments[segments.length - 1].end = i;
            } else if (data[i][selectedAnomalyKey] !== 1 && inSegment) {
                inSegment = false;
            }
        }
        return segments;
    }, [data, selectedAnomalyKey]);

    return (
        // Taller to accommodate two tracks
        <div className="relative w-full h-8 bg-slate-200 rounded-lg overflow-hidden border border-slate-300">
            {/* Track 1: Manual Anomalies (Top) */}
            <div className="absolute top-0 left-0 w-full h-1/2">
                {manualSegments.map((segment, index) => {
                    const left = (segment.start / totalPoints) * 100;
                    const width = ((segment.end - segment.start + 1) / totalPoints) * 100;
                    return (
                        <div key={`manual-${index}`} className="absolute h-full bg-red-500 cursor-pointer hover:bg-red-400 transition-colors" style={{ left: `${left}%`, width: `${width}%` }} onClick={() => onSegmentClick(segment)} title={`Manual Anomaly: ${formatDuration(data[segment.start].elapsed_time)} to ${formatDuration(data[segment.end].elapsed_time)}`} />
                    );
                })}
            </div>

            {/* Track 2: ML Anomalies (Bottom) */}
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-slate-200/50">
                {mlSegments.map((segment, index) => {
                    const left = (segment.start / totalPoints) * 100;
                    const width = ((segment.end - segment.start + 1) / totalPoints) * 100;
                    return (
                        <div key={`ml-${index}`} className="absolute h-full cursor-pointer" style={{ left: `${left}%`, width: `${width}%`, backgroundColor: ML_ANOMALY_COLOR, opacity: 0.8 }} onClick={() => onSegmentClick(segment)} title={`ML Anomaly: ${formatDuration(data[segment.start].elapsed_time)} to ${formatDuration(data[segment.end].elapsed_time)}`} />
                    );
                })}
            </div>
        </div>
    );
};

const HeartRateChart = ({ session, timeseriesData: chartData, onAnomalyToggle, onTimelineZoom, activeDomain, onBrushChange, brushKey, chartHeight, hasUnsavedChanges, isSaving, onSaveChanges, hrDomain, hasHeartRateData }) => {
  const [visibleParams, setVisibleParams] = useState(new Set());  
  
  // Default to the first ML prediction in the list
  const [selectedAnomalyKey, setSelectedAnomalyKey] = useState(anomalySources[0]?.key || 'ensemble_prediction');
  
  // NEW: State for showing manual labels, defaults to true
  const [showManualAnomalies, setShowManualAnomalies] = useState(true);

  const chartMargin = { top: 20, right: 40, left: 20, bottom: 60 };
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);
  
  const xAxisDomain = useMemo(() => {
    if (!activeDomain || !chartData.length || activeDomain.startIndex == null) return ['dataMin', 'dataMax'];
    const startSeconds = chartData[activeDomain.startIndex]?.elapsed_time;
    const endSeconds = chartData[activeDomain.endIndex]?.elapsed_time;
    if (startSeconds != null && endSeconds != null && endSeconds > startSeconds) {
        const duration = endSeconds - startSeconds;
        const padding = duration * 0.05;  
        const paddedStart = Math.max(0, startSeconds - padding);
        const paddedEnd = endSeconds + padding;
        return [paddedStart, paddedEnd];
    }
    return ['dataMin', 'dataMax'];
  }, [activeDomain, chartData]);
  
  const visiblePointsCount = useMemo(() => {
    if (!activeDomain || !chartData.length) return chartData.length;
    return activeDomain.endIndex - activeDomain.startIndex + 1;
  }, [activeDomain, chartData.length]);
  
  const getDynamicDotRadius = (pointCount) => {
    if (pointCount > 1000) return 0;
    if (pointCount > 500) return 3;
    if (pointCount > 200) return 4;
    if (pointCount > 50) return 5;
    return 6;
  };
  
  const dynamicRadius = getDynamicDotRadius(visiblePointsCount);
  
  // MODIFIED: Pass new state to the dot renderer
  const renderDynamicDot = (props) => {
    const { key, ...rest } = props;
    return <AnomalyDot 
        key={key} 
        {...rest} 
        selectedAnomalyKey={selectedAnomalyKey} 
        showManualAnomalies={showManualAnomalies} 
        dynamicRadius={dynamicRadius} 
    />;
  };
  
  // This handler is *only* for toggling the manual 'anomaly' field, which is correct.
  const handleChartClick = (e) => {
    if (!e || e.activeTooltipIndex == null) return;
    
    const clickedIndex = e.activeTooltipIndex;
    const dataPoint = chartData[clickedIndex];
    if (dataPoint && dataPoint.heart_rate != null) {
      onAnomalyToggle(dataPoint.originalIndex);
    }
  };
  
  const toggleParam = (paramKey) => {
    setVisibleParams(prev => {
      const newSet = new Set(prev);
      newSet.has(paramKey) ? newSet.delete(paramKey) : newSet.add(paramKey);
      return newSet;
    });
  };
  
  // MODIFIED: Tooltip now shows both Manual and ML status
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const dataPoint = payload[0].payload;
        
        // 1. Get ML Anomaly Status
        const mlAnomalyStatus = dataPoint[selectedAnomalyKey];
        const mlAnomalySource = anomalySources.find(s => s.key === selectedAnomalyKey)?.label || 'ML Status';

        // 2. Get Manual Anomaly Status
        const manualAnomalyStatus = dataPoint.anomaly;

        return (
          <div className="p-4 bg-white/80 backdrop-blur-md border border-slate-300 rounded-lg shadow-xl text-sm">
            <p className="font-bold mb-2 text-slate-900">{`Time: ${formatDuration(label)}`}</p>
            <ul className="list-none p-0 m-0 space-y-1.5">
              <li className="flex items-center justify-between font-semibold" style={{ color: '#dc2626' }}>
                <span>Heart Rate:</span>
                <span>{`${dataPoint.heart_rate != null ? dataPoint.heart_rate.toFixed(0) : 'N/A'} bpm`}</span>
              </li>

              {/* Show Manual Status */}
              <li className={`flex items-center justify-between font-bold ${manualAnomalyStatus === 1 ? 'text-red-600' : 'text-green-600'}`}>
                  <span>Manual Label:</span>
                  <span>{manualAnomalyStatus === 1 ? 'Anomaly' : 'Normal'}</span>
              </li>

              {/* Show ML Status */}
              {mlAnomalyStatus != null && (
                <li className={`flex items-center justify-between font-bold`} style={{ color: mlAnomalyStatus === 1 ? ML_ANOMALY_COLOR : '#16a34a' }}>
                  <span>{mlAnomalySource}:</span>
                  <span>{mlAnomalyStatus === 1 ? 'Anomaly' : 'Normal'}</span>
                </li>
              )}
              
              <hr className="my-1 border-slate-200" />
              {chartableParams.map(param => {
                  if (visibleParams.has(param.key)) {
                    const value = dataPoint[param.key];
                    let displayValue;
                    if (value == null) {
                        displayValue = 'N/A';
                    } else if (param.key.includes('speed')) {
                        displayValue = `${formatPace(value)} ${param.unit}`;
                    } else if (param.key.includes('altitude')) {
                        displayValue = `${value.toFixed(2)} ${param.unit}`;
                    } else {
                        displayValue = `${value.toFixed(1)} ${param.unit}`;
                    }
                    return (
                        <li key={param.key} className="flex items-center justify-between" style={{ color: param.color }}>
                            <span>{param.label}:</span>
                            <span className="font-medium">{displayValue}</span>
                        </li>
                    );
                  }
                  return null;
              })}
            </ul>
          </div>
        );
      }
      return null;
  };

  return (
    <div className="p-4 sm:p-6">
        <div className="flex flex-wrap justify-between items-center border-b border-slate-200 pb-4 mb-6 gap-4">
            <div className='flex items-center gap-3'>
                <ChartBarIcon className="w-7 h-7 text-indigo-500"/>
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Interactive Performance Chart</h3>
                    {hasUnsavedChanges && <p className="text-xs text-amber-600 font-semibold flex items-center gap-1"><ExclamationCircleIcon className="w-3.5 h-3.5" />Unsaved Changes</p>}
                </div>
            </div>
            {hasUnsavedChanges && (
                <button onClick={onSaveChanges} disabled={isSaving} className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                    <CheckCircleIcon className="w-5 h-5" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            )}
        </div>

        <div className="mb-6">
            <p className="text-sm font-medium text-slate-600 mb-3">Add parameters to chart:</p>
            <div className="flex flex-wrap items-center gap-2">
            {chartableParams.map(param => (
                <button key={param.key} onClick={() => toggleParam(param.key)} className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 border ${visibleParams.has(param.key) ? 'text-white border-transparent' : 'text-slate-700 bg-white border-slate-300 hover:bg-slate-50 hover:border-slate-400'}`} style={visibleParams.has(param.key) ? { backgroundColor: param.color } : {}}>
                {param.label}
                </button>
            ))}
            </div>
        </div>
        
        {/* MODIFIED: This section is updated with the new controls */}
        <div className="mb-4">
            <div className="flex flex-wrap justify-between items-center mb-2 gap-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Anomaly Overview</p>
                
                <div className="flex items-center gap-4">
                    {/* NEW: Checkbox to toggle manual labels */}
                    <label className="flex items-center text-sm font-medium text-slate-700">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                            checked={showManualAnomalies}
                            onChange={(e) => setShowManualAnomalies(e.target.checked)}
                        />
                        <span className="ml-2">Show Manual Labels</span>
                    </label>

                    {/* MODIFIED: This is now just for ML Predictions */}
                    <div className="flex items-center gap-2">
                        <label htmlFor="anomaly-source" className="text-sm font-medium text-slate-700">ML Prediction:</label>
                        <select
                            id="anomaly-source"
                            value={selectedAnomalyKey}
                            onChange={(e) => setSelectedAnomalyKey(e.target.value)}
                            className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm text-sm focus:ring-sky-500 focus:border-sky-500"
                        >
                            {anomalySources.map(source => (
                                <option key={source.key} value={source.key}>{source.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            
            {/* MODIFIED: Pass new props to the timeline */}
            <AnomalyTimeline 
                data={chartData} 
                onSegmentClick={onTimelineZoom} 
                selectedAnomalyKey={selectedAnomalyKey} 
                showManualAnomalies={showManualAnomalies} 
            />
        </div>

        <div style={{ width: '100%', height: chartHeight }} className="relative">
            {!hasHeartRateData && (<div className="absolute inset-0 flex items-center justify-center bg-slate-50/70 z-10 rounded-md"><p className="text-slate-500 font-medium text-lg">Heart Rate data not available.</p></div>)}
            <ResponsiveContainer key={brushKey}>
                {/* MODIFIED: Cursor is always pointer, as clicking always edits manual labels */}
                <LineChart 
                    data={chartData} 
                    margin={chartMargin} 
                    onClick={handleChartClick}
                    style={{ cursor: 'pointer' }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke={isMounted ? "#e2e8f0" : "transparent"} />
                    <XAxis dataKey="elapsed_time" tickFormatter={formatDuration} label={{ value: "Elapsed Time", position: "insideBottom", offset: -50, dy: 10, fill: '#475569' }} type="number" domain={xAxisDomain} allowDataOverflow tick={{ fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={{ stroke: '#cbd5e1' }}/>
                    <YAxis yAxisId="left" stroke="#dc2626" label={{ value: 'Heart Rate (bpm)', angle: -90, position: 'insideLeft', offset: -10, style: {textAnchor: 'middle', fill: '#dc2626'}}} domain={hrDomain} allowDataOverflow tick={{ fill: '#dc2626' }} axisLine={{ stroke: '#fca5a5' }} tickLine={{ stroke: '#fca5a5' }}/>
                    {visibleParams.size > 0 && <YAxis yAxisId="right" orientation="right" stroke="#6366f1" tick={{ fill: '#6366f1' }} axisLine={{ stroke: '#a5b4fc' }} tickLine={{ stroke: '#a5b4fc' }} />}
                    
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '3 3' }}/>
                    <Legend verticalAlign="top" wrapperStyle={{paddingBottom: '20px', paddingTop: '5px'}}/>
                    
                    {hasHeartRateData && (
                        <>
                            <ReferenceLine yAxisId="left" y={session.avg_heart_rate} label={{ value: `Avg: ${session.avg_heart_rate}`, position: 'right', fill: '#f59e0b' }} stroke="#f59e0b" strokeDasharray="4 4" />
                            <ReferenceLine yAxisId="left" y={session.max_heart_rate} label={{ value: `Max: ${session.max_heart_rate}`, position: 'right', fill: '#ef4444' }} stroke="#ef4444" strokeDasharray="4 4" />
                        </>
                    )}
                    
                    {chartableParams.map(param => visibleParams.has(param.key) && (<Line key={param.key} yAxisId="right" type="monotone" dataKey={param.key} name={param.label} stroke={param.color} dot={false} strokeWidth={1.5} connectNulls />))}
                    
                    {/* MODIFIED: The 'dot' prop calls our updated renderDynamicDot function */}
                    <Line yAxisId="left" type="monotone" dataKey="heart_rate" name="Heart Rate" stroke="#dc2626" strokeWidth={2.5} dot={renderDynamicDot} activeDot={{ r: 8 }} connectNulls zIndex={100} />
                    
                    <Brush dataKey="elapsed_time" height={35} stroke="#6366f1" onChange={onBrushChange} tickFormatter={formatDuration} startIndex={activeDomain?.startIndex} endIndex={activeDomain?.endIndex} alwaysShowText={true} y={chartHeight - 45}>
                        <LineChart><Line type="monotone" dataKey="heart_rate" stroke="#dc2626" dot={false} connectNulls /></LineChart>
                    </Brush>
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
};

const TimeInput = ({ totalSeconds, onChange, maxSeconds }) => {
    const [time, setTime] = useState({ h: 0, m: 0, s: 0 });
    useEffect(() => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = Math.floor(totalSeconds % 60);
        setTime({ h, m, s });
    }, [totalSeconds]);
    const handleChange = (part, value) => {
        const numValue = parseInt(value, 10) || 0;
        const newTime = { ...time, [part]: numValue };
        const newTotalSeconds = newTime.h * 3600 + newTime.m * 60 + newTime.s;
        if (newTotalSeconds <= maxSeconds) {
            setTime(newTime);
            onChange(newTotalSeconds);
        } else {
            onChange(maxSeconds);
        }
    };
    return (
        <div className="flex items-center gap-1 p-1 border border-slate-300 rounded-md shadow-sm bg-white">
            <input type="number" value={time.h.toString().padStart(2, '0')} onChange={e => handleChange('h', e.target.value)} className="w-12 text-center border-none focus:ring-0 bg-transparent" placeholder="HH" /> :
            <input type="number" value={time.m.toString().padStart(2, '0')} onChange={e => handleChange('m', e.target.value)} min="0" max="59" className="w-12 text-center border-none focus:ring-0 bg-transparent" placeholder="MM" /> :
            <input type="number" value={time.s.toString().padStart(2, '0')} onChange={e => handleChange('s', e.target.value)} min="0" max="59" className="w-12 text-center border-none focus:ring-0 bg-transparent" placeholder="SS" />
        </div>
    );
};
const ChartControls = ({ activeDomain, onProgrammaticDomainChange, onResetZoom, chartData, chartHeight, setChartHeight, onApplySplit, onClearSplit, onNextSegment, onPreviousSegment, splitSegments, currentSegmentIndex }) => {
    const totalDuration = chartData.length > 0 ? Math.round(chartData[chartData.length - 1].elapsed_time) : 0;
    const [startSeconds, setStartSeconds] = useState(0);
    const [endSeconds, setEndSeconds] = useState(totalDuration);
    const [splitType, setSplitType] = useState('count');
    const [splitValue, setSplitValue] = useState('');
    const isSplitActive = splitSegments.length > 0 && currentSegmentIndex !== null;
    useEffect(() => {
        if (activeDomain && chartData.length > 0 && activeDomain.startIndex != null) {
            const start = chartData[activeDomain.startIndex]?.elapsed_time;
            const end = chartData[activeDomain.endIndex]?.elapsed_time;
            setStartSeconds(start != null ? Math.round(start) : 0);
            setEndSeconds(end != null ? Math.round(end) : totalDuration);
        } else {
            setStartSeconds(0);
            setEndSeconds(totalDuration);
        }
    }, [activeDomain, chartData, totalDuration]);
    const handleApplyTime = () => {
        if (startSeconds == null || endSeconds == null || startSeconds >= endSeconds) {
            alert("Invalid time range."); return;
        }
        const startIndex = chartData.findIndex(d => d.elapsed_time >= startSeconds);
        let endIndex = chartData.findIndex(d => d.elapsed_time >= endSeconds);
        if (endIndex === -1) endIndex = chartData.length - 1;
        if (startIndex > -1) onProgrammaticDomainChange({ startIndex, endIndex });
    };
    const handleApplySplitClick = () => {
        const value = Number(splitValue);
        if (isNaN(value) || value <= 0) {
            alert('Please enter a valid positive number.'); return;
        }
        onApplySplit({ type: splitType, value });
        setSplitValue('');
    };
    return (
        <div className="bg-slate-50 p-4 sm:p-6 border-t border-slate-200 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-3">
                    <h4 className="text-base font-semibold text-slate-700">View Controls</h4>
                    <div className="flex flex-wrap items-end gap-3">
                        <div><label className="block text-xs font-medium text-slate-500 mb-1">Start Time</label><TimeInput totalSeconds={startSeconds} onChange={setStartSeconds} maxSeconds={totalDuration}/></div>
                        <div><label className="block text-xs font-medium text-slate-500 mb-1">End Time</label><TimeInput totalSeconds={endSeconds} onChange={setEndSeconds} maxSeconds={totalDuration}/></div>
                        <button onClick={handleApplyTime} className="h-11 rounded-md bg-indigo-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">Apply</button>
                        <button onClick={onResetZoom} className="h-11 w-11 flex items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50" title="Reset Zoom"><ArrowPathIcon className="w-5 h-5" /></button>
                    </div>
                </div>
                <div className="space-y-3">
                    <h4 className="text-base font-semibold text-slate-700">Appearance</h4>
                    <div className="flex-grow">
                        <label htmlFor="chart-height" className="block text-xs font-medium text-slate-500 mb-1">Chart Height: {chartHeight}px</label>
                        <div className="flex items-center gap-2 pt-1.5">
                            <ArrowsUpDownIcon className="w-5 h-5 text-slate-400" />
                            <input id="chart-height" type="range" min="400" max="1200" step="20" value={chartHeight} onChange={(e) => setChartHeight(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="bg-slate-100 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                    <ScissorsIcon className="w-5 h-5 text-slate-600" />
                    <h4 className="text-base font-semibold text-slate-700">Split View</h4>
                </div>
                {!isSplitActive ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                        <div className="flex-1"><label className="text-xs font-medium text-slate-500 mb-1.5 block">Split Method</label><div className="flex items-center gap-1 bg-slate-200 p-1 rounded-lg"><button onClick={() => setSplitType('count')} className={`flex-1 px-3 py-1 rounded-md text-sm font-semibold transition-colors ${splitType === 'count' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}>By # Segments</button><button onClick={() => setSplitType('time')} className={`flex-1 px-3 py-1 rounded-md text-sm font-semibold transition-colors ${splitType === 'time' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}>By Duration</button><button onClick={() => setSplitType('points')} className={`flex-1 px-3 py-1 rounded-md text-sm font-semibold transition-colors ${splitType === 'points' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}>By # Points</button></div></div>
                        <div className="flex-1 w-full sm:w-auto"><label htmlFor="split-value" className="text-xs font-medium text-slate-500 mb-1.5 block">Value</label><input type="number" id="split-value" value={splitValue} onChange={e => setSplitValue(e.target.value)} className="h-10 w-full rounded-md border-slate-300 shadow-sm text-sm" placeholder={splitType === 'count' ? 'e.g., 4 segs' : splitType === 'time' ? 'e.g., 300 sec' : 'e.g., 150 HR points'} min="1" /></div>
                        <button onClick={handleApplySplitClick} className="h-10 w-full sm:w-auto rounded-md bg-slate-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">Apply Split</button>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center gap-4">
                        <p className="text-sm font-medium text-slate-700">Segment <span className="font-bold text-slate-900">{currentSegmentIndex + 1}</span> of <span className="font-bold text-slate-900">{splitSegments.length}</span></p>
                        <div className="flex items-center"><button onClick={onPreviousSegment} disabled={currentSegmentIndex === 0} className="p-2 rounded-l-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"><ChevronLeftIcon className="w-5 h-5" /></button><button onClick={onNextSegment} disabled={currentSegmentIndex >= splitSegments.length - 1} className="p-2 rounded-r-md border-y border-r border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"><ChevronRightIcon className="w-5 h-5" /></button></div>
                        <button onClick={onClearSplit} className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"><XCircleIcon className="w-4 h-4" />Clear Split</button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
export default function SessionDetailPage() {
  const session = useLoaderData();
  const navigate = useNavigate();
  const { authToken } = useAuth();
  
  const [interactiveData, setInteractiveData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ state: 'idle', message: '' });
  
  const [activeDomain, setActiveDomain] = useState(null);
  const [brushKey, setBrushKey] = useState(0);
  const [chartHeight, setChartHeight] = useState(600);
  const [splitSegments, setSplitSegments] = useState([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(null);

  const dropdownRef = useRef(null);
  const parentRef = useRef(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(['timestamp', 'anomaly', 'heart_rate', 'speed', 'distance']);
  const timestampHeaderRef = useRef(null);
  const [timestampColWidth, setTimestampColWidth] = useState(0);
  const [showOnlyAnomalies, setShowOnlyAnomalies] = useState(false);
  const [hideNullHeartRate, setHideNullHeartRate] = useState(false);
  const [tableHeightClass, setTableHeightClass] = useState('max-h-96');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [changeSummary, setChangeSummary] = useState([]);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const normalizedTimeseriesData = useMemo(() => {
    if (!session.timeseries_data) return [];
    return session.timeseries_data.map((row, index) => {
        const newRow = {};
        for (const key in row) { newRow[key.toLowerCase()] = row[key]; }
        newRow.originalIndex = index;
        newRow.anomaly = Number(row.anomaly) === 1 ? 1 : 0;
        return newRow;
    });
  }, [session.timeseries_data]);

  useEffect(() => {
    if (normalizedTimeseriesData && normalizedTimeseriesData.length > 0) {
        const fullRange = { startIndex: 0, endIndex: normalizedTimeseriesData.length - 1 };
        setInteractiveData(JSON.parse(JSON.stringify(normalizedTimeseriesData)));
        setOriginalData(JSON.parse(JSON.stringify(normalizedTimeseriesData)));
        setActiveDomain(fullRange);
        setHasUnsavedChanges(false);
        setIsLoading(false); 
    } else {
        setIsLoading(false);
    }
  }, [normalizedTimeseriesData]);

  useEffect(() => {
    if (saveStatus.state !== 'idle') {
        const timer = setTimeout(() => setSaveStatus({ state: 'idle', message: '' }), 3000);
        return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const { hrDomain, hasHeartRateData } = useMemo(() => {
    if (!interactiveData || interactiveData.length === 0) {
        return { hrDomain: ['auto', 'auto'], hasHeartRateData: false };
    }
    const heartRates = interactiveData.map(d => d.heart_rate).filter(hr => hr != null);
    if (heartRates.length === 0) return { hrDomain: [60, 180], hasHeartRateData: false };
    const minHr = Math.min(...heartRates);
    const maxHr = Math.max(...heartRates);
    return { hrDomain: [Math.floor(minHr - 5), Math.ceil(maxHr + 10)], hasHeartRateData: true };
  }, [interactiveData]);

  const chartData = useMemo(() => {
    if (!interactiveData || interactiveData.length === 0) return [];
    const startTime = new Date(interactiveData[0].timestamp).getTime();
    return interactiveData.map(d => ({
        ...d,
        elapsed_time: (new Date(d.timestamp).getTime() - startTime) / 1000,
    }));
  }, [interactiveData]);

  const hasTimeseries = chartData && chartData.length > 0;
  
  const hasAnomalies = useMemo(() => interactiveData.some(d => d.anomaly === 1), [interactiveData]);

  const derivedStats = useMemo(() => {
    if (!hasTimeseries) return {};
    const heartRates = chartData.map(r => r.heart_rate).filter(hr => hr != null);
    const speeds = chartData.map(r => r.speed).filter(s => s != null && s > 0.1);
    const minHeartRate = heartRates.length ? Math.min(...heartRates) : null;
    const fastestSpeed = speeds.length ? Math.max(...speeds) : null;
    const slowestSpeed = speeds.length ? Math.min(...speeds) : null;
    const avgSpeed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null;
    let totalAscent = 0;
    let totalDescent = 0;
    for (let i = 1; i < chartData.length; i++) {
      const prevAlt = chartData[i-1].altitude;
      const currentAlt = chartData[i].altitude;
      if (prevAlt != null && currentAlt != null) {
        const diff = currentAlt - prevAlt;
        if (diff > 0) totalAscent += diff;
        else totalDescent += Math.abs(diff);
      }
    }
    return {
      minHeartRate,
      fastestPace: formatPace(fastestSpeed),
      slowestPace: formatPace(slowestSpeed),
      avgPace: formatPace(avgSpeed),
      totalAscent: Math.round(totalAscent),
      totalDescent: Math.round(totalDescent),
    };
  }, [hasTimeseries, chartData]);
  
  const handleAnomalyToggle = (originalIndex) => {
    if (originalIndex == null) return;
    const newData = interactiveData.map(record => {
        if (record.originalIndex === originalIndex) {
            return { ...record, anomaly: record.anomaly === 1 ? 0 : 1 };
        }
        return record;
    });
    setInteractiveData(newData);
    setHasUnsavedChanges(true);
  };

  const confirmSaveChanges = async (updatesToSave) => {
    setIsModalOpen(false);
    setIsSaving(true);
    setSaveStatus({ state: 'idle', message: '' });
    const payload = { updates: updatesToSave.map(u => ({ timestamp: u.timestamp, anomaly: u.to })) };
    try {
        const response = await fetch(`${API_BASE_URL}/api/sessions/${session.id}/update-anomalies/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${authToken}` },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to save changes.');
        }
        setSaveStatus({ state: 'success', message: 'Changes saved successfully!' });
        setOriginalData(JSON.parse(JSON.stringify(interactiveData)));
        setHasUnsavedChanges(false);
    } catch (error) {
        console.error("Save error:", error);
        setSaveStatus({ state: 'error', message: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  const initiateSaveChanges = () => {
    const updates = interactiveData.reduce((acc, current, index) => {
        const original = originalData[index];
        if (original && current.anomaly !== original.anomaly) {
            acc.push({ timestamp: current.timestamp, from: original.anomaly, to: current.anomaly });
        }
        return acc;
    }, []);
    if (updates.length === 0) {
        setSaveStatus({ state: 'error', message: "No changes detected to save." });
        return;
    }
    setChangeSummary(updates);
    setIsModalOpen(true);
  };

  const handleOpenResetModal = () => setIsResetModalOpen(true);
  const handleConfirmReset = () => {
    const newData = interactiveData.map(record => ({...record, anomaly: 0}));
    setInteractiveData(newData);
    setHasUnsavedChanges(true);
    setIsResetModalOpen(false);
  };

  const handleBrushChange = (newDomain) => {
    if (newDomain && newDomain.startIndex != null) {
        setActiveDomain(newDomain);
    }
  };
  
  const handleProgrammaticDomainChange = (newDomain, fromSplit = false) => {
    if (!fromSplit) {
        setSplitSegments([]);
        setCurrentSegmentIndex(null);
    }
    setActiveDomain(newDomain);
    setBrushKey(k => k + 1);
  };

  const handleTimelineZoom = (segment) => {
    if (!segment || !chartData || chartData.length === 0) return;
    const windowSize = 10;
    const hrPoints = chartData.map((point, index) => ({ ...point, originalArrayIndex: index })).filter(point => point.heart_rate != null);
    if (hrPoints.length === 0) return;
    const middleOriginalIndex = Math.floor((segment.start + segment.end) / 2);
    let middleHrIndex = hrPoints.findIndex(p => p.originalArrayIndex >= middleOriginalIndex);
    if (middleHrIndex === -1) { middleHrIndex = hrPoints.length - 1; }
    let hrStartIndex = middleHrIndex - Math.floor(windowSize / 2);
    let hrEndIndex = hrStartIndex + windowSize - 1;
    const hrPointsLength = hrPoints.length;
    if (hrEndIndex >= hrPointsLength) { hrEndIndex = hrPointsLength - 1; hrStartIndex = Math.max(0, hrEndIndex - windowSize + 1); }
    if (hrStartIndex < 0) { hrStartIndex = 0; hrEndIndex = Math.min(windowSize - 1, hrPointsLength - 1); }
    const finalStartIndex = hrPoints[hrStartIndex].originalArrayIndex;
    const finalEndIndex = hrPoints[hrEndIndex].originalArrayIndex;
    handleProgrammaticDomainChange({ startIndex: finalStartIndex, endIndex: finalEndIndex });
  };
  const handleClearSplit = () => {
    setSplitSegments([]);
    setCurrentSegmentIndex(null);
    if (chartData && chartData.length > 0) { handleProgrammaticDomainChange({ startIndex: 0, endIndex: chartData.length - 1 }); } 
    else { setActiveDomain(null); }
  };
  const handleResetZoom = () => handleClearSplit();
  const handleApplySplit = (config) => {
    if (!chartData || chartData.length === 0) return;
    const { type, value } = config;
    const totalPoints = chartData.length;
    const totalDuration = chartData[totalPoints - 1].elapsed_time;
    let segments = [];
    if (type === 'count' && value > 0) {
        const segmentSize = Math.floor(totalPoints / value);
        for (let i = 0; i < value; i++) {
            const startIndex = i * segmentSize;
            let endIndex = (i === value - 1) ? totalPoints - 1 : (i + 1) * segmentSize - 1;
            if (startIndex < totalPoints) { segments.push({ startIndex, endIndex }); }
        }
    } else if (type === 'time' && value > 0) {
        const timeInSeconds = value;
        let currentStartTime = 0;
        while (currentStartTime < totalDuration) {
            const currentEndTime = currentStartTime + timeInSeconds;
            const startIndex = chartData.findIndex(d => d.elapsed_time >= currentStartTime);
            if (startIndex === -1) break;
            let endIndex = chartData.findIndex(d => d.elapsed_time > currentEndTime);
            endIndex = endIndex === -1 ? totalPoints - 1 : endIndex - 1;
            if (endIndex < startIndex) endIndex = startIndex;
            segments.push({ startIndex, endIndex });
            currentStartTime += timeInSeconds;
        }
    } else if (type === 'points' && value > 0) {
        const pointsPerSegment = value;
        const hrPoints = chartData.map((point, index) => ({ ...point, originalArrayIndex: index })).filter(point => point.heart_rate != null);
        if (hrPoints.length === 0) { alert("No heart rate data found to create splits."); return; }
        for (let i = 0; i < hrPoints.length; i += pointsPerSegment) {
            const chunk = hrPoints.slice(i, i + pointsPerSegment);
            if (chunk.length > 0) {
                const startIndex = chunk[0].originalArrayIndex;
                const endIndex = chunk[chunk.length - 1].originalArrayIndex;
                segments.push({ startIndex, endIndex });
            }
        }
    }
    if (segments.length > 0) { setSplitSegments(segments); setCurrentSegmentIndex(0); handleProgrammaticDomainChange(segments[0], true); }
  };
  const navigateSegment = (direction) => {
    if (currentSegmentIndex === null || !splitSegments.length) return;
    const newIndex = currentSegmentIndex + direction;
    if (newIndex >= 0 && newIndex < splitSegments.length) { setCurrentSegmentIndex(newIndex); handleProgrammaticDomainChange(splitSegments[newIndex], true); }
  };
  const handleNextSegment = () => navigateSegment(1);
  const handlePreviousSegment = () => navigateSegment(-1);
  
  const allTableHeaders = useMemo(() => {
    if (!hasTimeseries) return [];
    const allKeys = new Set(['timestamp', 'anomaly']);
    interactiveData.forEach(row => Object.keys(row).forEach(key => allKeys.add(key)));
    const headers = Array.from(allKeys);
    const tsIndex = headers.indexOf('timestamp');
    if (tsIndex > 1) { const [tsHeader] = headers.splice(tsIndex, 1); headers.unshift(tsHeader); }
    const anIndex = headers.indexOf('anomaly');
    if (anIndex > 1) { const [anHeader] = headers.splice(anIndex, 1); headers.splice(1, 0, anHeader); }
    return headers;
  }, [hasTimeseries, interactiveData]);

  const handleColumnToggle = (header) => {
    setVisibleColumns(prev => prev.includes(header) ? prev.filter(h => h !== header) : [...prev, header]);
  };
  
  const filteredData = useMemo(() => {
    let data = interactiveData;
    if (showOnlyAnomalies) { data = data.filter(row => row.anomaly === 1); }
    if (hideNullHeartRate) { data = data.filter(row => row.heart_rate != null); }
    return data;
  }, [interactiveData, showOnlyAnomalies, hideNullHeartRate]);
  
  const rowVirtualizer = useVirtualizer({
    count: hasTimeseries ? filteredData.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0 ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end : 0;
  
  useLayoutEffect(() => {
    if (timestampHeaderRef.current) { setTimestampColWidth(timestampHeaderRef.current.offsetWidth); } 
    else { setTimestampColWidth(0); }
  }, [visibleColumns, isLoading]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) { setIsDropdownOpen(false); }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);
  
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

  const handleExport = async () => {
      if (!hasTimeseries) {
          alert("No data available to export.");
          return;
      }
      setIsExporting(true);
      try {
          const runDate = new Date(chartData[0].timestamp);
          const dateString = runDate.toISOString().split('T')[0];
          
          const safeFirstName = session.volunteer_first_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const safeLastName = session.volunteer_last_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const filename = `${safeFirstName}_${safeLastName}_${dateString}_session_${session.id}.csv`;

          const allHeaders = new Set(['timestamp', 'anomaly']);
          interactiveData.forEach(row => Object.keys(row).forEach(key => allHeaders.add(key)));
          
          const orderedHeaders = Array.from(allHeaders);
          const csvString = convertToCSV(interactiveData, orderedHeaders);
          downloadCSV(csvString, filename);
      } catch (err) {
          alert("An error occurred during export.");
          console.error(err);
      } finally {
          setIsExporting(false);
      }
  };
  
  if (isLoading) {
    return (
        <div className="p-4 sm:p-8 bg-slate-100 min-h-full font-sans flex items-center justify-center">
            <p className="text-slate-500">Loading session data...</p>
        </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 bg-slate-100 min-h-full font-sans">
        <ConfirmationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={() => confirmSaveChanges(changeSummary)} title="Confirm Anomaly Changes">
            <p className="text-sm text-gray-500">You are about to save the following {changeSummary.length} change(s):</p>
            <ul className="mt-4 space-y-2 text-sm max-h-60 overflow-y-auto">
                {changeSummary.map((change, index) => (
                    <li key={index} className="flex justify-between items-center">
                        <span className="font-mono text-gray-600">{formatTableCell('timestamp', change.timestamp)}</span>
                        <div>
                           <span className={`font-semibold ${change.from === 1 ? 'text-red-500' : 'text-green-500'}`}>{change.from === 1 ? 'Anomaly' : 'Normal'}</span>
                           <span className="mx-2 text-gray-400">→</span>
                           <span className={`font-semibold ${change.to === 1 ? 'text-red-500' : 'text-green-500'}`}>{change.to === 1 ? 'Anomaly' : 'Normal'}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </ConfirmationModal>
        <ResetConfirmationModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} onConfirm={handleConfirmReset} />
        <div className={`fixed top-5 right-5 transition-all duration-300 z-50 ${saveStatus.state !== 'idle' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5 pointer-events-none'}`}>
          {saveStatus.state === 'success' && (<div className="flex items-center gap-3 p-3 rounded-lg shadow-lg bg-green-500 text-white"><CheckCircleIcon className="w-6 h-6" /><span className="text-sm font-semibold">{saveStatus.message}</span></div>)}
          {saveStatus.state === 'error' && (<div className="flex items-center gap-3 p-3 rounded-lg shadow-lg bg-red-500 text-white"><XCircleIcon className="w-6 h-6" /><span className="text-sm font-semibold">{saveStatus.message}</span></div>)}
        </div>
        <div className="">
            <div className="mb-6 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-200"><ArrowLeftIcon className="w-6 h-6 text-slate-700" /></button>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Session Detail</h1>
            </div>
            <div className="space-y-8">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Performance Summary</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <StatCard icon={<ArrowsRightLeftIcon className="w-8 h-8" />} label="Total Distance" value={`${session.total_distance_km || 0} km`} />
                        <StatCard icon={<ClockIcon className="w-8 h-8" />} label="Duration" value={formatDuration(session.total_duration_secs)} />
                        <StatCard icon={<FireIcon className="w-8 h-8" />} label="Average Pace" value={derivedStats.avgPace} />
                        <StatCard icon={<SparklesIcon className="w-8 h-8" />} label="Fastest Pace" value={derivedStats.fastestPace} />
                        <StatCard icon={<ChartBarIcon className="w-8 h-8" />} label="Slowest Pace" value={derivedStats.slowestPace} />
                    </div>
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Elevation Summary</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <StatCard icon={<ArrowTrendingUpIcon className="w-8 h-8" />} label="Elevation Gain" value={`${derivedStats.totalAscent || 0} m`} />
                        <StatCard icon={<ArrowTrendingDownIcon className="w-8 h-8" />} label="Elevation Loss" value={`${derivedStats.totalDescent || 0} m`} />
                    </div>
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Heart Rate Analysis</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        <StatCard icon={<HeartIcon className="w-8 h-8" />} label="Avg Heart Rate" value={`${session.avg_heart_rate || 'N/A'} bpm`} />
                        <StatCard icon={<HeartIcon className="w-8 h-8 text-blue-500" />} label="Min Heart Rate" value={`${derivedStats.minHeartRate || 'N/A'} bpm`} />
                        <StatCard icon={<HeartIcon className="w-8 h-8 text-red-500" />} label="Max Heart Rate" value={`${session.max_heart_rate || 'N/A'} bpm`} />
                        <StatCard icon={<SparklesIcon className="w-8 h-8 text-gray-400" />} label="HRV" value="N/A" subValue="Data not available" />
                    </div>
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-4">Session Information</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <StatCard icon={<UserIcon className="w-8 h-8" />} label="Volunteer" value={`${session.volunteer_first_name} ${session.volunteer_last_name}`} />
                        <StatCard icon={<CalendarIcon className="w-8 h-8" />} label="Run Date" value={hasTimeseries ? formatDate(chartData[0].timestamp) : 'N/A'} />
                        <StatCard icon={<CloudArrowUpIcon className="w-8 h-8" />} label="Upload Date" value={formatDate(session.uploaded_at)} />
                        <StatCard icon={<CpuChipIcon className="w-8 h-8" />} label="ML Prediction" value={session.ml_prediction || 'N/A'} colorClass={session.ml_prediction === 'Anomaly' ? 'text-red-500' : 'text-green-600'} />
                        <EditableAdminLabel session={session} />
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-8 mt-8">
                {hasTimeseries ? (
                    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                        <HeartRateChart session={session} timeseriesData={chartData} activeDomain={activeDomain} onBrushChange={handleBrushChange} onAnomalyToggle={handleAnomalyToggle} onTimelineZoom={handleTimelineZoom} brushKey={brushKey} chartHeight={chartHeight} hasUnsavedChanges={hasUnsavedChanges} isSaving={isSaving} onSaveChanges={initiateSaveChanges} hrDomain={hrDomain} hasHeartRateData={hasHeartRateData} />
                        <ChartControls activeDomain={activeDomain} onProgrammaticDomainChange={handleProgrammaticDomainChange} onResetZoom={handleResetZoom} chartData={chartData} chartHeight={chartHeight} setChartHeight={setChartHeight} onApplySplit={handleApplySplit} onClearSplit={handleClearSplit} onNextSegment={handleNextSegment} onPreviousSegment={handlePreviousSegment} splitSegments={splitSegments} currentSegmentIndex={currentSegmentIndex} />
                    </div>
                ) : (
                    <div className="bg-white p-12 text-center rounded-xl shadow-lg border border-slate-200">
                        <SparklesIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <h3 className="mt-2 text-lg font-medium text-slate-800">No Chart Data</h3>
                        <p className="mt-1 text-sm text-slate-500">No time-series data was found for this session.</p>
                    </div>
                )}
                {hasTimeseries && (
                    <div className="bg-white p-6 rounded-xl shadow-lg min-w-0">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-bold text-gray-900">Raw Data Table</h3>
                                {hasUnsavedChanges && (
                                    <button onClick={initiateSaveChanges} disabled={isSaving} className="flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 disabled:bg-slate-400">
                                        <CheckCircleIcon className="w-4 h-4" />
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                )}
                                {hasAnomalies && (
                                     <button onClick={handleOpenResetModal} disabled={isSaving} className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 disabled:bg-slate-400">
                                        <ArrowPathIcon className="w-4 h-4" />
                                        Reset All
                                    </button>
                                )}
                                {/* ✅ MOVED and UPDATED Export Button */}
                                <button onClick={handleExport} disabled={isExporting} className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:bg-slate-400">
                                    <CloudArrowDownIcon className="w-4 h-4" />
                                    {isExporting ? 'Exporting...' : 'Export CSV'}
                                </button>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <label htmlFor="table-height" className="text-sm font-medium text-gray-700">Rows:</label>
                                    <select id="table-height" value={tableHeightClass} onChange={(e) => setTableHeightClass(e.target.value)} className="rounded-md border-gray-300 text-sm focus:ring-sky-500 focus:border-sky-500 py-1">
                                        <option value="max-h-96">Default</option>
                                        <option value="max-h-[40rem]">Medium</option>
                                        <option value="max-h-[60rem]">Large</option>
                                    </select>
                                </div>
                                <label className="flex items-center text-sm font-medium text-gray-700"><input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" checked={hideNullHeartRate} onChange={(e) => setHideNullHeartRate(e.target.checked)} /><span className="ml-2">Hide N/A Heart Rate</span></label>
                                <label className="flex items-center text-sm font-medium text-gray-700"><input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" checked={showOnlyAnomalies} onChange={(e) => setShowOnlyAnomalies(e.target.checked)} /><span className="ml-2">Show Only Anomalies</span></label>
                                <div className="relative" ref={dropdownRef}>
                                    <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 text-sm font-medium text-sky-600 hover:text-sky-800 border px-3 py-1 rounded-md hover:bg-sky-50">
                                        Columns <ChevronDownIcon className="w-4 h-4" />
                                    </button>
                                    <div className={`absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-40 border max-h-60 overflow-y-auto ${!isDropdownOpen && 'hidden'}`}>
                                        <div className="py-1">
                                            {allTableHeaders.map(header => (
                                                <label key={header} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                                                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" checked={visibleColumns.includes(header)} onChange={() => handleColumnToggle(header)} disabled={header === 'timestamp' || header === 'anomaly'} />
                                                    <span className="ml-3">{formatHeader(header)}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div ref={parentRef} className={`${tableHeightClass} overflow-auto border rounded-lg relative`}>
                            <table className="min-w-full text-sm text-left text-gray-500 table-auto">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-30">
                                    <tr>
                                        {visibleColumns.map(header => {
                                            const isTimestamp = header === 'timestamp';
                                            const isAnomaly = header === 'anomaly';
                                            const isTimestampVisible = visibleColumns.includes('timestamp');
                                            let thClasses = 'px-6 py-3';
                                            let thStyle = {};
                                            if (isTimestamp) { thClasses += ' sticky left-0 bg-gray-50 z-20'; } 
                                            else if (isAnomaly) { thClasses += ' sticky z-10 bg-gray-50 border-l'; thStyle = { left: isTimestampVisible ? `${timestampColWidth}px` : '0px' }; }
                                            return (<th key={header} ref={isTimestamp ? timestampHeaderRef : null} scope="col" className={thClasses} style={thStyle}>{formatHeader(header)}</th>);
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paddingTop > 0 && (<tr><td colSpan={visibleColumns.length} style={{ height: `${paddingTop}px` }} /></tr>)}
                                    {virtualItems.map(virtualRow => {
                                        const row = filteredData[virtualRow.index];
                                        return (
                                            <tr key={virtualRow.index} className="hover:bg-gray-50 border-b">
                                                {visibleColumns.map(header => {
                                                    const isTimestamp = header === 'timestamp';
                                                    const isAnomaly = header === 'anomaly';
                                                    const isTimestampVisible = visibleColumns.includes('timestamp');
                                                    let tdClasses = 'px-6 py-2 font-medium text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis';
                                                    let tdStyle = {};
                                                    if (isTimestamp) { tdClasses += ' sticky left-0 bg-white hover:bg-gray-50 z-10'; } 
                                                    else if (isAnomaly) { tdClasses += ' sticky bg-white hover:bg-gray-50 border-l z-10'; tdStyle = { left: isTimestampVisible ? `${timestampColWidth}px` : '0px' }; } 
                                                    else { tdClasses += ' bg-white'; }
                                                    return (
                                                        <td key={header} className={tdClasses} style={tdStyle}>
                                                            {isAnomaly ? (
                                                                <button onClick={() => handleAnomalyToggle(row.originalIndex)} className={`h-6 w-6 rounded-full text-white text-xs flex items-center justify-center ${row.anomaly === 1 ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-300 hover:bg-gray-400'}`} title={`Click to toggle anomaly status (current: ${row.anomaly})`}>
                                                                    {row.anomaly}
                                                                </button>
                                                            ) : (
                                                                formatTableCell(header, row[header])
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                    {paddingBottom > 0 && (<tr><td colSpan={visibleColumns.length} style={{ height: `${paddingBottom}px` }} /></tr>)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
