#!/bin/bash

# UK Air Quality Tracker Setup Script

echo "🌍 Setting up UK Air Quality Tracker..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install backend dependencies"
    exit 1
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd client
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

cd ..

# Create environment files if they don't exist
if [ ! -f .env ]; then
    echo "📝 Creating backend .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your OpenWeatherMap API key and Mapbox access token"
fi

if [ ! -f client/.env ]; then
    echo "📝 Creating frontend .env file..."
    cp client/.env.example client/.env
    echo "⚠️  Please edit client/.env and add your Mapbox access token"
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Get your OpenWeatherMap API key from: https://openweathermap.org/api"
echo "2. Get your Mapbox access token from: https://mapbox.com/"
echo "3. Edit .env file and add your OpenWeatherMap API key"
echo "4. Edit client/.env file and add your Mapbox access token"
echo "5. Run 'npm run dev' to start the application"
echo ""
echo "🚀 To start development server: npm run dev"
echo "🔧 To start only backend: npm run server"
echo "🎨 To start only frontend: npm run client"
echo ""
