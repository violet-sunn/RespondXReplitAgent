import React from "react";
import { Star, MessageCircle, Reply, Clock } from "lucide-react";
import StatCard from "@/components/dashboard/StatCard";
import AppIntegrationList from "@/components/dashboard/AppIntegrationList";
import AIOverview from "@/components/dashboard/AIOverview";
import ReviewList from "@/components/reviews/ReviewList";
import { useQuery } from "@tanstack/react-query";

const Dashboard: React.FC = () => {
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/stats"],
  });

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mt-6">
          {isLoadingStats ? (
            // Loading state
            [...Array(4)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg p-5">
                <div className="animate-pulse flex items-center">
                  <div className="rounded-md bg-gray-200 dark:bg-gray-700 h-12 w-12"></div>
                  <div className="ml-5 w-full">
                    <div className="bg-gray-200 dark:bg-gray-700 h-4 w-24 mb-2 rounded"></div>
                    <div className="bg-gray-200 dark:bg-gray-700 h-6 w-16 mb-1 rounded"></div>
                    <div className="bg-gray-200 dark:bg-gray-700 h-4 w-32 rounded"></div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            // Actual stats cards
            <>
              <StatCard
                title="Average Rating"
                value={statsData?.avgRating || "0.0"}
                change={{
                  value: statsData?.avgRatingChange || "0%",
                  type: parseFloat(statsData?.avgRatingChange || "0") >= 0 ? "increase" : "decrease",
                  period: "last month"
                }}
                icon={<Star className="text-xl text-primary-600 dark:text-primary-400" />}
                iconBgClass="bg-primary-100 dark:bg-primary-900"
                iconTextClass="text-primary-600 dark:text-primary-400"
              />
              
              <StatCard
                title="New Reviews (7d)"
                value={statsData?.newReviews?.toString() || "0"}
                change={{
                  value: statsData?.newReviewsChange || "0%",
                  type: parseFloat(statsData?.newReviewsChange || "0") >= 0 ? "increase" : "decrease",
                  period: "last week"
                }}
                icon={<MessageCircle className="text-xl text-secondary-600 dark:text-secondary-400" />}
                iconBgClass="bg-secondary-100 dark:bg-secondary-900"
                iconTextClass="text-secondary-600 dark:text-secondary-400"
              />
              
              <StatCard
                title="Auto-Response Rate"
                value={`${statsData?.responseRate || "0"}%`}
                change={{
                  value: `${statsData?.responseRateChange || "0"}%`,
                  type: parseFloat(statsData?.responseRateChange || "0") >= 0 ? "increase" : "decrease",
                  period: "target"
                }}
                icon={<Reply className="text-xl text-amber-600 dark:text-amber-400" />}
                iconBgClass="bg-amber-100 dark:bg-amber-900"
                iconTextClass="text-amber-600 dark:text-amber-400"
              />
              
              <StatCard
                title="Avg Response Time"
                value={`${statsData?.avgResponseTime || "0"} hrs`}
                change={{
                  value: `${statsData?.avgResponseTimeChange || "0"} hrs`,
                  type: parseFloat(statsData?.avgResponseTimeChange || "0") <= 0 ? "increase" : "decrease",
                  period: "last month"
                }}
                icon={<Clock className="text-xl text-red-600 dark:text-red-400" />}
                iconBgClass="bg-red-100 dark:bg-red-900"
                iconTextClass="text-red-600 dark:text-red-400"
              />
            </>
          )}
        </div>

        {/* Integration Stats and AI Overview */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AppIntegrationList />
          </div>

          <div>
            <AIOverview />
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="mt-8">
          <ReviewList limit={3} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
