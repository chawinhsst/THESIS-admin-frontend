import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiEdit, FiSave, FiX, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Field names for a user-friendly display in the summary
const FIELD_LABELS = {
  first_name: 'First Name',
  last_name: 'Last Name',
  email: 'Email Address',
  date_of_birth: 'Date of Birth',
  gender: 'Gender',
  platform: 'Primary Platform',
  smartwatch: 'Smartwatch Brand',
  run_frequency: 'Running Frequency',
  status: 'Volunteer Status',
};

// Hardcoded options for dropdowns
const genderOptions = ["Male", "Female"];
const platformOptions = [ "Adidas Running (Runtastic)", "Apple Health / Fitness", "Garmin Connect", "MapMyRun", "Nike Run Club", "Peloton", "Polar Flow", "Strava", "TrainingPeaks", "Wahoo", "Zwift", "Other"];
const brandOptions = ["Apple Watch", "COROS", "Fitbit", "Garmin", "Huawei", "Polar", "Samsung", "Suunto", "Whoop", "Other"];
const frequencyOptions = ["Every day", "5-6 times a week", "3-4 times a week", "1-2 times a week", "Less than once a week"];

// Reusable Components
const FormInput = ({ label, name, value, onChange, disabled, type = "text" }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
    <input type={type} id={name} name={name} value={value || ''} onChange={onChange} disabled={disabled} className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all disabled:bg-gray-200 disabled:cursor-not-allowed" />
  </div>
);

const FormSelect = ({ label, name, value, onChange, disabled, options }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
    <select id={name} name={name} value={value || ''} onChange={onChange} disabled={disabled} className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 transition-all disabled:bg-gray-200 disabled:cursor-not-allowed">
      {options.map(opt => <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>)}
    </select>
  </div>
);

