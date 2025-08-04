import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons for origin and destination
const originIcon = L.divIcon({
  html: `<div style="
    background: #4caf50; 
    border: 3px solid white; 
    border-radius: 50%; 
    width: 24px; 
    height: 24px; 
    display: flex; 
    align-items: center; 
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    font-weight: bold;
    color: white;
    font-size: 12px;
  ">A</div>`,
  className: 'custom-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const destinationIcon = L.divIcon({
  html: `<div style="
    background: #f44336; 
    border: 3px solid white; 
    border-radius: 50%; 
    width: 24px; 
    height: 24px; 
    display: flex; 
    align-items: center; 
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    font-weight: bold;
    color: white;
    font-size: 12px;
  ">B</div>`,
  className: 'custom-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const MapController = ({ bounds, onMapReady }) => {
  const map = useMap();
  
  useEffect(() => {
    if (onMapReady) {
      onMapReady(map);
    }
    
    // Force map to resize properly
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map, onMapReady]);
  
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      try {
        console.log('Setting bounds:', bounds);
        const leafletBounds = L.latLngBounds(bounds);
        console.log('Leaflet bounds:', leafletBounds);
        
        // Only fit bounds if we have routes or both origin and destination
        if (bounds.length >= 2) {
          map.fitBounds(leafletBounds, { 
            padding: [10, 10],
            maxZoom: 14 // Prevent excessive zoom out
          });
        }
      } catch (error) {
        console.error('Error fitting bounds:', error, bounds);
      }
    }
  }, [bounds, map]);
  
  return null;
};

