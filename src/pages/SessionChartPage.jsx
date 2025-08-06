import { useLoaderData, useParams, Link } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush, ReferenceLine, Dot, ReferenceArea } from 'recharts';
import {
    ArrowLeftIcon,
    ChartBarIcon,
    ArrowPathIcon,
    ArrowsUpDownIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { getAuthToken } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// --- UTILITY FUNCTIONS ---
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

// --- CHART COMPONENTS ---
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

const HeartRateChart = ({ session, timeseriesData: chartData, onAnomalyToggle, activeDomain, setActiveDomain, brushKey, chartHeight, hasUnsavedChanges, isSaving, onSaveChanges }) => {
  const [visibleParams, setVisibleParams] = useState(new Set());  
  const chartMargin = { top: 5, right: 30, left: 20, bottom: 60 };

  const { hrDomain, hasHeartRateData } = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { hrDomain: ['auto', 'auto'], hasHeartRateData: false };
    }
    const heartRates = chartData.map(d => d.heart_rate).filter(hr => hr != null);
    let domain = [60, 180];
    let hasData = false;
    if (heartRates.length > 0) {
      const minHr = Math.min(...heartRates);
      const maxHr = Math.max(...heartRates);
      domain = [Math.floor(minHr - 5), Math.ceil(maxHr + 10)];
      hasData = true;
    }
    return { hrDomain: domain, hasHeartRateData: hasData };
  }, [chartData]);

  const xAxisDomain = useMemo(() => {
      if (!activeDomain || !chartData.length) return ['dataMin', 'dataMax'];
      const startSeconds = chartData[activeDomain.startIndex]?.elapsed_time;
      const endSeconds = chartData[activeDomain.endIndex]?.elapsed_time;
      if (startSeconds != null && endSeconds != null) return [startSeconds, endSeconds];
      return ['dataMin', 'dataMax'];
  }, [activeDomain, chartData]);

  const handleChartClick = (e) => {
    if (!e || e.activeTooltipIndex == null) return;
    const clickedIndex = e.activeTooltipIndex;
    const dataPoint = chartData[clickedIndex];
    if (dataPoint && dataPoint.heart_rate != null) {
      onAnomalyToggle(clickedIndex);
    }
  };

  const toggleParam = (paramKey) => {
    setVisibleParams(prev => {
      const newSet = new Set(prev);
      newSet.has(paramKey) ? newSet.delete(paramKey) : newSet.add(paramKey);
      return newSet;
    });
  };

  const renderConditionalDot = (props) => {
    const { cx, cy, payload, key } = props;
    if (payload.heart_rate == null) return null;
    const dotColor = payload.anomaly === 1 ? '#ef4444' : '#22c55e';
    return <Dot key={key} cx={cx} cy={cy} r={3} fill={dotColor} stroke="#fff" strokeWidth={1} />;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length && label != null) {
        // Find the index of the hovered data point
        const dataPointIndex = chartData.findIndex(d => d.elapsed_time === label);

        // If for some reason the index isn't found, don't render the tooltip
        if (dataPointIndex === -1) {
            return null;
        }

        const dataPoint = chartData[dataPointIndex];
  
        return (
          <div className="p-3 bg-white/90 backdrop-blur-sm border border-slate-300 rounded-lg shadow-xl">
            <p className="font-bold mb-2 text-slate-800">{`Time: ${formatDuration(label)}`}</p>
            {/* Display the data point index */}
            <p className="text-xs text-slate-500 mb-2">{`Index: ${dataPointIndex}`}</p>
            <ul className="list-none p-0 m-0 space-y-1">
              <li style={{ color: '#ef4444' }}>
                {`Heart Rate: ${dataPoint.heart_rate != null ? dataPoint.heart_rate.toFixed(1) : 'N/A'} bpm`}
              </li>
              {dataPoint.anomaly != null && (
                <li style={{ color: dataPoint.anomaly === 1 ? '#dc2626' : '#6b7280', fontWeight: 'bold' }}>
                  {`Anomaly: ${dataPoint.anomaly}`}
                </li>
              )}
              {chartableParams.map(param => {
                  if (visibleParams.has(param.key) && param.key !== 'anomaly') {
                    const value = dataPoint[param.key];
                    return ( <li key={param.key} style={{ color: param.color }}>{`${param.label}: ${value != null ? value.toFixed(1) : 'N/A'}`}</li> );
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
        {hasUnsavedChanges && (
            <button onClick={onSaveChanges} disabled={isSaving} className="flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 disabled:bg-slate-400 disabled:cursor-not-allowed">
                <CheckCircleIcon className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
        )}
      </div>
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Add parameters to chart:</p>
        <div className="flex flex-wrap items-center gap-2">
          {chartableParams.map(param => (
            <button key={param.key} onClick={() => toggleParam(param.key)}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${visibleParams.has(param.key) ? 'text-white' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'}`}
              style={visibleParams.has(param.key) ? { backgroundColor: param.color } : {}}>
              {param.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ width: '100%', height: chartHeight }}>
        {!hasHeartRateData && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50/50 z-10">
            <p className="text-gray-500 font-medium">Heart Rate data is not available for this session.</p>
          </div>
        )}
        <ResponsiveContainer>
          <LineChart data={chartData} margin={chartMargin} onClick={handleChartClick}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="elapsed_time" tickFormatter={formatDuration} label={{ value: "Elapsed Time", position: "insideBottom", offset: -45 }} type="number" domain={xAxisDomain} allowDataOverflow />
            <YAxis yAxisId="left" stroke="#ef4444" label={{ value: 'Heart Rate (bpm)', angle: -90, position: 'insideLeft', offset: -5, style: {textAnchor: 'middle'} }} domain={hrDomain} allowDataOverflow />
            {visibleParams.size > 0 && <YAxis yAxisId="right" orientation="right" stroke="#0ea5e9" />}
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" wrapperStyle={{paddingBottom: '20px'}} />
            {hasHeartRateData && (
              <>
                <ReferenceLine yAxisId="left" y={session.avg_heart_rate} label={{ value: `Avg: ${session.avg_heart_rate}`, position: 'insideTopLeft' }} stroke="#fb923c" strokeDasharray="4 4" />
                <ReferenceLine yAxisId="left" y={session.max_heart_rate} label={{ value: `Max: ${session.max_heart_rate}`, position: 'insideTopLeft' }} stroke="#f87171" strokeDasharray="4 4" />
              </>
            )}
            <Line yAxisId="left" dataKey="hover_target" stroke="transparent" activeDot={{ r: 8, fill: 'transparent', stroke: 'transparent' }} dot={false} hide={true} legendType="none"/>
            <Line yAxisId="left" type="linear" dataKey="heart_rate" name="Heart Rate (bpm)" stroke="#ef4444" strokeWidth={2.5} dot={renderConditionalDot} connectNulls />
            {chartableParams.map(param => 
              visibleParams.has(param.key) && (
                <Line key={param.key} yAxisId="right" type="monotone" dataKey={param.key} name={`${param.label} (${param.unit})`} stroke={param.color} dot={false} connectNulls />
              )
            )}
            <Brush key={brushKey} dataKey="elapsed_time" height={30} stroke="#38bdf8" onChange={setActiveDomain} tickFormatter={formatDuration} startIndex={activeDomain?.startIndex} endIndex={activeDomain?.endIndex} alwaysShowText={true}>
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

const ChartControls = ({ activeDomain, onProgrammaticDomainChange, onResetZoom, chartData, chartHeight, setChartHeight }) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const totalDuration = chartData.length > 0 ? chartData[chartData.length - 1].elapsed_time : 0;

  useEffect(() => {
    if (activeDomain && chartData.length > 0) {
      const start = chartData[activeDomain.startIndex]?.elapsed_time;
      const end = chartData[activeDomain.endIndex]?.elapsed_time;
      setStartTime(formatDuration(start));
      setEndTime(formatDuration(end));
    } else {
      setStartTime('00:00');
      setEndTime(formatDuration(totalDuration));
    }
  }, [activeDomain, chartData, totalDuration]);

  const parseTimeToSeconds = (timeStr) => {
    const parts = timeStr.split(':').map(Number);
    if (parts.some(isNaN)) return null;
    let seconds = 0;
    if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
    else if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    else return null;
    return seconds;
  };

  const handleApplyTime = () => {
    const startSeconds = parseTimeToSeconds(startTime);
    const endSeconds = parseTimeToSeconds(endTime);
    if (startSeconds == null || endSeconds == null || startSeconds >= endSeconds) {
      alert("Invalid time format or range."); return;
    }
    const startIndex = chartData.findIndex(d => d.elapsed_time >= startSeconds);
    let endIndex = chartData.findIndex(d => d.elapsed_time >= endSeconds);
    if (endIndex === -1) endIndex = chartData.length - 1;
    if (startIndex > -1) onProgrammaticDomainChange({ startIndex, endIndex });
  };
  
  return (
    <div className="bg-gray-50 p-4 rounded-b-xl shadow-inner border-t space-y-4">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div className="flex items-end gap-2">
          <div>
            <label htmlFor="start-time" className="block text-xs font-medium text-gray-600">Start Time</label>
            <input type="text" id="start-time" value={startTime} onChange={e => setStartTime(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm" placeholder="MM:SS" />
          </div>
          <div>
            <label htmlFor="end-time" className="block text-xs font-medium text-gray-600">End Time</label>
            <input type="text" id="end-time" value={endTime} onChange={e => setEndTime(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm" placeholder="MM:SS" />
          </div>
          <button onClick={handleApplyTime} className="rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700">Apply</button>
          <button onClick={onResetZoom} className="p-2 rounded-md hover:bg-gray-200" title="Reset Zoom">
            <ArrowPathIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="flex items-end gap-4">
          <div className="flex-grow">
            <label htmlFor="chart-height" className="block text-xs font-medium text-gray-600 mb-1">Chart Height: {chartHeight}px</label>
            <div className="flex items-center gap-2">
              <ArrowsUpDownIcon className="w-5 h-5 text-gray-400" />
              <input id="chart-height" type="range" min="400" max="1200" step="20" value={chartHeight} onChange={(e) => setChartHeight(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function SessionChartPage() {
  const session = useLoaderData();
  const { sessionId } = useParams();
  const { authToken } = useAuth();

  const [interactiveData, setInteractiveData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [activeDomain, setActiveDomain] = useState(null);
  const [brushKey, setBrushKey] = useState(0);
  const [chartHeight, setChartHeight] = useState(600);
  
  const normalizedTimeseriesData = useMemo(() => {
    if (!session.timeseries_data) return [];
    return session.timeseries_data.map(row => {
        const newRow = {};
        for (const key in row) { newRow[key.toLowerCase()] = row[key]; }
        return newRow;
    });
  }, [session.timeseries_data]);
  
  useEffect(() => {
    const deepCopiedData = JSON.parse(JSON.stringify(normalizedTimeseriesData));
    setInteractiveData(deepCopiedData);
    setOriginalData(deepCopiedData);
    setHasUnsavedChanges(false);
  }, [normalizedTimeseriesData]);

  const chartData = useMemo(() => {
    if (!interactiveData || interactiveData.length === 0) return [];
    const startTime = new Date(interactiveData[0].timestamp).getTime();
    const heartRates = interactiveData.map(d => d.heart_rate).filter(hr => hr != null);
    const midPoint = heartRates.length > 0 ? (Math.min(...heartRates) + Math.max(...heartRates)) / 2 : 120;
    
    return interactiveData.map(d => ({
        ...d,
        elapsed_time: (new Date(d.timestamp).getTime() - startTime) / 1000,
        hover_target: midPoint,
    }));
  }, [interactiveData]);

  const handleAnomalyToggle = (index) => {
    if (index == null) return;

    // 1. Capture the current brush domain *before* the state update
    const currentDomain = activeDomain ? { ...activeDomain } : null;

    // 2. Update the anomaly data using an immutable pattern
    setInteractiveData(currentData => {
      const newData = [...currentData];
      if (newData[index]) {
        // Create a new object for the updated record to ensure immutability
        newData[index] = {
          ...newData[index],
          anomaly: newData[index].anomaly === 1 ? 0 : 1,
        };
      }
      return newData;
    });
    setHasUnsavedChanges(true);

    // 3. Restore the domain. This counteracts the brush's tendency to reset.
    // We also increment the brushKey to force it to re-render correctly.
    if (currentDomain) {
      setActiveDomain(currentDomain);
      setBrushKey(k => k + 1);
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    const updates = interactiveData.reduce((acc, current, index) => {
        if (originalData[index] && current.anomaly !== originalData[index].anomaly) {
            acc.push({ timestamp: current.timestamp, anomaly: current.anomaly });
        }
        return acc;
    }, []);

    if (updates.length === 0) {
      alert("No changes to save.");
      setIsSaving(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/${session.id}/update-anomalies/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${authToken}` },
        body: JSON.stringify({ updates }),
      });
      if (!response.ok) { throw new Error('Failed to save changes.'); }
      alert('Changes saved successfully!');
      setOriginalData(JSON.parse(JSON.stringify(interactiveData)));
      setHasUnsavedChanges(false);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProgrammaticDomainChange = (newDomain) => {
    setActiveDomain(newDomain);
    setBrushKey(k => k + 1);
  };

  const handleResetZoom = () => {
    if (chartData && chartData.length > 0) {
      setActiveDomain({
        startIndex: 0,
        endIndex: chartData.length - 1,
      });
    } else {
      setActiveDomain(null);
    }
    setBrushKey(k => k + 1);
  };

  return (
    <div className="p-4 sm:p-8 bg-slate-50 min-h-screen">
      <div className="mb-6 flex items-center gap-4">
        <Link to={`/sessions/${sessionId}`} className="p-2 rounded-full hover:bg-slate-200 transition-colors">
          <ArrowLeftIcon className="w-6 h-6 text-slate-700" />
        </Link>
        <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Chart Details</h1>
            <p className="text-sm text-slate-500">Session ID: {session.id}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-8 mt-8">
        {chartData.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg">
            <HeartRateChart
              session={session}
              timeseriesData={chartData}
              activeDomain={activeDomain}
              setActiveDomain={setActiveDomain}
              onAnomalyToggle={handleAnomalyToggle}
              brushKey={brushKey}
              chartHeight={chartHeight}
              hasUnsavedChanges={hasUnsavedChanges}
              isSaving={isSaving}
              onSaveChanges={handleSaveChanges}
            />
            <ChartControls
              activeDomain={activeDomain}
              onProgrammaticDomainChange={handleProgrammaticDomainChange}
              onResetZoom={handleResetZoom}
              chartData={chartData}
              chartHeight={chartHeight}
              setChartHeight={setChartHeight}
            />
          </div>
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
      </div>
    </div>
  );
}