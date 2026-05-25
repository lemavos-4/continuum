import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    // Alterado para bg-black e texto branco
    <div className="flex min-h-screen items-center justify-center bg-black text-white p-4">
      <div className="text-center">
        {/* h1 com fonte serifada para combinar com o "Your second brain" */}
        <h1 className="mb-4 text-7xl font-medium font-serif italic">404</h1>
        
        <p className="mb-8 text-xl text-zinc-400 max-w-md mx-auto">
          The page you are looking for has drifted into the void.
        </p>

        <a 
          href="/" 
          className="inline-block bg-white text-black px-6 py-2 rounded-md font-medium transition-hover hover:bg-zinc-200"
        >
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;