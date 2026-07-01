# ==========================================
# Multi-Stage Dockerfile for Fitness Flow
# Compiles Frontend and Backend into a single container
# ==========================================

# --- Stage 1: Build React Frontend ---
FROM node:22-alpine AS frontend-builder
WORKDIR /src/frontend

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy code and build
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Build .NET Backend ---
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-builder
WORKDIR /src

# Copy solution and project files for caching restore layer
COPY backend/FitnessFlow.sln ./
COPY backend/FitnessFlow.Api/FitnessFlow.Api.csproj ./backend/FitnessFlow.Api/
RUN dotnet restore backend/FitnessFlow.sln

# Copy the rest of the backend source files
COPY backend/ ./backend/

# Copy the React compiled build from Stage 1 into .NET's wwwroot folder
COPY --from=frontend-builder /src/frontend/dist ./backend/FitnessFlow.Api/wwwroot/

# Publish the Release build
RUN dotnet publish backend/FitnessFlow.Api/FitnessFlow.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

# --- Stage 3: Runtime ---
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Set port environment to 5091 (matching the default port)
ENV ASPNETCORE_URLS=http://+:5091
EXPOSE 5091

# Copy build artifacts from publisher stage
COPY --from=backend-builder /app/publish .

# Run the API which also serves the frontend
ENTRYPOINT ["dotnet", "FitnessFlow.Api.dll"]
