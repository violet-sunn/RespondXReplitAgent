import React from "react";
import { Link, useLocation } from "wouter";
import { XIcon, LayoutDashboard, MessageCircle, AppWindow, LineChart, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { 
      path: "/", 
      label: "Dashboard", 
      icon: <LayoutDashboard className="mr-4 flex-shrink-0 text-lg" /> 
    },
    { 
      path: "/reviews", 
      label: "Reviews", 
      icon: <MessageCircle className="mr-4 flex-shrink-0 text-lg" /> 
    },
    { 
      path: "/applications", 
      label: "Applications", 
      icon: <AppWindow className="mr-4 flex-shrink-0 text-lg" /> 
    },
    { 
      path: "/analytics", 
      label: "Analytics", 
      icon: <LineChart className="mr-4 flex-shrink-0 text-lg" /> 
    },
    { 
      path: "/settings", 
      label: "Settings", 
      icon: <Settings className="mr-4 flex-shrink-0 text-lg" /> 
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <div className="absolute inset-0 bg-gray-600 bg-opacity-75" onClick={onClose}></div>
      
      <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-gray-800">
        <div className="absolute top-0 right-0 -mr-12 pt-2">
          <button 
            type="button" 
            className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            onClick={onClose}
          >
            <span className="sr-only">Close sidebar</span>
            <XIcon className="h-6 w-6 text-white" />
          </button>
        </div>
        
        <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
          <div className="flex-shrink-0 flex items-center px-4">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 bg-primary text-white p-2 rounded-md">
                <i className="ri-chat-4-line text-xl"></i>
              </div>
              <span className="text-xl font-semibold text-gray-900 dark:text-white">RespondX</span>
            </div>
          </div>
          <nav className="mt-5 px-2 space-y-1">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                href={item.path}
                className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                  location === item.path 
                    ? "bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-100" 
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
                onClick={onClose}
              >
                {React.cloneElement(item.icon, { 
                  className: `${item.icon.props.className} ${
                    location === item.path 
                      ? "text-primary-600 dark:text-primary-300" 
                      : "text-gray-500 dark:text-gray-400"
                  }`
                })}
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <div>
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white">
                <span className="text-sm font-medium">
                  {user?.name ? user.name.charAt(0) + (user.name.split(' ')[1]?.charAt(0) || '') : 'U'}
                </span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-base font-medium text-gray-700 dark:text-gray-200">{user?.name || 'User'}</p>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{user?.email || 'user@example.com'}</p>
            </div>
            <button 
              type="button" 
              className="ml-auto flex-shrink-0 bg-white dark:bg-gray-700 p-1 rounded-full text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              onClick={() => logout()}
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-shrink-0 w-14"></div>
    </div>
  );
};

export default MobileNav;
