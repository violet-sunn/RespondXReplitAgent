import React, { useState } from "react";
import { Star, StarHalf, RefreshCw, Edit2, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ReviewAuthor {
  name: string;
  initials: string;
}

interface ReviewResponse {
  id?: number;
  text: string;
  status: "draft" | "approved" | "published";
  generatingTime?: number; // in seconds, if still generating
}

export interface Review {
  id: number;
  author: ReviewAuthor;
  appName: string;
  appId: number;
  rating: number;
  text: string;
  platform: "app_store" | "google_play";
  createdAt: string;
  response?: ReviewResponse;
}

interface ReviewItemProps {
  review: Review;
  onRegenerateResponse?: (reviewId: number) => void;
  onEditResponse?: (reviewId: number, responseText: string) => void;
  onPublishResponse?: (reviewId: number) => void;
}

const ReviewItem: React.FC<ReviewItemProps> = ({
  review,
  onRegenerateResponse,
  onEditResponse,
  onPublishResponse,
}) => {
  const [editedResponse, setEditedResponse] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  
  const handleEditClick = () => {
    setEditedResponse(review.response?.text || "");
    setIsEditing(true);
  };
  
  const handleSaveEdit = () => {
    if (onEditResponse && review.id) {
      onEditResponse(review.id, editedResponse);
    }
    setIsEditing(false);
  };
  
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating - fullStars >= 0.5;
    const stars = [];
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={`full-${i}`} className="h-4 w-4 fill-amber-500 text-amber-500" />);
    }
    
    if (halfStar) {
      stars.push(<StarHalf key="half" className="h-4 w-4 fill-amber-500 text-amber-500" />);
    }
    
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300 dark:text-gray-600" />);
    }
    
    return stars;
  };
  
  // Calculate time ago
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const reviewDate = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - reviewDate.getTime()) / (1000 * 60));
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
  };
  
  const isGeneratingResponse = review.response?.generatingTime !== undefined;

  return (
    <div className="px-6 py-4 relative">
      <div className="flex items-start space-x-4">
        {/* User avatar */}
        <div className="flex-shrink-0">
          <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{review.author.initials}</span>
          </div>
        </div>
        
        {/* Review content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {review.author.name}
              </p>
              <div className="flex items-center mt-1">
                <div className="flex items-center">
                  {renderStars(review.rating)}
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">for {review.appName}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{getTimeAgo(review.createdAt)}</span>
              </div>
            </div>
            
            <div className="flex-shrink-0">
              <Badge variant="secondary" className={
                review.platform === "google_play" 
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  : "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
              }>
                {review.platform === "google_play" ? "Google Play" : "App Store"}
              </Badge>
            </div>
          </div>
          
          <div className="mt-2">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {review.text}
            </p>
          </div>
          
          {/* AI Response or Loading State */}
          {review.response ? (
            isGeneratingResponse ? (
              // Generating response indicator
              <div className="mt-3 flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                    <i className="ri-time-line text-amber-600 dark:text-amber-400"></i>
                  </div>
                </div>
                
                <div className="ml-3">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    AI generating response... ({review.response.generatingTime} seconds)
                  </p>
                </div>
              </div>
            ) : (
              // Response content
              <div className="mt-3 bg-gray-50 dark:bg-gray-900 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                      <i className="ri-robot-line text-primary-600 dark:text-primary-400"></i>
                    </div>
                  </div>
                  
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        AI Generated Response ({review.response.status === "draft" ? "Draft" : review.response.status === "approved" ? "Approved" : "Published"})
                      </p>
                      {!isEditing && (
                        <div className="flex items-center space-x-2">
                          <button 
                            type="button" 
                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                            onClick={handleEditClick}
                          >
                            <i className="ri-edit-line text-sm"></i>
                          </button>
                          <button type="button" className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                            <i className="ri-more-2-fill text-sm"></i>
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {isEditing ? (
                      <div className="mt-2">
                        <textarea
                          value={editedResponse}
                          onChange={(e) => setEditedResponse(e.target.value)}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm"
                          rows={5}
                        />
                        <div className="mt-2 flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                        {review.response.text}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          ) : (
            // No response yet, show loading skeleton
            <div className="mt-3">
              <Skeleton className="h-20 w-full bg-gray-200 dark:bg-gray-700" />
            </div>
          )}
          
          {/* Action buttons */}
          <div className={`mt-3 flex justify-end space-x-2 ${isGeneratingResponse ? 'opacity-50' : ''}`}>
            <button 
              type="button" 
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              disabled={isGeneratingResponse || isEditing}
              onClick={() => onRegenerateResponse && review.id && onRegenerateResponse(review.id)}
            >
              <RefreshCw className="mr-1.5 h-3 w-3" />
              Regenerate
            </button>
            
            <button 
              type="button" 
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              disabled={isGeneratingResponse || isEditing}
              onClick={handleEditClick}
            >
              <Edit2 className="mr-1.5 h-3 w-3" />
              Edit
            </button>
            
            <button 
              type="button" 
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              disabled={isGeneratingResponse || isEditing || review.response?.status === "published"}
              onClick={() => onPublishResponse && review.id && onPublishResponse(review.id)}
            >
              <Check className="mr-1.5 h-3 w-3" />
              Publish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewItem;
