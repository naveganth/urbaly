import { MapLayout } from '@/components/layout/map-layout';
import Map from '@/components/map/map';

export default function MapPage() {
  return (
    <MapLayout>
      <div className='flex flex-col'>
        {/* Map Component */}
        <Map />
      </div>
    </MapLayout>
  );
}
