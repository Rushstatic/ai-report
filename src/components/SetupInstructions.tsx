import { isSupabaseConfigured } from '@/lib/supabase';

export default function SetupInstructions() {
  const urlStatus = import.meta.env.VITE_SUPABASE_URL ? "Provided" : "Missing";
  const keyStatus = import.meta.env.VITE_SUPABASE_ANON_KEY ? "Provided" : "Missing";

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="bg-white py-8 px-4 border border-slate-200 shadow-sm rounded-xl sm:px-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-800">
              Supabase Configuration Required
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please connect your Supabase project to continue using the District Health Reporting & Monitoring System.
            </p>
          </div>
          
          <div className="space-y-6 text-gray-700">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Step 1: Create a Supabase Project</h3>
              <p className="mt-1">Go to <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Supabase</a> and create a new project.</p>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900">Step 2: Apply Database Schema</h3>
              <p className="mt-1">Go to the SQL Editor in your Supabase dashboard and run the SQL schema provided in:</p>
              <code className="block mt-2 bg-gray-100 p-2 rounded text-sm">/supabase/migrations/00001_initial_schema.sql</code>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900">Step 3: Add Environment Variables</h3>
              <p className="mt-1">Copy the API keys from Project Settings &gt; API and add them to your environment variables via the AI Studio Secrets panel or your <code>.env</code> file:</p>
              <pre className="mt-2 bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                <code>
VITE_SUPABASE_URL="your-project-url"
VITE_SUPABASE_ANON_KEY="your-anon-key"
                </code>
              </pre>
            </div>
            
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500 font-mono mb-2">
                Build Status: URL is <strong>{urlStatus}</strong> | Key is <strong>{keyStatus}</strong>
              </p>
              <p className="text-sm text-gray-500">
                After adding the secrets, restart your development server or refresh the page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
