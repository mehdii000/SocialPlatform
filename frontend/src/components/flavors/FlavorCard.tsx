import { cn } from "@/lib/utils";

interface FlavorCardProps {
  name: string;
  icon: string;
  color: string;
  bgImage: string;
  isActive?: boolean;
  onClick?: () => void;
}

const FlavorCard = ({ name, icon, color, bgImage, isActive, onClick }: FlavorCardProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-3 py-2 w-full overflow-hidden transition-all duration-300 group",
        "border border-border/50 hover:border-border hover:scale-105",
        isActive && "ring-2 ring-offset-2 ring-offset-background"
      )}
      style={{
        backgroundColor: `hsl(${color} / 0.15)`,
        // @ts-ignore
        "--tw-ring-color": `hsl(${color})`,
      }}
    >
      {/* Background Image */}
      <div 
        className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity bg-cover bg-center"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      
      {/* Gradient Overlay */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at bottom right, hsl(${color} / 0.4), transparent 70%)`
        }}
      />
      
      {/* Content */}
      <span className="text-xl relative z-10 flex-shrink-0">{icon}</span>
      <span 
        className="text-sm font-medium relative z-10 text-foreground/90 text-left flex-1"
      >
        {name}
      </span>
    </button>
  );
};

export default FlavorCard;
