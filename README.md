# UK Air Quality Tracker

A comprehensive web application for tracking air quality across the UK and Northern Ireland. Built with React.js frontend and Node.js backend, featuring real-time pollutant data, interactive maps, and detailed analytics.

## Features

- **Postcode & Location Search**: Search for air quality data by UK postcode or location name
- **Pollutant Monitoring**: Track PM2.5, PM10, NO₂, O₃, SO₂, and AQI levels
- **Pollution Rankings**: View areas categorized by pollution levels (Low, Moderate, High)
- **Trend Analysis**: Interactive charts showing yearly pollutant trends
- **Regional Comparison**: Compare pollution levels across UK regions
- **Interactive Maps**: MapBox integration with pollutant overlay data

## Pollutants Tracked

- **PM2.5**: Fine Particulate Matter (≤2.5μm)
- **PM10**: Coarse Particulate Matter (≤10μm)
- **NO₂**: Nitrogen Dioxide
- **O₃**: Ozone
- **SO₂**: Sulphur Dioxide
- **AQI**: Air Quality Index

## APIs Used

- **OpenWeatherMap API**: Air pollution and weather data
- **MapBox API**: Interactive mapping and geocoding

## Installation

1. Clone the repository
2. Install dependencies: `npm run install-all`
3. Set up environment variables (see .env.example)
4. Start development: `npm run dev`

## Environment Variables

Create a `.env` file in the root directory:

```
OPENWEATHER_API_KEY=your_openweather_api_key
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
PORT=5000
```

Create a `.env` file in the client directory:

```
REACT_APP_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
REACT_APP_API_URL=http://localhost:5000/api
```

## Project Structure

```
uk-air-quality-tracker/
├── server/               # Node.js backend
│   ├── controllers/      # API controllers
│   ├── services/         # External API services
│   ├── routes/           # Express routes
│   └── index.js          # Server entry point
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── services/     # API services
│   │   ├── utils/        # Utility functions
│   │   └── App.js        # Main App component
│   └── public/           # Static assets
└── README.md
```

## Usage

1. Start the application with `npm run dev`
2. Navigate to `http://localhost:3000`
3. Search for locations using postcodes or place names
4. View real-time air quality data and trends
5. Explore interactive maps and regional comparisons

## License

MIT License
