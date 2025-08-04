import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Button,
  ButtonGroup
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format, subDays, subMonths, subYears } from 'date-fns';
import airQualityAPI from '../services/api';

const TrendChart = ({ selectedLocation }) => {
  const [historicalData, setHistoricalData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('year');
  const [chartType, setChartType] = useState('line');

  const timeRangeOptions = [
    { value: 'week', label: 'Last Week' },
    { value: 'month', label: 'Last Month' },
    { value: 'quarter', label: 'Last 3 Months' },
    { value: 'year', label: 'Last Year' }
  ];

  useEffect(() => {
    if (selectedLocation) {
      fetchHistoricalData();
    }
  }, [selectedLocation, timeRange]);

  const getDateRange = () => {
    const end = new Date();
    let start;

    switch (timeRange) {
      case 'week':
        start = subDays(end, 7);
        break;
      case 'month':
        start = subMonths(end, 1);
        break;
      case 'quarter':
        start = subMonths(end, 3);
        break;
      case 'year':
        start = subYears(end, 1);
        break;
      default:
        start = subYears(end, 1);
    }

    return { start, end };
  };

  const fetchHistoricalData = async () => {
    if (!selectedLocation) return;

    setIsLoading(true);
    setError(null);

    try {
      const { start, end } = getDateRange();
      console.log('Fetching historical data for:', selectedLocation.name, 'from', start, 'to', end);
      
      const data = await airQualityAPI.getHistoricalAirQuality(
        selectedLocation.lat,
        selectedLocation.lon,
        start.toISOString(),
        end.toISOString()
      );

      console.log('Historical data received:', data);

      // Check if we have data
      if (!data || !data.list || data.list.length === 0) {
        setError('No historical data available for the selected time range.');
        setHistoricalData([]);
        return;
      }

      // Process data for charts
      const processedData = processHistoricalData(data.list);
      console.log('Processed historical data:', processedData);
      
      if (processedData.length === 0) {
        setError('No historical data available for the selected time range.');
      } else {
        setHistoricalData(processedData);
      }
    } catch (err) {
      console.error('Error fetching historical data:', err);
      setError('Failed to fetch historical data. Please try again.');
      setHistoricalData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const processHistoricalData = (rawData) => {
    if (!rawData || rawData.length === 0) {
      return [];
    }

    // Group data by day and calculate averages
    const groupedData = {};

    rawData.forEach(item => {
      // Convert timestamp to date string
      const timestamp = item.timestamp * 1000; // Convert Unix timestamp to milliseconds
      const date = format(new Date(timestamp), 'yyyy-MM-dd');
      
      if (!groupedData[date]) {
        groupedData[date] = {
          date,
          aqi: [],
          pm2_5: [],
          pm10: [],
          no2: [],
          o3: [],
          so2: []
        };
      }

      // Safely add values with null checks
      if (item.aqi !== undefined && item.aqi !== null) {
        groupedData[date].aqi.push(item.aqi);
      }
      if (item.components) {
        if (item.components.pm2_5 !== undefined && item.components.pm2_5 !== null) {
          groupedData[date].pm2_5.push(item.components.pm2_5);
        }
        if (item.components.pm10 !== undefined && item.components.pm10 !== null) {
          groupedData[date].pm10.push(item.components.pm10);
        }
        if (item.components.no2 !== undefined && item.components.no2 !== null) {
          groupedData[date].no2.push(item.components.no2);
        }
        if (item.components.o3 !== undefined && item.components.o3 !== null) {
          groupedData[date].o3.push(item.components.o3);
        }
        if (item.components.so2 !== undefined && item.components.so2 !== null) {
          groupedData[date].so2.push(item.components.so2);
        }
      }
    });

    // Calculate daily averages
    return Object.values(groupedData)
      .map(day => ({
        date: day.date,
        displayDate: format(new Date(day.date), 'MMM dd'),
        aqi: calculateAverage(day.aqi),
        PM2_5: calculateAverage(day.pm2_5),
        PM10: calculateAverage(day.pm10),
        NO2: calculateAverage(day.no2),
        O3: calculateAverage(day.o3),
        SO2: calculateAverage(day.so2)
      }))
      .filter(day => day.aqi > 0) // Filter out days with no data
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const calculateAverage = (values) => {
    if (values.length === 0) return 0;
    return Number((values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(2));
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Box
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #ccc',
            borderRadius: 1,
            p: 2,
            boxShadow: 2
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            {label}
          </Typography>
          {payload.map((entry, index) => (
            <Typography
              key={index}
              variant="body2"
              sx={{ color: entry.color }}
            >
              {entry.name}: {entry.value} {entry.name === 'AQI' ? '' : 'μg/m³'}
            </Typography>
          ))}
        </Box>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      width: '100%',
      height: 400,
      data: historicalData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    if (chartType === 'area') {
      return (
        <ResponsiveContainer {...commonProps}>
          <AreaChart data={historicalData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="displayDate" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area type="monotone" dataKey="aqi" stackId="1" stroke="#FF6B6B" fill="#FF6B6B" fillOpacity={0.3} name="AQI" />
            <Area type="monotone" dataKey="PM2_5" stackId="2" stroke="#4ECDC4" fill="#4ECDC4" fillOpacity={0.3} name="PM2.5" />
            <Area type="monotone" dataKey="PM10" stackId="3" stroke="#45B7D1" fill="#45B7D1" fillOpacity={0.3} name="PM10" />
            <Area type="monotone" dataKey="NO2" stackId="4" stroke="#FFA07A" fill="#FFA07A" fillOpacity={0.3} name="NO₂" />
            <Area type="monotone" dataKey="O3" stackId="5" stroke="#98D8C8" fill="#98D8C8" fillOpacity={0.3} name="O₃" />
            <Area type="monotone" dataKey="SO2" stackId="6" stroke="#F7DC6F" fill="#F7DC6F" fillOpacity={0.3} name="SO₂" />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer {...commonProps}>
        <LineChart data={historicalData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="displayDate" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line type="monotone" dataKey="aqi" stroke="#FF6B6B" strokeWidth={3} name="AQI" />
          <Line type="monotone" dataKey="PM2_5" stroke="#4ECDC4" strokeWidth={2} name="PM2.5" />
          <Line type="monotone" dataKey="PM10" stroke="#45B7D1" strokeWidth={2} name="PM10" />
          <Line type="monotone" dataKey="NO2" stroke="#FFA07A" strokeWidth={2} name="NO₂" />
          <Line type="monotone" dataKey="O3" stroke="#98D8C8" strokeWidth={2} name="O₃" />
          <Line type="monotone" dataKey="SO2" stroke="#F7DC6F" strokeWidth={2} name="SO₂" />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Pollutant Trends
      </Typography>

      {!selectedLocation && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Please search and select a location to view trend data.
        </Alert>
      )}

      {selectedLocation && (
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                label="Time Range"
              >
                {timeRangeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <ButtonGroup variant="outlined">
              <Button
                variant={chartType === 'line' ? 'contained' : 'outlined'}
                onClick={() => setChartType('line')}
              >
                Line Chart
              </Button>
              <Button
                variant={chartType === 'area' ? 'contained' : 'outlined'}
                onClick={() => setChartType('area')}
              >
                Area Chart
              </Button>
            </ButtonGroup>
          </Box>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {selectedLocation.displayName || selectedLocation.name} - {timeRangeOptions.find(t => t.value === timeRange)?.label}
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : historicalData.length === 0 ? (
                <Alert severity="warning">
                  No historical data available for the selected time range.
                </Alert>
              ) : (
                <>
                  {renderChart()}
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Data shows daily averages for the selected time period. 
                      AQI scale: 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor. 
                      Other values in μg/m³.
                    </Typography>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default TrendChart;
