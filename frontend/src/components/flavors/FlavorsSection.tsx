import { useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import FlavorCard from "./FlavorCard";

import generalBG from '@/res/bgs/gn.png'
import csBG from '@/res/bgs/cs.png'
import artsBG from '@/res/bgs/arts.png'
import politicsBG from '@/res/bgs/politics.png'
import scienceBG from '@/res/bgs/science.png'
import sportsBG from '@/res/bgs/sports.png'
import musicBG from '@/res/bgs/music.png'
import gamingBG from '@/res/bgs/gaming.png'

const flavors = [
  {
    id: "general",
    name: "General",
    icon: "🌍",
    color: "150 60% 50%", // accent green
    bgImage: generalBG,
  },
  {
    id: "cs",
    name: "Comp Sci",
    icon: "💻",
    color: "220 90% 56%", // blue
    bgImage: csBG,
  },
  {
    id: "arts",
    name: "Arts",
    icon: "🎨",
    color: "330 80% 60%", // pink
    bgImage: artsBG,
  },
  {
    id: "politics",
    name: "Politics",
    icon: "⚖️",
    color: "45 90% 55%", // amber
    bgImage: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=200&q=80",
  },
  {
    id: "science",
    name: "Science",
    icon: "🔬",
    color: "280 70% 55%", // purple
    bgImage: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=200&q=80",
  },
  {
    id: "sports",
    name: "Sports",
    icon: "⚽",
    color: "15 85% 55%", // orange
    bgImage: "https://images.unsplash.com/photo-1461896836934- voices-1?w=200&q=80",
  },
  {
    id: "music",
    name: "Music",
    icon: "🎵",
    color: "0 75% 60%", // red
    bgImage: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200&q=80",
  },
  {
    id: "gaming",
    name: "Gaming",
    icon: "🎮",
    color: "260 80% 60%", // violet
    bgImage: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=200&q=80",
  },
];

const FlavorsSection = () => {
  const [activeFlavor, setActiveFlavor] = useState("general");

  return (
    <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-4 sticky top-20">
      <div className="flex items-center justify-between mb-4 px-2">
        <h3 className="text-sm font-semibold text-foreground">Flavors</h3>
        <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          View all
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {flavors.map((flavor) => (
          <FlavorCard
            key={flavor.id}
            name={flavor.name}
            icon={flavor.icon}
            color={flavor.color}
            bgImage={flavor.bgImage}
            isActive={activeFlavor === flavor.id}
            onClick={() => setActiveFlavor(flavor.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default FlavorsSection;
