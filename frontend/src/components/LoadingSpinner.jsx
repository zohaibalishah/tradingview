export const LoadingSpinner = ({ size = "w-4 h-4", color = "border-primary-500" }) => (
  <div
    className={`inline-block ${size} border-2 border-gray-200 rounded-full border-t-current animate-spin ${color}`}
  />
);

export default LoadingSpinner;
