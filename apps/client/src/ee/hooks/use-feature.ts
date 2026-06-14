import { useAtom } from "jotai";
import { entitlementAtom } from "@/ee/entitlement/entitlement-atom";
import { Feature } from "@/ee/features";

export const implementedFeatures = new Set<string>(Object.values(Feature));

export const isImplementedFeature = (feature: string): boolean =>
  implementedFeatures.has(feature);

export const useHasFeature = (feature: string): boolean => {
  const [entitlements] = useAtom(entitlementAtom);
  return (
    isImplementedFeature(feature) ||
    (entitlements?.features?.includes(feature) ?? false)
  );
};
