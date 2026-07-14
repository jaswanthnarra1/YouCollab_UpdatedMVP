import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { discoveryService, type NearbyBrand, type NearbyCreator } from "@/services/discovery";

const isCreator = (item: NearbyCreator | NearbyBrand): item is NearbyCreator => "instagramHandle" in item;

/**
 * "Nearby Creators" / "Nearby Brands" dashboard widget — the counterpart
 * profiles closest to the viewer's own PIN code, via /api/discovery/nearby.
 */
export default function NearbySection() {
  const { data, isLoading } = useQuery({ queryKey: ["discovery-nearby"], queryFn: discoveryService.nearby });

  const items = data?.items ?? [];
  const locationEnabled = data?.locationEnabled ?? false;
  const isBrandViewer = data?.type === "creators";
  const profilePath = isBrandViewer ? "/profile/brand" : "/profile/creator";

  return (
    <div className="border border-border rounded-sm p-5 bg-background space-y-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {isBrandViewer ? "Nearby Creators" : "Nearby Brands"}
        </h3>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          {isBrandViewer ? "Creators closest to your PIN code." : "Brands closest to your PIN code."}
        </p>
      </div>

      {isLoading ? (
        <p className="text-[12px] text-muted-foreground">Loading…</p>
      ) : !locationEnabled ? (
        <div className="flex items-center justify-between gap-3 border border-border rounded-sm px-3 py-2.5 bg-muted/30 text-[12px]">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            Add your PIN code to see who's nearby.
          </span>
          <Link to={profilePath} className="text-foreground font-medium hover:underline shrink-0">Add PIN</Link>
        </div>
      ) : items.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">No one nearby has added a PIN code yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => {
            const label = isCreator(item) ? item.name : item.businessName;
            const subtitle = isCreator(item) ? item.niche : item.category;
            const imageUrl = isCreator(item) ? item.profileImageUrl : item.logoUrl;

            return (
              <li key={item.id} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-sm bg-gradient-brand flex items-center justify-center text-[11px] font-semibold text-white shrink-0 overflow-hidden">
                  {imageUrl ? (
                    <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    label.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate">{label}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
                </div>
                {item.distanceKm != null && (
                  <span className="text-[11px] text-muted-foreground shrink-0">{item.distanceKm} km</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
