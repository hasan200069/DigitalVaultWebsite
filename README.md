# Digital Vault Website

A secure file storage and management system built with React, Express, and TypeScript.

## Project Structure

```
digital-vault-website/
├── frontend/          # React + Vite + TypeScript + Tailwind
├── backend/           # Node.js + Express + TypeScript
├── docker-compose.yml # Infrastructure services (Postgres + MinIO)
└── package.json       # Monorepo workspace configuration
```

## Prerequisites

- Node.js (v20.17.0 or higher)
- Docker and Docker Compose
- npm or yarn

## Quick Start

### 1. Install Dependencies

```bash
npm run install:all
```

### 2. Start Infrastructure Services

```bash
npm run docker:up
```

This will start:
- PostgreSQL database on port 5432
- MinIO object storage on ports 9000 (API) and 9001 (Console)

### 3. Development Mode

```bash
npm run dev
```

This will start both frontend and backend in development mode:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### 4. Individual Services

Start only the backend:
```bash
npm run dev:backend
```

Start only the frontend:
```bash
npm run dev:frontend
```

## Environment Configuration

### Backend Environment

Copy the example environment file and configure:

```bash
cd backend
cp env.example .env
```

Edit `.env` with your configuration:
- Database connection settings
- MinIO credentials
- JWT secrets

### Frontend Environment

The frontend is configured to connect to the backend API at `http://localhost:3001`.

## Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both frontend and backend for production
- `npm run start` - Start both services in production mode
- `npm run docker:up` - Start infrastructure services (Postgres + MinIO)
- `npm run docker:down` - Stop infrastructure services
- `npm run docker:logs` - View infrastructure service logs
- `npm run clean` - Clean all node_modules and build artifacts

## Infrastructure Services

### PostgreSQL Database
- **Host**: localhost
- **Port**: 5432
- **Database**: digital_vault
- **Username**: postgres
- **Password**: password

### MinIO Object Storage
- **API Endpoint**: http://localhost:9000
- **Console**: http://localhost:9001
- **Access Key**: minioadmin
- **Secret Key**: minioadmin

## Development

### Backend Development
- TypeScript configuration in `backend/tsconfig.json`
- Express server with middleware for CORS, security, and logging
- Database initialization script in `backend/init.sql`

### Frontend Development
- Vite for fast development and building
- TypeScript for type safety
- Tailwind CSS for styling
- React 18 with modern hooks

## Production Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the services:
   ```bash
   npm run start
   ```

3. Ensure infrastructure services are running:
   ```bash
   npm run docker:up
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
