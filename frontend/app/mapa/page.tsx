import Map from '@/components/map/map';

export default function MapPage() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background supports-[height:100svh]:h-svh">
      <Map />
    </div>
  );
}