// The Main Modal Component
export default function VolunteerDetailModal({ volunteer, onClose, onUpdate }) {
  const [formData, setFormData] = useState(volunteer);
  const [isEditMode, setIsEditMode] = useState(false);
  const { authToken } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const modalRef = useRef();

  // New state for the confirmation process
  const [isConfirming, setIsConfirming] = useState(false);
  const [changesToConfirm, setChangesToConfirm] = useState([]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target) && !isConfirming) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, isConfirming]);

  useEffect(() => {
    setFormData(volunteer);
    setIsEditMode(false);
    setIsConfirming(false); // Reset confirmation on new volunteer
  }, [volunteer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Step 1: Check for changes and open confirmation dialog
  const handleSubmitForConfirmation = (e) => {
    e.preventDefault();
    const detectedChanges = [];
    
    Object.keys(FIELD_LABELS).forEach(key => {
      if (formData[key] !== volunteer[key]) {
        detectedChanges.push({
          field: FIELD_LABELS[key],
          from: volunteer[key] || 'N/A',
          to: formData[key] || 'N/A'
        });
      }
    });

    if (detectedChanges.length > 0) {
      setChangesToConfirm(detectedChanges);
      setIsConfirming(true);
    } else {
      alert('No changes were made.');
    }
  };

  // Step 2: Execute the save after user confirmation
  const executeSave = async () => {
    setIsSaving(true);
    const dataToUpdate = { ...formData };

    try {
      const response = await fetch(`${API_BASE_URL}/api/volunteers/${formData.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${authToken}`,
        },
        body: JSON.stringify(dataToUpdate),
      });

      if (!response.ok) throw new Error('Failed to save changes. Please try again.');

      const updatedVolunteer = await response.json();
      onUpdate(updatedVolunteer);
      alert('Changes saved successfully!');
      onClose(); // This will close both the modal and the confirmation dialog

    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
      setIsConfirming(false);
    }
  };

  if (!volunteer) return null;

  const getStatusOptions = () => {
    const options = [{ value: 'approved', label: 'Approved' }, { value: 'pending', label: 'Pending' }, { value: 'rejected', label: 'Rejected' }];
    return options.sort((a, b) => a.value === formData.status ? -1 : 1);
  };
  
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4 transition-opacity duration-300 animate-fadeIn">
        <div ref={modalRef} className="relative w-full max-w-4xl bg-slate-50 rounded-2xl shadow-2xl flex flex-col transform transition-all duration-300 animate-scaleIn">
          <div className="flex items-center justify-between p-5 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">Volunteer Profile</h2>
            <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-800 transition-colors"><FiX size={24} /></button>
          </div>

          <form onSubmit={handleSubmitForConfirmation} className="flex-grow overflow-hidden flex flex-col">
            <div className="p-6 md:p-8 space-y-8 max-h-[70vh] overflow-y-auto">
              {/* Volunteer Status Section */}
              <div className="bg-white/70 p-5 rounded-xl shadow-inner-soft">
                <h3 className="text-base font-semibold text-gray-700 mb-3">Volunteer Status</h3>
                <select name="status" value={formData.status} onChange={handleChange} disabled={!isEditMode} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all disabled:bg-gray-200 disabled:cursor-not-allowed">
                  {getStatusOptions().map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              
              {/* Information Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-5">
                  <h3 className="text-base font-semibold text-gray-700 border-b pb-2">Personal Information</h3>
                  <FormInput label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} disabled={!isEditMode} />
                  <FormInput label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} disabled={!isEditMode} />
                  <FormInput label="Email Address" name="email" value={formData.email} onChange={handleChange} disabled={!isEditMode} type="email" />
                  <FormInput label="Date of Birth" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} disabled={!isEditMode} type="date" />
                  <FormSelect label="Gender" name="gender" value={formData.gender} onChange={handleChange} disabled={!isEditMode} options={genderOptions} />
                </div>
                <div className="space-y-5">
                  <h3 className="text-base font-semibold text-gray-700 border-b pb-2">Running Habits</h3>
                  <FormSelect label="Primary Platform" name="platform" value={formData.platform} onChange={handleChange} disabled={!isEditMode} options={platformOptions} />
                  <FormSelect label="Smartwatch Brand" name="smartwatch" value={formData.smartwatch} onChange={handleChange} disabled={!isEditMode} options={brandOptions} />
                  <FormSelect label="Running Frequency" name="run_frequency" value={formData.run_frequency} onChange={handleChange} disabled={!isEditMode} options={frequencyOptions} />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end items-center space-x-4 border-t border-gray-200 bg-white/50 p-5 rounded-b-2xl">
              {isEditMode ? (
                <>
                  <button type="button" onClick={() => setIsEditMode(false)} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg shadow-sm border border-gray-300 hover:bg-gray-100 transition-all">Cancel</button>
                  <button type="submit" disabled={isSaving} className="flex items-center justify-center px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-md hover:from-green-600 hover:to-emerald-700 transition-all disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-wait">
                    <FiSave className="mr-2" />
                    Save Changes
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setIsEditMode(true)} className="flex items-center justify-center px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg shadow-md hover:from-amber-600 hover:to-orange-700 transition-all">
                  <FiEdit className="mr-2" />
                  Edit Details
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {isConfirming && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-75 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg m-4 transform animate-scaleIn">
            <div className="p-6 text-center">
              <FiAlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
              <h3 className="mt-4 text-xl font-bold text-gray-900">Confirm Changes</h3>
              <p className="mt-2 text-sm text-gray-600">Please review the changes you have made before saving.</p>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 max-h-60 overflow-y-auto border-t border-b">
              <dl className="space-y-3">
                {changesToConfirm.map(change => (
                  <div key={change.field} className="text-sm">
                    <dt className="font-semibold text-gray-800">{change.field}</dt>
                    <dd className="flex items-center justify-between mt-1 text-gray-600">
                      <span className="line-through text-red-600 bg-red-100 px-2 py-0.5 rounded">{change.from}</span>
                      <span className="font-bold mx-2">→</span>
                      <span className="text-green-700 bg-green-100 px-2 py-0.5 rounded">{change.to}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="flex justify-end space-x-4 p-5 bg-gray-50 rounded-b-xl">
              <button onClick={() => setIsConfirming(false)} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg shadow-sm border border-gray-300 hover:bg-gray-100 transition-all">
                Cancel
              </button>
              <button onClick={executeSave} disabled={isSaving} className="flex items-center justify-center px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-md hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50">
                <FiCheckCircle className="mr-2"/>
                {isSaving ? 'Saving...' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}