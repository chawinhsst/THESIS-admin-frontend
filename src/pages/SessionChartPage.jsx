import { useLoaderData, useParams, Link } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush, ReferenceLine, Dot } from 'recharts';
import {
    ArrowLeftIcon,
    ChartBarIcon,
    ArrowPathIcon,
    ArrowsUpDownIcon,
    CheckCircleIcon,
    ScissorsIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    XCircleIcon,
    ExclamationCircleIcon,
    SparklesIcon,
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

// --- DESIGN-ENHANCED COMPONENTS ---

const chartableParams = [
  { key: 'speed', label: 'Speed', unit: 'm/s', color: '#3b82f6' },
  { key: 'cadence', label: 'Cadence', unit: 'rpm', color: '#f97316' },
  { key: 'power', label: 'Power', unit: 'watts', color: '#8b5cf6' },
  { key: 'altitude', label: 'Altitude', unit: 'm', color: '#16a34a' },
  { key: 'distance', label: 'Distance', unit: 'm', color: '#14b8a6' },
  { key: 'gps_accuracy', label: 'GPS Accuracy', unit: 'm', color: '#eab308' },
  { key: 'position_lat', label: 'Latitude', unit: 'deg', color: '#0ea5e9' },
  { key: 'position_long', label: 'Longitude', unit: 'deg', color: '#d946ef' },
  { key: 'enhanced_speed', label: 'Enhanced Speed', unit: 'm/s', color: '#6366f1' },
  { key: 'enhanced_altitude', label: 'Enhanced Altitude', unit: 'm', color: '#10b981' },
];

const AnomalyDot = (props) => {
    const { cx, cy, payload, dynamicRadius } = props;
    if (dynamicRadius === 0 || payload.heart_rate == null) return null;

    if (payload.anomaly === 1) { // Anomaly
        return <Dot cx={cx} cy={cy} r={dynamicRadius + 1} fill="#ef4444" stroke="#b91c1c" strokeWidth={1} />;
    }
    // Normal
    return <Dot cx={cx} cy={cy} r={dynamicRadius} fill="#22c55e" />;
};

const AnomalyTimeline = ({ data, onSegmentClick }) => {
    const totalPoints = data.length;
    if (totalPoints === 0) return null;

    const anomalySegments = useMemo(() => {
        const segments = [];
        if (data.length === 0) return segments;

        let inSegment = false;
        for (let i = 0; i < data.length; i++) {
            if (data[i].anomaly === 1 && !inSegment) {
                inSegment = true;
                segments.push({ start: i, end: i });
            } else if (data[i].anomaly === 1 && inSegment) {
                segments[segments.length - 1].end = i;
            } else if (data[i].anomaly !== 1 && inSegment) {
                inSegment = false;
            }
        }
        return segments;
    }, [data]);

    return (
        <div className="relative w-full h-4 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
            {anomalySegments.map((segment, index) => {
                const left = (segment.start / totalPoints) * 100;
                const width = ((segment.end - segment.start + 1) / totalPoints) * 100;
                return (
                    <div
                        key={index}
                        className="absolute h-full bg-red-500 cursor-pointer hover:bg-red-400 transition-colors"
                        style={{ left: `${left}%`, width: `${width}%` }}
                        onClick={() => onSegmentClick(segment)}
                        title={`Zoom to anomalies from ${formatDuration(data[segment.start].elapsed_time)} to ${formatDuration(data[segment.end].elapsed_time)}`}
                    />
                );
            })}
        </div>
    );
};


const HeartRateChart = ({ session, timeseriesData: chartData, onAnomalyToggle, onTimelineZoom, activeDomain, onDomainChange, brushKey, chartHeight, hasUnsavedChanges, isSaving, onSaveChanges, hrDomain, hasHeartRateData }) => {
  const [visibleParams, setVisibleParams] = useState(new Set());  
  const chartMargin = { top: 20, right: 40, left: 20, bottom: 60 };

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
    if (!activeDomain || !chartData.length) {
      return chartData.length;
    }
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

  const renderDynamicDot = (props) => {
    const { key, ...rest } = props;
    return <AnomalyDot key={key} {...rest} dynamicRadius={dynamicRadius} />;
  };

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

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const dataPoint = payload[0].payload;
        return (
          <div className="p-4 bg-white/80 backdrop-blur-md border border-slate-300 rounded-lg shadow-xl text-sm">
            <p className="font-bold mb-2 text-slate-900">{`Time: ${formatDuration(label)}`}</p>
            <ul className="list-none p-0 m-0 space-y-1.5">
              <li className="flex items-center justify-between font-semibold" style={{ color: '#dc2626' }}>
                <span>Heart Rate:</span>
                <span>{`${dataPoint.heart_rate != null ? dataPoint.heart_rate.toFixed(0) : 'N/A'} bpm`}</span>
              </li>
              {dataPoint.anomaly != null && (
                <li className={`flex items-center justify-between font-bold ${dataPoint.anomaly === 1 ? 'text-red-600' : 'text-green-600'}`}>
                  <span>Status:</span>
                  <span>{dataPoint.anomaly === 1 ? 'Anomaly' : 'Normal'}</span>
                </li>
              )}
              <hr className="my-1 border-slate-200" />
              {chartableParams.map(param => {
                  if (visibleParams.has(param.key)) {
                    return (
                        <li key={param.key} className="flex items-center justify-between" style={{ color: param.color }}>
                            <span>{param.label}:</span>
                            <span className="font-medium">
                              {dataPoint[param.key] != null ? dataPoint[param.key].toFixed(1) : 'N/A'}
                            </span>
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
                <button key={param.key} onClick={() => toggleParam(param.key)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 border ${visibleParams.has(param.key) ? 'text-white border-transparent' : 'text-slate-700 bg-white border-slate-300 hover:bg-slate-50 hover:border-slate-400'}`}
                    style={visibleParams.has(param.key) ? { backgroundColor: param.color } : {}}>
                {param.label}
                </button>
            ))}
            </div>
        </div>

        <div className="mb-4">
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Anomaly Overview</p>
            <AnomalyTimeline data={chartData} onSegmentClick={onTimelineZoom} />
        </div>

        <div style={{ width: '100%', height: chartHeight }} className="relative">
            {!hasHeartRateData && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50/70 z-10 rounded-md">
                    <p className="text-slate-500 font-medium text-lg">Heart Rate data not available.</p>
                </div>
            )}
            <ResponsiveContainer key={brushKey}>
                <LineChart data={chartData} margin={chartMargin} onClick={handleChartClick}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
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
                    {chartableParams.map(param => 
                        visibleParams.has(param.key) && (
                            <Line key={param.key} yAxisId="right" type="monotone" dataKey={param.key} name={param.label} stroke={param.color} dot={false} strokeWidth={1.5} connectNulls />
                        )
                    )}
                    <Line yAxisId="left" type="monotone" dataKey="heart_rate" name="Heart Rate" stroke="#dc2626" strokeWidth={2.5} dot={renderDynamicDot} activeDot={{ r: 8, strokeWidth: 2, stroke: '#b91c1c' }} connectNulls zIndex={100} />
                    <Brush dataKey="elapsed_time" height={35} stroke="#6366f1" onChange={onDomainChange} tickFormatter={formatDuration} startIndex={activeDomain?.startIndex} endIndex={activeDomain?.endIndex} alwaysShowText={true} y={chartHeight - 45}>
                        <LineChart>
                            <Line type="monotone" dataKey="heart_rate" stroke="#dc2626" dot={false} connectNulls />
                        </LineChart>
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
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Start Time</label>
                            <TimeInput totalSeconds={startSeconds} onChange={setStartSeconds} maxSeconds={totalDuration}/>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">End Time</label>
                             <TimeInput totalSeconds={endSeconds} onChange={setEndSeconds} maxSeconds={totalDuration}/>
                        </div>
                        <button onClick={handleApplyTime} className="h-11 rounded-md bg-indigo-600 px-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Apply</button>
                        <button onClick={onResetZoom} className="h-11 w-11 flex items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50" title="Reset Zoom">
                            <ArrowPathIcon className="w-5 h-5" />
                        </button>
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
                        <div className="flex-1">
                            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Split Method</label>
                            <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-lg">
                                <button onClick={() => setSplitType('count')} className={`flex-1 px-3 py-1 rounded-md text-sm font-semibold transition-colors ${splitType === 'count' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}>By # Segments</button>
                                <button onClick={() => setSplitType('time')} className={`flex-1 px-3 py-1 rounded-md text-sm font-semibold transition-colors ${splitType === 'time' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}>By Duration</button>
                                <button onClick={() => setSplitType('points')} className={`flex-1 px-3 py-1 rounded-md text-sm font-semibold transition-colors ${splitType === 'points' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}>By # Points</button>
                            </div>
                        </div>
                        <div className="flex-1 w-full sm:w-auto">
                           <label htmlFor="split-value" className="text-xs font-medium text-slate-500 mb-1.5 block">Value</label>
                            <input type="number" id="split-value" value={splitValue} onChange={e => setSplitValue(e.target.value)} className="h-10 w-full rounded-md border-slate-300 shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500" 
                                placeholder={
                                    splitType === 'count' ? 'e.g., 4 segs' : 
                                    splitType === 'time' ? 'e.g., 300 sec' : 
                                    'e.g., 150 HR points'
                                } 
                                min="1" />
                        </div>
                        <button onClick={handleApplySplitClick} className="h-10 w-full sm:w-auto rounded-md bg-slate-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700">Apply Split</button>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center gap-4">
                        <p className="text-sm font-medium text-slate-700">
                            Segment <span className="font-bold text-slate-900">{currentSegmentIndex + 1}</span> of <span className="font-bold text-slate-900">{splitSegments.length}</span>
                        </p>
                        <div className="flex items-center">
                            <button onClick={onPreviousSegment} disabled={currentSegmentIndex === 0} className="p-2 rounded-l-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                <ChevronLeftIcon className="w-5 h-5" />
                            </button>
                            <button onClick={onNextSegment} disabled={currentSegmentIndex >= splitSegments.length - 1} className="p-2 rounded-r-md border-y border-r border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed">
                                <ChevronRightIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <button onClick={onClearSplit} className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">
                            <XCircleIcon className="w-4 h-4" />
                            Clear Split
                        </button>
                    </div>
                )}
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
    const [saveStatus, setSaveStatus] = useState({ state: 'idle', message: '' });

    const [activeDomain, setActiveDomain] = useState(null);
    const [brushKey, setBrushKey] = useState(0);
    const [chartHeight, setChartHeight] = useState(600);
    const [splitSegments, setSplitSegments] = useState([]);
    const [currentSegmentIndex, setCurrentSegmentIndex] = useState(null);

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

    const handleAnomalyToggle = (index) => {
        if (index == null) return;
        const newData = [...interactiveData];
        const record = newData.find(d => d.originalIndex === index);
        if (record) {
            record.anomaly = record.anomaly === 1 ? 0 : 1;
            setInteractiveData(newData);
            setHasUnsavedChanges(true);
        }
    };

    const handleSaveChanges = async () => {
        setIsSaving(true);
        setSaveStatus({ state: 'idle', message: '' });
        const updates = interactiveData.reduce((acc, current, index) => {
            if (originalData[index] && current.anomaly !== originalData[index].anomaly) {
                acc.push({ timestamp: current.timestamp, anomaly: current.anomaly });
            }
            return acc;
        }, []);

        if (updates.length === 0) {
            setSaveStatus({ state: 'error', message: "No changes detected to save." });
            setIsSaving(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/sessions/${session.id}/update-anomalies/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${authToken}` },
                body: JSON.stringify({ updates }),
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

    const handleDomainChange = (newDomain) => {
        if (newDomain && newDomain.startIndex != null) {
            setActiveDomain(newDomain);
            setBrushKey(k => k + 1);
        }
    };

    const handleProgrammaticDomainChange = (newDomain, fromSplit = false) => {
        if (!fromSplit) {
            setSplitSegments([]);
            setCurrentSegmentIndex(null);
        }
        handleDomainChange(newDomain);
    };

    const handleTimelineZoom = (segment) => {
        if (!segment || !chartData || chartData.length === 0) return;

        const windowSize = 10;
        const hrPoints = chartData
            .map((point, index) => ({ ...point, originalArrayIndex: index }))
            .filter(point => point.heart_rate != null);
        
        if (hrPoints.length === 0) return;

        const middleOriginalIndex = Math.floor((segment.start + segment.end) / 2);
        let middleHrIndex = hrPoints.findIndex(p => p.originalArrayIndex >= middleOriginalIndex);
        
        if (middleHrIndex === -1) {
            middleHrIndex = hrPoints.length - 1;
        }

        let hrStartIndex = middleHrIndex - Math.floor(windowSize / 2);
        let hrEndIndex = hrStartIndex + windowSize - 1;

        const hrPointsLength = hrPoints.length;
        if (hrEndIndex >= hrPointsLength) {
            hrEndIndex = hrPointsLength - 1;
            hrStartIndex = Math.max(0, hrEndIndex - windowSize + 1);
        }
        if (hrStartIndex < 0) {
            hrStartIndex = 0;
            hrEndIndex = Math.min(windowSize - 1, hrPointsLength - 1);
        }

        const finalStartIndex = hrPoints[hrStartIndex].originalArrayIndex;
        const finalEndIndex = hrPoints[hrEndIndex].originalArrayIndex;

        handleProgrammaticDomainChange({
            startIndex: finalStartIndex,
            endIndex: finalEndIndex,
        });
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
                if (startIndex < totalPoints) {
                    segments.push({ startIndex, endIndex });
                }
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
            const hrPoints = chartData
                .map((point, index) => ({ ...point, originalArrayIndex: index }))
                .filter(point => point.heart_rate != null);

            if (hrPoints.length === 0) {
                alert("No heart rate data found to create splits.");
                return;
            }
            for (let i = 0; i < hrPoints.length; i += pointsPerSegment) {
                const chunk = hrPoints.slice(i, i + pointsPerSegment);
                
                if (chunk.length > 0) {
                    const startIndex = chunk[0].originalArrayIndex;
                    const endIndex = chunk[chunk.length - 1].originalArrayIndex;
                    segments.push({ startIndex, endIndex });
                }
            }
        }

        if (segments.length > 0) {
            setSplitSegments(segments);
            setCurrentSegmentIndex(0);
            handleProgrammaticDomainChange(segments[0], true);
        }
    };

    const navigateSegment = (direction) => {
        if (currentSegmentIndex === null || !splitSegments.length) return;
        const newIndex = currentSegmentIndex + direction;
        if (newIndex >= 0 && newIndex < splitSegments.length) {
            setCurrentSegmentIndex(newIndex);
            handleProgrammaticDomainChange(splitSegments[newIndex], true);
        }
    };

    const handleNextSegment = () => navigateSegment(1);
    const handlePreviousSegment = () => navigateSegment(-1);

    const handleClearSplit = () => {
        setSplitSegments([]);
        setCurrentSegmentIndex(null);
        if (chartData && chartData.length > 0) {
            handleDomainChange({ startIndex: 0, endIndex: chartData.length - 1 });
        } else {
            setActiveDomain(null);
        }
    };

    return (
        <div className="p-4 sm:p-8 bg-slate-100 min-h-screen font-sans">
            <div className={`fixed top-5 right-5 transition-all duration-300 z-50 ${saveStatus.state !== 'idle' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5 pointer-events-none'}`}>
                {saveStatus.state === 'success' && (
                    <div className="flex items-center gap-3 p-3 rounded-lg shadow-lg bg-green-500 text-white">
                        <CheckCircleIcon className="w-6 h-6" />
                        <span className="text-sm font-semibold">{saveStatus.message}</span>
                    </div>
                )}
                {saveStatus.state === 'error' && (
                    <div className="flex items-center gap-3 p-3 rounded-lg shadow-lg bg-red-500 text-white">
                        <XCircleIcon className="w-6 h-6" />
                        <span className="text-sm font-semibold">{saveStatus.message}</span>
                    </div>
                )}
            </div>
            
            {/* ✅ THIS IS THE MODIFIED CONTAINER */}
            <div className="">
                <div className="mb-8 flex items-center gap-4">
                    <Link to={`/sessions/${sessionId}`} className="p-2 rounded-full hover:bg-slate-200 transition-colors">
                        <ArrowLeftIcon className="w-6 h-6 text-slate-600" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Chart Details</h1>
                        <p className="text-sm text-slate-500 mt-1">Session ID: {session.id}</p>
                    </div>
                </div>
            
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                    {chartData.length > 0 ? (
                        <>
                            <HeartRateChart
                                session={session}
                                timeseriesData={chartData}
                                activeDomain={activeDomain}
                                onDomainChange={handleDomainChange}
                                onAnomalyToggle={handleAnomalyToggle}
                                onTimelineZoom={handleTimelineZoom}
                                brushKey={brushKey}
                                chartHeight={chartHeight}
                                hasUnsavedChanges={hasUnsavedChanges}
                                isSaving={isSaving}
                                onSaveChanges={handleSaveChanges}
                                hrDomain={hrDomain}
                                hasHeartRateData={hasHeartRateData}
                            />
                            <ChartControls
                                activeDomain={activeDomain}
                                onProgrammaticDomainChange={handleProgrammaticDomainChange}
                                onResetZoom={handleResetZoom}
                                chartData={chartData}
                                chartHeight={chartHeight}
                                setChartHeight={setChartHeight}
                                onApplySplit={handleApplySplit}
                                onClearSplit={handleClearSplit}
                                onNextSegment={handleNextSegment}
                                onPreviousSegment={handlePreviousSegment}
                                splitSegments={splitSegments}
                                currentSegmentIndex={currentSegmentIndex}
                            />
                        </>
                    ) : (
                        <div className="p-12 text-center">
                            <SparklesIcon className="mx-auto h-12 w-12 text-slate-400" />
                            <h3 className="mt-2 text-lg font-medium text-slate-800">No Chart Data</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                No time-series data was found for this session.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}