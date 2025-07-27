import { useLoaderData, useNavigate } from 'react-router-dom';
import { useMemo, useState, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush, ReferenceLine } from 'recharts';
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
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { getAuthToken } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const UNIT_MAP = {
  heart_rate: 'bpm',
  speed: 'm/s',
  distance: 'm',
  altitude: 'm',
  cadence: 'rpm',
  power: 'watts',
  position_lat: 'deg',
  position_long: 'deg',
  temperature: '°C',
  respiration_rate: 'breaths/min',
};

export async function loader({ params }) {
  const { sessionId } = params;
  const authToken = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/`, {
    headers: { 'Authorization': `Token ${authToken}` },
  });
  if (!response.ok) { throw response; }
  return response.json();
}

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

const formatHeader = (header) => {
  let title = header.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  if (UNIT_MAP[header]) { title += ` (${UNIT_MAP[header]})`; }
  return title;
};

const formatDuration = (totalSeconds) => {
  if (totalSeconds == null || isNaN(totalSeconds)) return 'N/A';
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
  return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')} /km`;
};

// New function to format dates as "DD Mon YYYY"
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
};


const EditableAdminLabel = ({ session }) => {
  const { authToken } = useAuth();
  const [currentLabel, setCurrentLabel] = useState(session.admin_label || 'Normal');
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveLabel = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/${session.id}/update-label/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${authToken}`,
        },
        body: JSON.stringify({ admin_label: currentLabel }),
      });
      if (response.status === 404) {
          throw new Error('Failed to save label: The API endpoint was not found (404). Please check your backend URL configuration.');
      }
      if (!response.ok) {
        throw new Error('Failed to save label. Please try again.');
      }
      
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
          <select
            value={currentLabel}
            onChange={(e) => setCurrentLabel(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm text-base focus:ring-sky-500 focus:border-sky-500"
          >
            <option>Normal</option>
            <option>Ischemic Anomaly</option>
            <option>Arrhythmic Anomaly</option>
          </select>
          <button
            onClick={handleSaveLabel}
            disabled={isSaving || currentLabel === (session.admin_label || 'Normal')}
            className="rounded-md bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {isSaving ? '...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

const chartableParams = [
  { key: 'speed', label: 'Speed', unit: 'm/s', color: '#38bdf8' },
  { key: 'cadence', label: 'Cadence', unit: 'rpm', color: '#fb923c' },
  { key: 'power', label: 'Power', unit: 'watts', color: '#6d28d9' },
  { key: 'altitude', label: 'Altitude', unit: 'm', color: '#4ade80' },
  { key: 'distance', label: 'Distance', unit: 'm', color: '#a78bfa' },
  { key: 'gps_accuracy', label: 'GPS Accuracy', unit: 'm', color: '#facc15' },
  { key: 'position_lat', label: 'Latitude', unit: 'deg', color: '#2dd4bf' },
  { key: 'position_long', label: 'Longitude', unit: 'deg', color: '#e879f9' },
  { key: 'enhanced_speed', label: 'Enhanced Speed', unit: 'm/s', color: '#0ea5e9' },
  { key: 'enhanced_altitude', label: 'Enhanced Altitude', unit: 'm', color: '#10b981' },
];

// --- ENHANCED CHART COMPONENT ---
const HeartRateChart = ({ session }) => {
  const [visibleParams, setVisibleParams] = useState(new Set());
  const [activeDomain, setActiveDomain] = useState(null);
  const [brushKey, setBrushKey] = useState(0);

  const chartData = useMemo(() => {
    if (!session?.timeseries_data || session.timeseries_data.length === 0) return [];
    const startTime = new Date(session.timeseries_data[0].timestamp).getTime();
    return session.timeseries_data.map(d => ({
      ...d,
      elapsed_time: (new Date(d.timestamp).getTime() - startTime) / 1000,
    }));
  }, [session]);

  const { hrDomain } = useMemo(() => {
    if (chartData.length === 0) return { hrDomain: ['auto', 'auto'] };
    const heartRates = chartData.map(d => d.heart_rate).filter(hr => hr != null);
    const minHr = heartRates.length ? Math.min(...heartRates) : 0;
    const maxHr = heartRates.length ? Math.max(...heartRates) : 100;
    return {
      hrDomain: [Math.floor(minHr - 5), Math.ceil(maxHr + 10)],
    };
  }, [chartData]);

  const xAxisDomain = useMemo(() => {
      if (!activeDomain || !chartData.length) {
          return ['dataMin', 'dataMax'];
      }
      const startSeconds = chartData[activeDomain.startIndex]?.elapsed_time;
      const endSeconds = chartData[activeDomain.endIndex]?.elapsed_time;
      if (startSeconds != null && endSeconds != null) {
          return [startSeconds, endSeconds];
      }
      return ['dataMin', 'dataMax'];
  }, [activeDomain, chartData]);

  const toggleParam = (paramKey) => {
    setVisibleParams(prev => {
      const newSet = new Set(prev);
      newSet.has(paramKey) ? newSet.delete(paramKey) : newSet.add(paramKey);
      return newSet;
    });
  };

  const handleZoom = (domain) => {
    setActiveDomain(domain);
  };

  const resetZoom = () => {
    setActiveDomain(null);
    setBrushKey(prevKey => prevKey + 1); 
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && label != null) {
      const dataPoint = chartData.find(d => d.elapsed_time === label);
      if (!dataPoint) return null;

      return (
        <div className="p-3 bg-white/90 backdrop-blur-sm border border-slate-300 rounded-lg shadow-xl">
          <p className="font-bold mb-2 text-slate-800">{`Time: ${formatDuration(label)}`}</p>
          <ul className="list-none p-0 m-0 space-y-1">
            <li style={{ color: '#ef4444' }}>
              {`Heart Rate: ${dataPoint.heart_rate != null ? dataPoint.heart_rate.toFixed(1) : 'N/A'} bpm`}
            </li>
            {chartableParams.map(param => {
              if (visibleParams.has(param.key)) {
                const value = dataPoint[param.key];
                return (
                  <li key={param.key} style={{ color: param.color }}>
                    {`${param.label}: ${value != null ? value.toFixed(1) : 'N/A'}`}
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
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
      <div className="flex flex-wrap justify-between items-center border-b pb-4 mb-4">
        <div className='flex items-center gap-3'>
          <ChartBarIcon className="w-6 h-6 text-sky-600"/>
          <h3 className="text-lg font-bold text-gray-900">Interactive Performance Chart</h3>
        </div>
        {activeDomain && (
          <button
            onClick={resetZoom}
            className="flex items-center gap-1.5 rounded-md bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-700 shadow-sm hover:bg-sky-200"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Reset Zoom
          </button>
        )}
      </div>
      
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Add parameters to chart:</p>
        <div className="flex flex-wrap items-center gap-2">
          {chartableParams.map(param => (
            <button
              key={param.key}
              onClick={() => toggleParam(param.key)}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                visibleParams.has(param.key) ? 'text-white' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
              }`}
              style={visibleParams.has(param.key) ? { backgroundColor: param.color } : {}}
            >
              {param.label}
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ width: '100%', height: 450 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            
            <XAxis 
              dataKey="elapsed_time" 
              tickFormatter={formatDuration}
              label={{ value: "Elapsed Time", position: "insideBottom", offset: -45 }}
              type="number"
              domain={xAxisDomain}
              allowDataOverflow
            />

            <YAxis 
              yAxisId="left" 
              stroke="#ef4444" 
              label={{ value: 'Heart Rate (bpm)', angle: -90, position: 'insideLeft', offset: -5, style: {textAnchor: 'middle'} }} 
              domain={hrDomain}
              allowDataOverflow
            />
            
            {visibleParams.size > 0 && (
              <YAxis yAxisId="right" orientation="right" stroke="#0ea5e9" />
            )}
            
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#38bdf8', strokeWidth: 1, strokeDasharray: '3 3' }}/>
            <Legend verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}} />
            
            <ReferenceLine yAxisId="left" y={session.avg_heart_rate} label={{ value: `Avg: ${session.avg_heart_rate}`, position: 'insideTopLeft', fill: '#6b7280', fontSize: '10px' }} stroke="#fb923c" strokeDasharray="4 4" />
            <ReferenceLine yAxisId="left" y={session.max_heart_rate} label={{ value: `Max: ${session.max_heart_rate}`, position: 'insideTopLeft', fill: '#6b7280', fontSize: '10px' }} stroke="#f87171" strokeDasharray="4 4" />

            <Line 
              yAxisId="left" 
              type="monotone" 
              dataKey="heart_rate" 
              name="Heart Rate (bpm)" 
              stroke="#ef4444"
              strokeWidth={2.5} 
              dot={false} 
              connectNulls
            />

            {chartableParams.map(param => 
              visibleParams.has(param.key) && (
                <Line 
                  key={param.key} 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey={param.key} 
                  name={`${param.label} (${param.unit})`} 
                  stroke={param.color} 
                  dot={false} 
                  connectNulls 
                />
              )
            )}
            
            <Brush 
                key={brushKey}
                dataKey="elapsed_time" 
                height={30} 
                stroke="#38bdf8" 
                onChange={handleZoom}
                tickFormatter={formatDuration}
                startIndex={activeDomain?.startIndex}
                endIndex={activeDomain?.endIndex}
            >
                <LineChart>
                     <Line type="monotone" dataKey="heart_rate" stroke="#ef4444" dot={false} connectNulls />
                </LineChart>
            </Brush>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};


