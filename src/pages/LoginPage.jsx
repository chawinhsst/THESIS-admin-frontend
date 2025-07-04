import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiLock, FiLogIn, FiActivity } from 'react-icons/fi'; // Import FiActivity

// A reusable input component with an icon
const Input = ({ icon: Icon, ...props }) => (
  <div className="relative">
    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
      <Icon className="h-5 w-5 text-slate-400" />
    </div>
    <input
      {...props}
      className="block w-full rounded-lg border border-slate-300 bg-slate-50 p-2.5 pl-10 text-sm text-slate-900 placeholder-slate-500 transition-colors duration-200 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
    />
  </div>
);

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const loginError = await login(username, password);
      if (loginError) {
        setError(loginError);
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* Branding Panel */}
      <div className="relative hidden flex-1 items-center justify-center bg-gradient-to-br from-slate-900 to-sky-800 p-8 text-white lg:flex animate-fadeIn">
        <div className="relative z-10 text-center">
           <div className="mb-4 inline-block rounded-full bg-sky-500/20 p-6">
              {/* --- ICON HAS BEEN CHANGED HERE --- */}
              <FiActivity className="h-16 w-16 text-white" />
           </div>
          <h1 className="text-4xl font-bold tracking-tight">HR Anomaly</h1>
          <p className="mt-2 text-lg text-sky-200">Admin Control Panel</p>
        </div>
        <div className="absolute inset-0 z-0 h-full w-full bg-[radial-gradient(#ffffff22_1px,transparent_1px)] [background-size:16px_16px]"></div>
      </div>

      {/* Login Form Panel */}
      <div className="flex flex-1 animate-fadeIn items-center justify-center bg-slate-50 p-6 lg:p-8">
        <div className="w-full max-w-sm">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Admin Login
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Please enter your credentials to continue.
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <Input
                icon={FiUser}
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <Input
                icon={FiLock}
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-rose-100 p-3 text-center">
                <p className="text-sm font-medium text-rose-700">{error}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:from-sky-700 hover:to-cyan-600 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <FiLogIn className={`mr-2 h-5 w-5 transition-all ${isLoading ? 'animate-ping' : ''}`} />
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}