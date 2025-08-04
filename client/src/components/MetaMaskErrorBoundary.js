import React from 'react';
import { Alert, AlertTitle, Box, Button } from '@mui/material';

class MetaMaskErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Check if error is MetaMask related
    const isMetaMaskError = error.message && (
      error.message.includes('MetaMask') ||
      error.message.includes('ethereum') ||
      error.message.includes('chrome-extension') ||
      error.message.includes('Failed to connect to MetaMask') ||
      error.message.includes('nkbihfbeogaeaoehlefnkodbefgpgknn') ||
      error.stack?.includes('chrome-extension')
    );

    if (isMetaMaskError) {
      // Don't update state for MetaMask errors - let the app continue
      return null;
    }

    // Update state for actual app errors
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Check if error is MetaMask related
    const isMetaMaskError = error.message && (
      error.message.includes('MetaMask') ||
      error.message.includes('ethereum') ||
      error.message.includes('chrome-extension') ||
      error.message.includes('Failed to connect to MetaMask') ||
      error.message.includes('nkbihfbeogaeaoehlefnkodbefgpgknn') ||
      error.stack?.includes('chrome-extension')
    );

    if (isMetaMaskError) {
      // Suppress MetaMask errors and log them as warnings
      console.warn('MetaMask extension error suppressed:', error);
      return;
    }

    // Log actual app errors
    console.error('Application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            <AlertTitle>Something went wrong with the Air Quality Tracker</AlertTitle>
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                onClick={() => this.setState({ hasError: false, error: null })}
              >
                Try Again
              </Button>
            </Box>
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default MetaMaskErrorBoundary;
