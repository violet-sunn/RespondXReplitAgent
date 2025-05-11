import React, { useState } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WebSocketStatus } from "@/components/common/WebSocketStatus";
import { Badge } from "@/components/ui/badge";
import { WifiIcon, WifiOffIcon, SendIcon, RefreshCwIcon } from "lucide-react";

interface MessageLogItem {
  id: string;
  type: "sent" | "received";
  message: string;
  timestamp: Date;
}

const WebSocketDemo: React.FC = () => {
  const { sendMessage, lastMessage, connected, readyState } = useWebSocket();
  const [messageText, setMessageText] = useState("");
  const [messageLog, setMessageLog] = useState<MessageLogItem[]>([]);

  // Handle sending messages
  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    
    // Create message object
    const messageObj = {
      type: "message",
      text: messageText,
      timestamp: new Date().toISOString()
    };
    
    // Send via WebSocket
    sendMessage(messageObj);
    
    // Add to message log
    setMessageLog(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "sent",
        message: JSON.stringify(messageObj, null, 2),
        timestamp: new Date()
      }
    ]);
    
    // Clear input
    setMessageText("");
  };
  
  // Update message log when receiving messages
  React.useEffect(() => {
    if (lastMessage) {
      setMessageLog(prev => [
        ...prev, 
        {
          id: crypto.randomUUID(),
          type: "received",
          message: JSON.stringify(lastMessage, null, 2),
          timestamp: new Date()
        }
      ]);
    }
  }, [lastMessage]);
  
  // Simulate a review notification
  const simulateNewReview = () => {
    const platforms = ["app_store", "google_play"];
    const appNames = ["FitTrack Pro", "MealMaster", "ZenMind Meditation", "PhotoPro Editor"];
    const authorNames = ["John D.", "Sarah M.", "Michael R.", "Emma T.", "David S."];
    
    const mockReview = {
      type: "new_review",
      id: Math.floor(Math.random() * 10000),
      appId: Math.floor(Math.random() * 4) + 1,
      appName: appNames[Math.floor(Math.random() * appNames.length)],
      platform: platforms[Math.floor(Math.random() * platforms.length)],
      rating: Math.floor(Math.random() * 5) + 1,
      authorName: authorNames[Math.floor(Math.random() * authorNames.length)],
      text: "This is a simulated review message for testing real-time notifications."
    };
    
    sendMessage(mockReview);
    
    setMessageLog(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: "sent",
        message: JSON.stringify(mockReview, null, 2),
        timestamp: new Date()
      }
    ]);
  };
  
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">WebSocket Demo</h1>
          <WebSocketStatus />
        </div>
        
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Connection Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Connection Status</CardTitle>
              <CardDescription>Current WebSocket connection state</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-full">
                    {connected ? (
                      <WifiIcon className="h-6 w-6 text-green-500" />
                    ) : (
                      <WifiOffIcon className="h-6 w-6 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-xl font-bold">
                      {connected ? "Connected" : "Disconnected"}
                    </p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">Ready State</p>
                  <Badge variant={connected ? "outline" : "secondary"} className="text-sm">
                    {readyState === 0 && "Connecting"}
                    {readyState === 1 && "Open"}
                    {readyState === 2 && "Closing"}
                    {readyState === 3 && "Closed"}
                  </Badge>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline"
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                <RefreshCwIcon className="h-4 w-4" />
                Refresh Connection
              </Button>
              
              <Button
                onClick={simulateNewReview}
                disabled={!connected}
                className="gap-2"
              >
                <SendIcon className="h-4 w-4" />
                Simulate Review
              </Button>
            </CardFooter>
          </Card>
          
          {/* Message Sender Card */}
          <Card>
            <CardHeader>
              <CardTitle>Send Message</CardTitle>
              <CardDescription>Send a message through the WebSocket</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Input
                    id="message"
                    placeholder="Type your message here..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    disabled={!connected}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSendMessage} 
                disabled={!connected || !messageText.trim()}
                className="w-full gap-2"
              >
                <SendIcon className="h-4 w-4" />
                Send Message
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Message Log */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Message Log</CardTitle>
            <CardDescription>History of sent and received WebSocket messages</CardDescription>
          </CardHeader>
          <CardContent>
            {messageLog.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <p>No messages yet. Send a message to see it in the log.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto p-2">
                {messageLog.map((item) => (
                  <div 
                    key={item.id}
                    className={`p-3 rounded-lg ${
                      item.type === "sent" 
                        ? "bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800" 
                        : "bg-secondary-50 dark:bg-secondary-900/20 border border-secondary-100 dark:border-secondary-800"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <Badge variant={item.type === "sent" ? "outline" : "secondary"}>
                        {item.type === "sent" ? "Sent" : "Received"}
                      </Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {item.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words">
                      {item.message}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              variant="outline"
              onClick={() => setMessageLog([])}
              disabled={messageLog.length === 0}
              className="w-full"
            >
              Clear Log
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default WebSocketDemo;