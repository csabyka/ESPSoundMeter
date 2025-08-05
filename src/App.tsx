import {useCallback, useEffect, useLayoutEffect, useMemo, useState, useRef} from 'react';
import {Button, DatePicker, Space, TimeRangePickerProps} from "antd";
import dayjs, {Dayjs} from 'dayjs';
import {Line} from '@ant-design/plots';
import './App.css';
import {Row, Location, Range} from './types';

console.log(process.env);

function App() {
    const [data, setData] = useState<Row[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [latestValues, setLatestValues] = useState<{[key: string]: number}>({});
    const [range, setRange] = useState<Range>([null, null]);
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);
    const rangePresets: TimeRangePickerProps['presets'] = useMemo(() => {
        const now = dayjs();

        return [
            {label: 'Last 1 hour', value: [now.add(-1, 'h'), now]},
            {label: 'Last 3 hours', value: [now.add(-3, 'h'), now]},
            {label: 'Last 6 hours', value: [now.add(-6, 'h'), now]},
            {label: 'Last 12 hours', value: [now.add(-12, 'h'), now]},
            {label: 'Last 1 day', value: [now.add(-1, 'd'), now]},
            {label: 'Last 1 week', value: [now.add(-1, 'w'), now]},
        ]
    }, []);
    const stat = useMemo(() => {
        const values = data.map(state => state.value).filter(v => v > 0);
        return {
            max: Math.max(...values),
            // avg: values.reduce((sum, value) => sum + value, 0) / values.length,
        };
    }, [data]);
    const onRangeChange = (dates: null | (Dayjs | null)[]) => {
        setRange(dates as Range);
    };

    function getUrl(rangeArr: Range | null, onlyLatest?: boolean) {
        const url = new URL('https://esp-sound-meter.balaton.workers.dev');
        if (Array.isArray(rangeArr)) {
            url.searchParams.set('range', rangeArr.map(t => t?.unix()).join('-'));
        }
        if (onlyLatest) {
            url.searchParams.set('onlyLatest', '1');
        }

        return url.toString();
    }

    function applyFilter() {
        let url = new URL(getUrl(range));
        window.history.pushState({}, '', url.search)
        loadData(range);
    }

    const loadData: ((rangeArr: Range | null) => void) = useCallback(function (rangeArr: Range | null) {
        fetch(getUrl(rangeArr))
            .then((res) => res.json())
            .then(({values, locations}) => {
                setData(values.map((state: { timestamp: string, value: number }) => {
                    state.timestamp = dayjs(state.timestamp).add(2, 'h').format('YYYY-MM-DD HH:mm');
                    return state;
                }));

                setLocations(locations);
            });
    }, []);

    const loadLatest = useCallback(function () {
        fetch(getUrl(null, true))
            .then((res) => res.json())
            .then(({values, locations}) => {
                setLocations(locations);
                
                // Store latest values by location type
                const valuesByType: {[key: string]: number} = {};
                values.forEach((item: { timestamp: string, value: number, type?: string }) => {
                    if (item.type) {
                        valuesByType[item.type] = item.value;
                    }
                });
                setLatestValues(valuesByType);
            });
    }, []);

    useLayoutEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const rangeParam = params.get('range');

        const rangeArr = rangeParam
            ? rangeParam.split('-').map((t) => {
                const timestamp = dayjs.unix(+t);
                return timestamp.isValid() ? timestamp : null;
            }) as Range : [dayjs().add(-3, 'h'), dayjs()] as Range;

        setRange(rangeArr);

        // @ts-ignore
        window.dayjs = dayjs;

        loadData(rangeArr);

        // return () => {
        //   controller.abort();
        // }
    }, [loadData]);

    // Interval for real-time updates (every minute)
    useLayoutEffect(() => {
        const interval = setInterval(() => {
            loadLatest();
        }, 60 * 1000);

        loadLatest();

        return () => {
            clearInterval(interval);
        };
    }, [loadLatest]);

    // Initialize Google Maps
    useLayoutEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        const initMap = () => {
            if (typeof google === 'undefined') {
                console.error('Google Maps API not loaded');
                return;
            }

            const map = new google.maps.Map(mapRef.current!, {
                center: { lat: 46.9541, lng: 17.8881 }, // Balaton area
                zoom: 10,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true,
            });

            mapInstanceRef.current = map;
        };

        // Load Google Maps API if not already loaded
        if (typeof google === 'undefined') {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = initMap;
            document.head.appendChild(script);
        } else {
            initMap();
        }

        return () => {
            // Cleanup markers
            markersRef.current.forEach(marker => marker.setMap(null));
            markersRef.current = [];
        };
    }, []);

    // Update markers when locations or latest values change
    useEffect(() => {
        if (!mapInstanceRef.current || locations.length === 0) return;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        // Add new markers
        const bounds = new google.maps.LatLngBounds();
        
        locations.forEach((location) => {
            const latestValue = latestValues[location.type] || 0;
            const displayValue = parseFloat(latestValue.toString()).toFixed(2);
            
            // Create a custom marker with 50-meter diameter circle
            const marker = new google.maps.Marker({
                position: { lat: location.lat, lng: location.lng },
                map: mapInstanceRef.current,
                title: `${location.type}: ${displayValue} dBa`,
                label: {
                    text: `${displayValue}`,
                    color: 'white',
                    fontWeight: 'bold'
                },
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 30, // 60-meter diameter (30 pixels radius)
                    fillColor: latestValue > 50 ? '#FC2947' : '#4285F4', // Red if > 50 dBa, blue otherwise
                    fillOpacity: 0.8,
                    strokeColor: '#FFFFFF',
                    strokeWeight: 2
                }
            });

            markersRef.current.push(marker);
            bounds.extend({ lat: location.lat, lng: location.lng });
        });

        // Fit map to show all markers
        if (locations.length > 1) {
            mapInstanceRef.current.fitBounds(bounds);
        } else if (locations.length === 1) {
            mapInstanceRef.current.setCenter({ lat: locations[0].lat, lng: locations[0].lng });
            mapInstanceRef.current.setZoom(12);
        }
    }, [locations, latestValues]);

    return (
        <div className="App">
            <div className="headline">
                <Space align="start">
                    <b>Max: {data.length > 0 ? stat.max : 0} dBa</b>
                </Space>
                <Space>
                    <DatePicker.RangePicker
                        showTime
                        showSecond={false}
                        value={range}
                        presets={rangePresets}
                        onChange={onRangeChange}/>
                    <Button disabled={!range} type="primary" onClick={applyFilter}>Apply</Button>
                </Space>
            </div>
            <Line
                data={data}
                axis={{
                    x: {
                        labelFilter: (datum: string, idx: number) => idx % 9 === 0,
                    }
                }}
                className="chart"
                xField="timestamp"
                yField="value"
                colorField="type"
                annotations={[{
                    type: "lineY",
                    yField: 50,
                    style: {stroke: "#FC2947", strokeOpacity: 1, lineWidth: 2},
                }]}
            />

            <div className="google-maps">
                <div ref={mapRef} style={{ width: '100%', height: '400px' }}></div>
            </div>
        </div>
    );
}

export default App;
