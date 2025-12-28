import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  children: React.ReactNode;
}

const AuthButton = ({ isLoading, children, className, ...props }: AuthButtonProps) => {
  return (
    <button
      className={cn(
        "w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground",
        "hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
        "transition-smooth disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
      ) : (
        children
      )}
    </button>
  );
};

export default AuthButton;
