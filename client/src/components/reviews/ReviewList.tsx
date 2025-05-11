import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ReviewItem, { Review } from "./ReviewItem";
import { apiRequest } from "@/lib/queryClient";

interface ReviewListProps {
  appFilter?: number; // Optional app ID to filter by
  ratingFilter?: number; // Optional rating to filter by
  limit?: number; // Limit the number of reviews to show
}

const ReviewList: React.FC<ReviewListProps> = ({ 
  appFilter,
  ratingFilter,
  limit = 10
}) => {
  const [selectedApp, setSelectedApp] = useState<string>(appFilter ? appFilter.toString() : "all");
  const [selectedRating, setSelectedRating] = useState<string>(ratingFilter ? ratingFilter.toString() : "all");
  const [page, setPage] = useState(1);

  // Query for getting apps for the filter dropdown
  const { data: apps } = useQuery({
    queryKey: ["/api/apps"],
  });

  // Query for getting reviews with filters
  const { data: reviewsData, isLoading, refetch } = useQuery({
    queryKey: ["/api/reviews", { app: selectedApp, rating: selectedRating, page, limit }],
  });

  const handleRegenerateResponse = async (reviewId: number) => {
    try {
      await apiRequest("POST", `/api/reviews/${reviewId}/regenerate`, {});
      refetch();
    } catch (error) {
      console.error("Failed to regenerate response:", error);
    }
  };

  const handleEditResponse = async (reviewId: number, responseText: string) => {
    try {
      await apiRequest("PATCH", `/api/reviews/${reviewId}/response`, { text: responseText });
      refetch();
    } catch (error) {
      console.error("Failed to update response:", error);
    }
  };

  const handlePublishResponse = async (reviewId: number) => {
    try {
      await apiRequest("POST", `/api/reviews/${reviewId}/publish`, {});
      refetch();
    } catch (error) {
      console.error("Failed to publish response:", error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {limit < 10 ? "Recent Reviews" : "Reviews"}
          </h2>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Select value={selectedApp} onValueChange={setSelectedApp}>
                <SelectTrigger className="pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700">
                  <SelectValue placeholder="All Apps" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Apps</SelectItem>
                  {apps?.map((app: any) => (
                    <SelectItem key={app.id} value={app.id.toString()}>{app.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="relative">
              <Select value={selectedRating} onValueChange={setSelectedRating}>
                <SelectTrigger className="pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700">
                  <SelectValue placeholder="All Ratings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button variant="outline" size="sm" className="text-gray-700 dark:text-gray-300">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {isLoading ? (
          // Loading skeletons
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="px-6 py-4">
              <div className="flex items-start space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <div className="flex items-center mb-2">
                    <Skeleton className="h-4 w-20 mr-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-16 w-full mb-4" />
                  <Skeleton className="h-20 w-full mb-3" />
                  <div className="flex justify-end">
                    <Skeleton className="h-8 w-24 mr-2" />
                    <Skeleton className="h-8 w-16 mr-2" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          // Actual reviews
          reviewsData?.reviews.map((review: Review) => (
            <ReviewItem
              key={review.id}
              review={review}
              onRegenerateResponse={handleRegenerateResponse}
              onEditResponse={handleEditResponse}
              onPublishResponse={handlePublishResponse}
            />
          ))
        )}
      </div>
      
      {reviewsData?.total > limit && (
        <div className="py-4 px-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              {Array.from({ length: Math.min(5, Math.ceil(reviewsData.total / limit)) }, (_, i) => {
                const pageNumber = i + 1;
                const isCurrentPage = pageNumber === page;
                
                return (
                  <Button
                    key={i}
                    variant={isCurrentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                );
              })}
              
              {Math.ceil(reviewsData.total / limit) > 5 && (
                <>
                  <span className="text-gray-500 dark:text-gray-400">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.ceil(reviewsData.total / limit))}
                  >
                    {Math.ceil(reviewsData.total / limit)}
                  </Button>
                </>
              )}
              
              <Button
                variant="outline"
                size="sm"
                disabled={page === Math.ceil(reviewsData.total / limit)}
                onClick={() => setPage(page + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(page - 1) * limit + 1}-{Math.min(page * limit, reviewsData.total)} of {reviewsData.total} reviews
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewList;
