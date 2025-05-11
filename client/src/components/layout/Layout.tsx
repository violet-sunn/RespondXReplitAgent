import React, { useState } from "react";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/auth/AuthModal";
import { Search, Bell } from "lucide-react";
import ThemeToggle from "@/components/ui/theme-toggle";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // If not authenticated, show auth modal
  React.useEffect(() => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
    } else {
      setShowAuthModal(false);
    }
  }, [isAuthenticated]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar for desktop */}
      <Sidebar />

      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 bg-primary text-white p-1 rounded-md">
            <i className="ri-chat-4-line text-lg"></i>
          </div>
          <span className="text-lg font-semibold text-gray-900 dark:text-white">RespondX</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            className="text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={() => setMobileMenuOpen(true)}
          >
            <i className="ri-menu-line text-2xl"></i>
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 w-0 overflow-hidden">
        {/* Top Navigation */}
        <div className="relative z-10 flex-shrink-0 flex h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 md:border-0">
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex items-center">
              <button 
                type="button" 
                className="md:hidden px-4 border-r border-gray-200 dark:border-gray-700 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <i className="ri-menu-2-line text-xl"></i>
              </button>
              <div className="max-w-2xl w-full">
                <div className="relative w-full text-gray-400 focus-within:text-gray-600 dark:focus-within:text-gray-300">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5" />
                  </div>
                  <input 
                    id="search" 
                    className="block w-full h-full pl-10 pr-3 py-2 border-transparent bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-0 focus:placeholder-gray-400 focus:bg-white dark:focus:bg-gray-600 sm:text-sm rounded-md" 
                    placeholder="Search for reviews, apps, or keywords" 
                    type="search" 
                  />
                </div>
              </div>
            </div>
            
            <div className="ml-4 flex items-center md:ml-6 space-x-4">
              <ThemeToggle />
              
              <button 
                type="button" 
                className="p-1 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <Bell className="h-6 w-6" />
              </button>
              
              <div className="relative">
                <button 
                  type="button" 
                  className="max-w-xs bg-white dark:bg-gray-800 flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">
                    <span className="text-sm font-medium">
                      {user?.name ? user.name.charAt(0) + (user.name.split(' ')[1]?.charAt(0) || '') : 'U'}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Auth Modal */}
      {showAuthModal && <AuthModal isOpen={showAuthModal} />}
    </div>
  );
};

export default Layout;
