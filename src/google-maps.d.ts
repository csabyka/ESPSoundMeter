// Google Maps type declarations
declare global {
    interface Window {
        google: any;
    }
}

declare namespace google {
    namespace maps {
        class Map {
            constructor(mapDiv: HTMLElement, opts?: MapOptions);
            setCenter(latLng: LatLng | LatLngLiteral): void;
            setZoom(zoom: number): void;
            fitBounds(bounds: LatLngBounds): void;
        }
        
        class Marker {
            constructor(opts?: MarkerOptions);
            setMap(map: Map | null): void;
            addListener(eventName: string, handler: Function): void;
        }
        
        class InfoWindow {
            constructor(opts?: InfoWindowOptions);
            open(map?: Map | null, anchor?: Marker): void;
        }
        
        class LatLngBounds {
            constructor();
            extend(point: LatLng | LatLngLiteral): void;
        }
        
        class LatLng {
            constructor(lat: number, lng: number);
        }
        
        interface MapOptions {
            center?: LatLng | LatLngLiteral;
            zoom?: number;
            mapTypeId?: MapTypeId;
            mapTypeControl?: boolean;
            streetViewControl?: boolean;
            fullscreenControl?: boolean;
        }
        
        interface MarkerOptions {
            position?: LatLng | LatLngLiteral;
            map?: Map | null;
            title?: string;
            label?: MarkerLabel;
            icon?: MarkerIcon;
        }
        
        interface InfoWindowOptions {
            content?: string;
        }
        
        interface LatLngLiteral {
            lat: number;
            lng: number;
        }
        
        interface MarkerLabel {
            text: string;
            color?: string;
            fontWeight?: string;
        }
        
        interface MarkerIcon {
            path?: SymbolPath;
            scale?: number;
            fillColor?: string;
            fillOpacity?: number;
            strokeColor?: string;
            strokeWeight?: number;
        }
        
        enum MapTypeId {
            ROADMAP = 'roadmap'
        }
        
        enum SymbolPath {
            CIRCLE = 0
        }
    }
} 