const SimpleMap = ({ 
  originCoords, 
  destinationCoords, 
  routes = [], 
  selectedRoute,
  onRouteSelect,
  height = 600,
  origin = '',
  destination = ''
}) => {
  const mapRef = useRef(null);
  
  // Calculate center and bounds
  const getMapCenter = () => {
    if (originCoords && destinationCoords) {
      return [(originCoords.lat + destinationCoords.lat) / 2, (originCoords.lon + destinationCoords.lon) / 2];
    } else if (originCoords) {
      return [originCoords.lat, originCoords.lon];
    } else if (destinationCoords) {
      return [destinationCoords.lat, destinationCoords.lon];
    }
    return [51.5074, -0.1278]; // Default to London
  };
  
  const getDefaultZoom = () => {
    if (routes && routes.length > 0) {
      return 12; // Good default for route viewing
    } else if (originCoords && destinationCoords) {
      return 11; // Good for showing two points
    } else if (originCoords || destinationCoords) {
      return 13; // Close zoom for single point
    }
    return 10; // Default zoom
  };
  
  const getBounds = () => {
    const bounds = [];
    
    // Always include origin and destination if available
    if (originCoords) bounds.push([originCoords.lat, originCoords.lon]);
    if (destinationCoords) bounds.push([destinationCoords.lat, destinationCoords.lon]);
    
    // Only add route coordinates if we have routes
    if (routes && routes.length > 0) {
      routes.forEach(route => {
        if (route.coordinates && Array.isArray(route.coordinates)) {
          // Sample some points from the route to avoid too many bounds points
          const sampleSize = Math.min(route.coordinates.length, 6);
          const step = Math.max(1, Math.floor(route.coordinates.length / sampleSize));
          
          for (let i = 0; i < route.coordinates.length; i += step) {
            const coord = route.coordinates[i];
            if (Array.isArray(coord) && coord.length >= 2) {
              bounds.push([coord[1], coord[0]]); // Convert [lon, lat] to [lat, lon]
            } else if (coord.lat !== undefined && coord.lon !== undefined) {
              bounds.push([coord.lat, coord.lon]);
            }
          }
        }
      });
    }
    
    console.log('Calculated bounds:', bounds);
    return bounds;
  };
  
  const center = getMapCenter();
  const bounds = getBounds();
  const defaultZoom = getDefaultZoom();
  
  return (
    <div style={{ height: `${height}px`, width: '100%', position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController 
          bounds={bounds.length >= 2 ? bounds : null}
          onMapReady={(map) => { mapRef.current = map; }}
        />
        
        {/* Origin Marker */}
        {originCoords && (
          <Marker position={[originCoords.lat, originCoords.lon]} icon={originIcon}>
            <Popup>
              <div style={{ minWidth: '150px' }}>
                <strong style={{ color: '#4caf50' }}>🏁 Origin</strong><br />
                {origin && <><em>{origin}</em><br /></>}
                <small>
                  {originCoords.lat.toFixed(4)}, {originCoords.lon.toFixed(4)}
                </small>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Destination Marker */}
        {destinationCoords && (
          <Marker position={[destinationCoords.lat, destinationCoords.lon]} icon={destinationIcon}>
            <Popup>
              <div style={{ minWidth: '150px' }}>
                <strong style={{ color: '#f44336' }}>🎯 Destination</strong><br />
                {destination && <><em>{destination}</em><br /></>}
                <small>
                  {destinationCoords.lat.toFixed(4)}, {destinationCoords.lon.toFixed(4)}
                </small>
              </div>
            </Popup>
          </Marker>
        )}
        
        {/* Distance line between origin and destination when no routes */}
        {originCoords && destinationCoords && routes.length === 0 && (
          <Polyline
            positions={[
              [originCoords.lat, originCoords.lon],
              [destinationCoords.lat, destinationCoords.lon]
            ]}
            pathOptions={{
              color: '#999999',
              weight: 2,
              opacity: 0.5,
              dashArray: '5, 10'
            }}
          >
            <Popup>
              <div style={{ minWidth: '150px' }}>
                <strong>Direct Distance</strong><br />
                <small>Click "Find Clean Routes" to see pollution-aware routes</small>
              </div>
            </Popup>
          </Polyline>
        )}

        {/* Route Lines */}
        {routes.map((route, index) => {
          const positions = [];
          
          if (route.coordinates && Array.isArray(route.coordinates)) {
            route.coordinates.forEach((coord) => {
              if (Array.isArray(coord) && coord.length >= 2) {
                // Routes use [lon, lat] format, convert to [lat, lon] for Leaflet
                positions.push([coord[1], coord[0]]);
              } else if (coord.lat !== undefined && coord.lon !== undefined) {
                positions.push([coord.lat, coord.lon]);
              }
            });
          }
          
          if (positions.length === 0) return null;
          
          const isSelected = selectedRoute?.id === route.id;
          
          // Route colors based on pollution level
          const getRouteColor = () => {
            if (isSelected) return '#ff0000'; // Bright red for selected
            if (route.pollution_level === 'low') return '#00ff00'; // Bright green for clean
            if (route.pollution_level === 'medium') return '#ff8000'; // Bright orange for medium
            if (route.pollution_level === 'high') return '#ff0000'; // Bright red for high
            return index === 0 ? '#0080ff' : '#8000ff'; // Bright blue/purple for default routes
          };
          
          return (
            <React.Fragment key={route.id || `route-${index}`}>
              <Polyline
                positions={positions}
                pathOptions={{
                  color: getRouteColor(),
                  weight: isSelected ? 8 : 6,
                  opacity: isSelected ? 1.0 : 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                  dashArray: route.pollution_level === 'high' ? '10, 5' : null, // Dashed for high pollution
                }}
                eventHandlers={{
                  click: () => {
                    if (onRouteSelect) onRouteSelect(route);
                  }
                }}
              >
                <Popup>
                  <div style={{ minWidth: '200px' }}>
                    <strong>Route {index + 1}</strong><br />
                    {route.pollution_level && (
                      <>
                        <span style={{ 
                          color: getRouteColor(), 
                          fontWeight: 'bold' 
                        }}>
                          Pollution Level: {route.pollution_level}
                        </span><br />
                      </>
                    )}
                    {route.distance && (
                      <>Distance: {(route.distance / 1000).toFixed(1)} km<br /></>
                    )}
                    {route.duration && (
                      <>Duration: {Math.round(route.duration / 60)} min<br /></>
                    )}
                    {route.pollutionScore && (
                      <>Pollution Score: {route.pollutionScore.toFixed(1)}<br /></>
                    )}
                    <small>Click route to select</small>
                  </div>
                </Popup>
              </Polyline>
              
              {/* Add directional arrows along the route */}
              {positions.length > 2 && (
                <>
                  {/* Route label at start */}
                  {positions[0] && (
                    <Marker 
                      position={positions[0]} 
                      icon={L.divIcon({
                        className: 'route-label',
                        html: `<div style="
                          background: ${getRouteColor()};
                          color: white;
                          padding: 2px 6px;
                          border-radius: 4px;
                          font-size: 10px;
                          font-weight: bold;
                          text-align: center;
                          white-space: nowrap;
                          border: 1px solid white;
                          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                        ">${route.name || `Route ${index + 1}`}</div>`,
                        iconSize: [80, 20],
                        iconAnchor: [40, 10]
                      })}
                    />
                  )}
                  
                  {/* Direction arrows */}
                  {positions[Math.floor(positions.length * 0.3)] && (
                    <Marker 
                      position={positions[Math.floor(positions.length * 0.3)]} 
                      icon={L.divIcon({
                        className: 'route-arrow',
                        html: `<div style="
                          color: ${getRouteColor()};
                          font-size: 18px;
                          font-weight: bold;
                          text-align: center;
                          text-shadow: 2px 2px 4px white, -1px -1px 2px white;
                        ">➤</div>`,
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                      })}
                    />
                  )}
                  
                  {/* Mid arrow */}
                  {positions[Math.floor(positions.length * 0.6)] && (
                    <Marker 
                      position={positions[Math.floor(positions.length * 0.6)]} 
                      icon={L.divIcon({
                        className: 'route-arrow',
                        html: `<div style="
                          color: ${getRouteColor()};
                          font-size: 18px;
                          font-weight: bold;
                          text-align: center;
                          text-shadow: 2px 2px 4px white, -1px -1px 2px white;
                        ">➤</div>`,
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                      })}
                    />
                  )}
                </>
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default SimpleMap;
