import { lazy, Suspense, type ComponentProps } from "react";

const GlobeInner = lazy(() => import("./Globe").then((m) => ({ default: m.Globe })));
type Props = ComponentProps<typeof import("./Globe").Globe>;

/** The world globe is big (map data + d3), so it is only fetched when someone opens a screen that shows it. */
export function Globe(props: Props) {
  return <Suspense fallback={<div className="fx-globe-wait" role="status">🌍 Loading the world…</div>}><GlobeInner {...props} /></Suspense>;
}
