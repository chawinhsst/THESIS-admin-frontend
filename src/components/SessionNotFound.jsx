import { Link } from 'react-router-dom';

export default function SessionNotFound() {
  return (
    <div className="text-center p-12">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">
        Oops! Session Not Found
      </h1>
      <p className="text-slate-600 mb-6">
        We couldn't find the session you were looking for. It may have been deleted, or the link is incorrect.
      </p>
      <Link 
        to="/dashboard" // Link to a safe, existing page like the dashboard
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}