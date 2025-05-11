import React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change: {
    value: string;
    type: "increase" | "decrease";
    period: string;
  };
  icon: React.ReactNode;
  iconBgClass: string;
  iconTextClass: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  iconBgClass,
  iconTextClass,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${iconBgClass} rounded-md p-3`}>
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</dt>
              <dd>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{value}</div>
                <div className="flex items-center text-sm">
                  <span className={`flex items-center ${change.type === "increase" ? "text-green-500" : "text-red-500"}`}>
                    {change.type === "increase" ? (
                      <ArrowUp className="mr-1 h-4 w-4" />
                    ) : (
                      <ArrowDown className="mr-1 h-4 w-4" />
                    )}
                    <span>{change.value}</span>
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2">vs {change.period}</span>
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatCard;
