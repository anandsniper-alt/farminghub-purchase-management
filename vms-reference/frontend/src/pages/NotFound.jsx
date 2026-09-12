import { Link } from 'react-router-dom';
import { Sprout } from 'lucide-react';
 
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-50 p-6 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white">
        <Sprout size={26} />
      </div>
      <h1 className="text-5xl font-extrabold text-ink-900">404</h1>
      <p className="text-ink-500">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary">Back to dashboard</Link>
    </div>
  );
}
