import React from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, MessageCircle, AppWindow, LineChart, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Sidebar: React.FC = () => {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { 
      path: "/", 
      label: "Dashboard", 
      icon: <LayoutDashboard className="mr-3 flex-shrink-0 text-lg" /> 
    },
    { 
      path: "/reviews", 
      label: "Reviews", 
      icon: <MessageCircle className="mr-3 flex-shrink-0 text-lg" /> 
    },
    { 
      path: "/applications", 
      label: "Applications", 
      icon: <AppWindow className="mr-3 flex-shrink-0 text-lg" /> 
    },
    { 
      path: "/analytics", 
      label: "Analytics", 
      icon: <LineChart className="mr-3 flex-shrink-0 text-lg" /> 
    },
    { 
      path: "/settings", 
      label: "Settings", 
      icon: <Settings className="mr-3 flex-shrink-0 text-lg" /> 
    }
  ];

  return (
    <aside className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between h-16 flex-shrink-0 px-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 bg-primary text-white p-2 rounded-md">
              <i className="ri-chat-4-line text-xl"></i>
            </div>
            <span className="text-xl font-semibold text-gray-900 dark:text-white">RespondX</span>
          </div>
        </div>
        
        <div className="h-0 flex-1 flex flex-col overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                href={item.path}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  location === item.path 
                    ? "bg-primary-50 dark:bg-primary-900 text-primary-700 dark:text-primary-100" 
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
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
          
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div>
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">
                  <span className="text-sm font-medium">
                    {user?.name ? user.name.charAt(0) + (user.name.split(' ')[1]?.charAt(0) || '') : 'U'}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{user?.name || 'User'}</p>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{user?.email || 'user@example.com'}</p>
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
      </div>
    </aside>
  );
};

export default Sidebar;