export default function SessionDetailPage() {
  const session = useLoaderData();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const parentRef = useRef(null);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(['timestamp', 'heart_rate', 'speed', 'cadence', 'power', 'altitude']);

  const hasTimeseries = session.timeseries_data && session.timeseries_data.length > 0;
  
  const runDate = hasTimeseries
    ? new Date(session.timeseries_data[0].timestamp)
    : new Date(session.session_date);

  const derivedStats = useMemo(() => {
    if (!hasTimeseries) return {};
    const heartRates = session.timeseries_data.map(r => r.heart_rate).filter(hr => hr != null);
    const speeds = session.timeseries_data.map(r => r.speed).filter(s => s != null && s > 0.1);
    const minHeartRate = heartRates.length ? Math.min(...heartRates) : null;
    const fastestSpeed = speeds.length ? Math.max(...speeds) : null;
    const slowestSpeed = speeds.length ? Math.min(...speeds) : null;
    const avgSpeed = speeds.length ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null;
    let totalAscent = 0;
    let totalDescent = 0;
    for (let i = 1; i < session.timeseries_data.length; i++) {
      const prevAlt = session.timeseries_data[i-1].altitude;
      const currentAlt = session.timeseries_data[i].altitude;
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
  }, [hasTimeseries, session.timeseries_data]);


  const allTableHeaders = useMemo(() => {
    if (!hasTimeseries) return [];
    const allKeys = new Set();
    session.timeseries_data.forEach(row => Object.keys(row).forEach(key => allKeys.add(key)));
    const headers = Array.from(allKeys);
    const tsIndex = headers.indexOf('timestamp');
    if (tsIndex > -1) {
      const [tsHeader] = headers.splice(tsIndex, 1);
      headers.unshift(tsHeader);
    }
    return headers;
  }, [hasTimeseries, session.timeseries_data]);

  const handleColumnToggle = (header) => {
    setVisibleColumns(prev => 
      prev.includes(header) ? prev.filter(h => h !== header) : [...prev, header]
    );
  };
  
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);
  
  const rowVirtualizer = useVirtualizer({
    count: hasTimeseries ? session.timeseries_data.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length > 0 ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end : 0;

  return (
    <div className="p-4 sm:p-8 bg-slate-50 min-h-full">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-slate-200 transition-colors">
          <ArrowLeftIcon className="w-6 h-6 text-slate-700" />
        </button>
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
            <StatCard icon={<CalendarIcon className="w-8 h-8" />} label="Run Date" value={formatDate(runDate)} />
            <StatCard icon={<CloudArrowUpIcon className="w-8 h-8" />} label="Upload Date" value={formatDate(session.uploaded_at)} />
            <StatCard icon={<CpuChipIcon className="w-8 h-8" />} label="ML Prediction" value={session.ml_prediction || 'N/A'} colorClass={session.ml_prediction === 'Anomaly' ? 'text-red-500' : 'text-green-600'} />
            <EditableAdminLabel session={session} />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-8 mt-8">
        {hasTimeseries ? (
          <HeartRateChart session={session} />
        ) : (
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Chart</h3>
            <div className="w-full h-80 bg-slate-100 rounded-md flex items-center justify-center">
              <p className="text-slate-500">
                No time-series data available to display chart.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-xl shadow-lg min-w-0">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Raw Data Table</h3>
            {hasTimeseries && (
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-2 text-sm font-medium text-sky-600 hover:text-sky-800 border px-3 py-1 rounded-md hover:bg-sky-50">
                  Columns <ChevronDownIcon className="w-4 h-4" />
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-20 border max-h-60 overflow-y-auto">
                    <div className="py-1">
                      {allTableHeaders.map(header => (
                        <label key={header} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                          <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" checked={visibleColumns.includes(header)} onChange={() => handleColumnToggle(header)} disabled={header === 'timestamp'}/>
                          <span className="ml-3">{formatHeader(header)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div ref={parentRef} className="max-h-96 overflow-auto border rounded-lg relative">
            {hasTimeseries ? (
              <table className="min-w-full text-sm text-left text-gray-500 table-auto">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {visibleColumns.map(header => (
                      <th key={header} scope="col" className={`px-6 py-3 ${header === 'timestamp' ? 'sticky left-0 bg-gray-50' : ''}`}>
                        {formatHeader(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paddingTop > 0 && ( <tr><td colSpan={visibleColumns.length} style={{ height: `${paddingTop}px` }} /></tr> )}
                  {virtualItems.map(virtualRow => {
                    const row = session.timeseries_data[virtualRow.index];
                    return (
                      <tr key={virtualRow.index} className="hover:bg-gray-50">
                        {visibleColumns.map(header => (
                          <td key={header} className={`px-6 py-2 font-medium text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis border-b ${header === 'timestamp' ? 'sticky left-0 bg-white hover:bg-gray-50' : 'bg-white'}`}>
                            {header === 'timestamp' && row[header] ? new Date(row[header]).toLocaleTimeString() : String(row[header] ?? 'N/A')}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {paddingBottom > 0 && ( <tr><td colSpan={visibleColumns.length} style={{ height: `${paddingBottom}px` }} /></tr> )}
                </tbody>
              </table>
            ) : (
              <p className="p-6 text-center text-slate-500">No detailed time-series data available for this session.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}