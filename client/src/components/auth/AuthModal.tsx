import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login } = useAuth();
  
  const handleLogin = () => {
    login(); // This will redirect to Replit Auth
  };
  
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
    }}>
      <DialogContent className="sm:max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-400 mb-2">Welcome to RespondX</h2>
          <p className="text-gray-600 dark:text-gray-400">Login to manage your app reviews with AI</p>
        </div>
        
        <div className="space-y-4">
          <Button 
            className="w-full"
            onClick={handleLogin}
          >
            Sign in with Replit
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleClose}
          >
            Continue as Guest
          </Button>
          
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
