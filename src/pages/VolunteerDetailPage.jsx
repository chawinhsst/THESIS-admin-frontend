import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export default function VolunteerDetailPage() {
  const { volunteerId } = useParams(); // Gets the ID from the URL (e.g., /volunteers/1)
  const navigate = useNavigate();
  const { authToken } = useAuth();
  
  const [volunteer, setVolunteer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch the specific volunteer's data when the component loads
  useEffect(() => {
    const fetchVolunteer = async () => {
      if (!authToken) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/volunteers/${volunteerId}/`, {
          headers: { 'Authorization': `Token ${authToken}` },
        });
        if (!response.ok) throw new Error('Failed to fetch volunteer details.');
        const data = await response.json();
        setVolunteer(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVolunteer();
  }, [volunteerId, authToken]);

  const handleChange = (e) => {
    setVolunteer({ ...volunteer, [e.target.name]: e.target.value });
  };

  // Function to save any changes made to the form
  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/volunteers/${volunteerId}/`, {
        method: 'PATCH', // PATCH is used for partial updates
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${authToken}`,
        },
        body: JSON.stringify(volunteer),
      });
      if (!response.ok) throw new Error('Failed to save changes.');
      alert('Changes saved successfully!');
    } catch (err) {
      setError(err.message);
    }
  };

  // Function to use the special "approve" action
  const handleApprove = async () => {
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/volunteers/${volunteerId}/approve/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${authToken}` },
      });
      if (!response.ok) throw new Error('Failed to approve volunteer.');
      alert('Volunteer approved successfully!');
      navigate('/volunteers'); // Go back to the list after approving
    } catch (err) {
      setError(err.message);
    }
  };


  if (isLoading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!volunteer) return <div className="p-8">Volunteer not found.</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Edit Volunteer: {volunteer.first_name} {volunteer.last_name}
      </h1>
      <form onSubmit={handleSaveChanges} className="space-y-6 bg-white p-8 rounded-lg shadow">
        {/* Status Field */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
          <select
            id="status"
            name="status"
            value={volunteer.status}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
          >
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Other editable fields can go here, for example: */}
        <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
            <input 
                type="email" 
                name="email"
                id="email"
                value={volunteer.email}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
            />
        </div>
        {/* Add more input fields for other data as needed... */}

        <div className="flex justify-end space-x-4">
          <button type="button" onClick={handleApprove} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700">
            Approve This Volunteer
          </button>
          <button type="submit" className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}