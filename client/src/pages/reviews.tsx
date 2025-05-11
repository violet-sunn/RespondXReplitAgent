import React from "react";
import ReviewList from "@/components/reviews/ReviewList";

const Reviews: React.FC = () => {
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Reviews</h1>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 mt-6">
        <ReviewList />
      </div>
    </div>
  );
};

export default Reviews;
