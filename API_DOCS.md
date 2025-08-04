# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Endpoints

### Health Check
```
GET /health
```
Returns server status and timestamp.

### Geocoding Endpoints

#### Search Location
```
GET /geocoding/search?query={search_term}
```
Search for locations by name or postcode.

**Parameters:**
- `query` (string): Location name or UK postcode

**Response:**
```json
{
  "results": [
    {
      "name": "London",
      "country": "GB",
      "state": "England",
      "lat": 51.5074,
      "lon": -0.1278,
      "displayName": "London, England, GB"
    }
  ],
  "source": "openweathermap"
}
```

#### Get Coordinates from Postcode
```
GET /geocoding/postcode/{postcode}
```
Get coordinates for a specific UK postcode.

#### Reverse Geocoding
```
GET /geocoding/reverse/{lat}/{lon}
```
Get location information from coordinates.

### Routing Endpoints

#### Calculate Clean Routes
```
POST /routing/calculate
```
Calculate pollution-aware routes between two points.

**Request Body:**
```json
{
  "origin": {
    "lat": 51.5074,
    "lon": -0.1278
  },
  "destination": {
    "lat": 51.4545,
    "lon": -2.5879
  },
  "options": {
    "vehicle": "car",
    "avoidPollution": true,
    "alternatives": true,
    "pollutionThreshold": 50
  }
}
```

**Response:**
```json
{
  "routes": [
    {
      "id": "route_1",
      "name": "Clean Air Route",
      "coordinates": [[lon, lat], [lon, lat], ...],
      "distance": 120500,
      "duration": 7200,
      "pollution_level": "low",
      "pollutionScore": 45.2,
      "healthScore": 2.1,
      "instructions": [
        {
          "text": "Head northwest on A4",
          "distance": 500
        }
      ],
      "provider": "graphhopper"
    }
  ]
}
```

### Air Quality Endpoints

#### Current Air Quality
```
GET /air-quality/current/{lat}/{lon}
```
Get current air quality data for coordinates.

**Response:**
```json
{
  "coord": [51.5074, -0.1278],
  "list": [
    {
      "dt": 1640995200,
      "timestamp": "2022-01-01T12:00:00.000Z",
      "aqi": 2,
      "aqiDescription": "Fair",
      "components": {
        "co": 233.14,
        "no": 0.01,
        "no2": 12.37,
        "o3": 90.02,
        "so2": 7.75,
        "pm2_5": 8.94,
        "pm10": 15.67,
        "nh3": 2.49
      },
      "pollutants": {
        "PM2.5": {
          "value": 8.94,
          "unit": "μg/m³",
          "description": "Fine Particulate Matter",
          "category": "low"
        },
        "PM10": {
          "value": 15.67,
          "unit": "μg/m³",
          "description": "Coarse Particulate Matter",
          "category": "low"
        },
        "NO₂": {
          "value": 12.37,
          "unit": "μg/m³",
          "description": "Nitrogen Dioxide",
          "category": "low"
        },
        "O₃": {
          "value": 90.02,
          "unit": "μg/m³",
          "description": "Ozone",
          "category": "low"
        },
        "SO₂": {
          "value": 7.75,
          "unit": "μg/m³",
          "description": "Sulphur Dioxide",
          "category": "low"
        }
      }
    }
  ]
}
```

#### Air Quality Forecast
```
GET /air-quality/forecast/{lat}/{lon}
```
Get 5-day air quality forecast.

#### Historical Air Quality
```
GET /air-quality/history/{lat}/{lon}?start={start_date}&end={end_date}
```
Get historical air quality data.

**Parameters:**
- `start` (optional): Start date (ISO string)
- `end` (optional): End date (ISO string)

#### UK Regions Air Quality
```
GET /air-quality/regions
```
Get current air quality for major UK cities.

#### Pollution Rankings
```
GET /air-quality/rankings?pollutant={pollutant}
```
Get pollution rankings for UK regions.

**Parameters:**
- `pollutant` (optional): Pollutant type (aqi, pm2_5, pm10, no2, o3, so2)

**Response:**
```json
{
  "low": [...],
  "moderate": [...],
  "high": [...],
  "bestAirQuality": [...],
  "areasNeedingAttention": [...],
  "pollutant": "aqi",
  "all": [...]
}
```

## Air Quality Index (AQI) Scale

| AQI | Description | Health Implications |
|-----|-------------|-------------------|
| 1   | Good        | Air quality is satisfactory |
| 2   | Fair        | Air quality is acceptable |
| 3   | Moderate    | Sensitive individuals may experience minor issues |
| 4   | Poor        | Everyone may begin to experience health effects |
| 5   | Very Poor   | Health warnings of emergency conditions |

## Pollutant Categories

### PM2.5 (Fine Particulate Matter)
- **Low**: ≤ 15 μg/m³
- **Moderate**: 15-35 μg/m³
- **High**: > 35 μg/m³

### PM10 (Coarse Particulate Matter)
- **Low**: ≤ 25 μg/m³
- **Moderate**: 25-50 μg/m³
- **High**: > 50 μg/m³

### NO₂ (Nitrogen Dioxide)
- **Low**: ≤ 40 μg/m³
- **Moderate**: 40-80 μg/m³
- **High**: > 80 μg/m³

### O₃ (Ozone)
- **Low**: ≤ 100 μg/m³
- **Moderate**: 100-160 μg/m³
- **High**: > 160 μg/m³

### SO₂ (Sulphur Dioxide)
- **Low**: ≤ 20 μg/m³
- **Moderate**: 20-80 μg/m³
- **High**: > 80 μg/m³

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400`: Bad Request (missing or invalid parameters)
- `404`: Not Found (location not found)
- `500`: Internal Server Error
