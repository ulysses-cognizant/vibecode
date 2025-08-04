import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ButtonGroup,
  Button
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import airQualityAPI from '../services/api';

const RegionalComparison = () => {
  const [regionsData, setRegionsData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [viewMode, setViewMode] = useState('table');
  const [selectedMetric, setSelectedMetric] = useState('aqi');

  const metrics = [
    { value: 'aqi', label: 'Air Quality Index', unit: '' },
    { value: 'pm2_5', label: 'PM2.5', unit: 'μg/m³' },
    { value: 'pm10', label: 'PM10', unit: 'μg/m³' },
    { value: 'no2', label: 'NO₂', unit: 'μg/m³' },
    { value: 'o3', label: 'O₃', unit: 'μg/m³' },
    { value: 'so2', label: 'SO₂', unit: 'μg/m³' }
  ];

  useEffect(() => {
    fetchRegionsData();
  }, []);

  const fetchRegionsData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await airQualityAPI.getUKRegionsAirQuality();
      setRegionsData(data.filter(region => region.airQuality));
    } catch (err) {
      setError('Failed to fetch regional data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getValue = (region, metric) => {
    if (!region.airQuality || !region.airQuality.list || !region.airQuality.list[0]) {
      return null;
    }

    const data = region.airQuality.list[0];
    if (metric === 'aqi') {
      return data.aqi;
    }
    return data.components[metric];
  };

  const getCategory = (region, metric) => {
    if (!region.airQuality || !region.airQuality.list || !region.airQuality.list[0]) {
      return 'unknown';
    }

    const data = region.airQuality.list[0];
    if (metric === 'aqi') {
      if (data.aqi <= 2) return 'good';
      if (data.aqi === 3) return 'moderate';
      return 'poor';
    }

    const pollutants = data.pollutants;
    const pollutantMap = {
      'pm2_5': 'PM2.5',
      'pm10': 'PM10',
      'no2': 'NO₂',
      'o3': 'O₃',
      'so2': 'SO₂'
    };

    const pollutantKey = pollutantMap[metric];
    const category = pollutants[pollutantKey]?.category;
    
    if (category === 'low') return 'good';
    if (category === 'moderate') return 'moderate';
    if (category === 'high') return 'poor';
    return 'unknown';
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'good': return 'success';
      case 'moderate': return 'warning';
      case 'poor': return 'error';
      default: return 'default';
    }
  };

  const handleSort = (property) => {
    const isAsc = sortBy === property && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortBy(property);
  };

  const sortedData = [...regionsData].sort((a, b) => {
    let aValue, bValue;

    if (sortBy === 'name') {
      aValue = a.name;
      bValue = b.name;
    } else {
      aValue = getValue(a, sortBy) || 0;
      bValue = getValue(b, sortBy) || 0;
    }

    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const chartData = regionsData.map(region => ({
    name: region.name,
    [selectedMetric]: getValue(region, selectedMetric) || 0
  })).sort((a, b) => b[selectedMetric] - a[selectedMetric]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const metric = metrics.find(m => m.value === selectedMetric);
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
          <Typography variant="body2" sx={{ color: payload[0].color }}>
            {metric.label}: {payload[0].value}{metric.unit}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Regional Air Quality Comparison
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <ButtonGroup variant="outlined">
          <Button
            variant={viewMode === 'table' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('table')}
          >
            Table View
          </Button>
          <Button
            variant={viewMode === 'chart' ? 'contained' : 'outlined'}
            onClick={() => setViewMode('chart')}
          >
            Chart View
          </Button>
        </ButtonGroup>

        {viewMode === 'chart' && (
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Metric</InputLabel>
            <Select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              label="Metric"
            >
              {metrics.map((metric) => (
                <MenuItem key={metric.value} value={metric.value}>
                  {metric.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {viewMode === 'table' ? (
        <Card>
          <CardContent>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={sortBy === 'name'}
                        direction={sortBy === 'name' ? sortDirection : 'asc'}
                        onClick={() => handleSort('name')}
                      >
                        Region
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center">
                      <TableSortLabel
                        active={sortBy === 'aqi'}
                        direction={sortBy === 'aqi' ? sortDirection : 'asc'}
                        onClick={() => handleSort('aqi')}
                      >
                        AQI
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center">
                      <TableSortLabel
                        active={sortBy === 'pm2_5'}
                        direction={sortBy === 'pm2_5' ? sortDirection : 'asc'}
                        onClick={() => handleSort('pm2_5')}
                      >
                        PM2.5
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center">
                      <TableSortLabel
                        active={sortBy === 'pm10'}
                        direction={sortBy === 'pm10' ? sortDirection : 'asc'}
                        onClick={() => handleSort('pm10')}
                      >
                        PM10
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center">
                      <TableSortLabel
                        active={sortBy === 'no2'}
                        direction={sortBy === 'no2' ? sortDirection : 'asc'}
                        onClick={() => handleSort('no2')}
                      >
                        NO₂
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center">
                      <TableSortLabel
                        active={sortBy === 'o3'}
                        direction={sortBy === 'o3' ? sortDirection : 'asc'}
                        onClick={() => handleSort('o3')}
                      >
                        O₃
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center">
                      <TableSortLabel
                        active={sortBy === 'so2'}
                        direction={sortBy === 'so2' ? sortDirection : 'asc'}
                        onClick={() => handleSort('so2')}
                      >
                        SO₂
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center">Overall</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedData.map((region) => (
                    <TableRow key={region.name} hover>
                      <TableCell component="th" scope="row">
                        <Typography variant="subtitle2">
                          {region.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {region.lat.toFixed(2)}, {region.lon.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {getValue(region, 'aqi') || 'N/A'}
                      </TableCell>
                      <TableCell align="center">
                        {getValue(region, 'pm2_5')?.toFixed(1) || 'N/A'}
                      </TableCell>
                      <TableCell align="center">
                        {getValue(region, 'pm10')?.toFixed(1) || 'N/A'}
                      </TableCell>
                      <TableCell align="center">
                        {getValue(region, 'no2')?.toFixed(1) || 'N/A'}
                      </TableCell>
                      <TableCell align="center">
                        {getValue(region, 'o3')?.toFixed(1) || 'N/A'}
                      </TableCell>
                      <TableCell align="center">
                        {getValue(region, 'so2')?.toFixed(1) || 'N/A'}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={getCategory(region, 'aqi')}
                          color={getCategoryColor(getCategory(region, 'aqi'))}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {metrics.find(m => m.value === selectedMetric)?.label} Across UK Regions
            </Typography>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey={selectedMetric} 
                  fill="#2E7D32"
                  name={metrics.find(m => m.value === selectedMetric)?.label}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Box sx={{ mt: 3 }}>
        <Typography variant="caption" color="text.secondary">
          Data shows current air quality measurements across major UK regions. 
          AQI scale: 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor. 
          Other measurements in μg/m³. Data refreshed every hour.
        </Typography>
      </Box>
    </Box>
  );
};

export default RegionalComparison;
