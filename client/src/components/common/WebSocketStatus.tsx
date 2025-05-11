import { useWebSocket } from "@/contexts/WebSocketContext";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WifiIcon, WifiOffIcon } from "lucide-react";

export function WebSocketStatus() {
  const { connected } = useWebSocket();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center">
          <Badge 
            variant={connected ? "outline" : "destructive"} 
            className={`flex items-center gap-1 px-2 py-1 ${connected ? 'border-green-500 text-green-500' : ''}`}
          >
            {connected ? (
              <>
                <WifiIcon size={14} />
                <span>Real-time</span>
              </>
            ) : (
              <>
                <WifiOffIcon size={14} />
                <span>Offline</span>
              </>
            )}
          </Badge>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {connected 
            ? "Connected to real-time updates" 
            : "Not connected to real-time updates. Trying to reconnect..."}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}